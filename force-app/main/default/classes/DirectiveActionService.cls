/**
 * DirectiveActionService
 * ----------------------
 * Resolves which actions a user may take on a Work Item and executes them with a
 * full audit trail. Every execution:
 *   (a) resolves the action definition from Custom Metadata,
 *   (b) short-circuits on idempotency (returns the prior run for a repeated key),
 *   (c) enforces the action's required custom permission,
 *   (d) writes a Directive_Action_Run__c audit row,
 *   (e) dispatches the implementation (Apex or Flow), and
 *   (f) emits a fire-and-forget telemetry event.
 *
 * All ten MVP actions are implemented:
 *   SNOOZE_ITEM, DISMISS_FALSE_POSITIVE, CREATE_FOLLOWUP_TASK (work-item ops),
 *   ESCALATE_CASE (Flow), REASSIGN_CASE / NOTIFY_MANAGER (Case ops),
 *   DRAFT_CUSTOMER_RESPONSE / GENERATE_CASE_SUMMARY / CREATE_KNOWLEDGE_DRAFT
 *   (deterministic content recommendations), and APPROVE_RECOMMENDATION.
 * An approval-required action without a concrete implementation still records
 * the audit row and returns a "queued for approval" Partial result.
 */
public with sharing class DirectiveActionService {
    /** An action the running user is permitted to take, for the UI. */
    public class ActionOption {
        @AuraEnabled
        public String actionKey;
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String implementationType;
        @AuraEnabled
        public Boolean confirmationRequired;
        @AuraEnabled
        public Boolean approvalRequired;
        public ActionOption(Directive_Action_Definition__mdt d) {
            this.actionKey = d.Action_Key__c;
            this.label = d.Label__c;
            this.implementationType = d.Implementation_Type__c;
            this.confirmationRequired = d.Confirmation_Required__c == true;
            this.approvalRequired = d.Approval_Required__c == true;
        }
    }

    /** Request to execute an action. */
    public class ExecuteActionInput {
        @AuraEnabled
        public Id workItemId;
        @AuraEnabled
        public String actionKey;
        @AuraEnabled
        public String idempotencyKey;
        @AuraEnabled
        public String inputPayload;
        @AuraEnabled
        public String requestedSource; // User | Agentforce | System
    }

    /** Outcome of an execution attempt. */
    public class ActionResult {
        @AuraEnabled
        public Boolean success;
        @AuraEnabled
        public String result; // Success | Failure | Partial
        @AuraEnabled
        public String message;
        @AuraEnabled
        public Id actionRunId;
        @AuraEnabled
        public Boolean idempotentHit;
        public ActionResult() {
            this.success = false;
            this.idempotentHit = false;
        }
    }

    /**
     * Actions available on a Work Item for the running user, filtered by the
     * action's supported object and required custom permission.
     */
    public static List<ActionOption> getAvailableActions(Id workItemId) {
        if (workItemId == null) {
            throw new DirectiveException('workItemId is required.');
        }
        List<Directive_Work_Item__c> items = [
            SELECT Id, Source_Object__c
            FROM Directive_Work_Item__c
            WHERE Id = :workItemId
            WITH USER_MODE
            LIMIT 1
        ];
        if (items.isEmpty()) {
            throw new DirectiveException('Work Item not found or not accessible: ' + workItemId);
        }
        String sourceObject = String.isBlank(items[0].Source_Object__c) ? 'Case' : items[0].Source_Object__c;

        List<ActionOption> options = new List<ActionOption>();
        for (Directive_Action_Definition__mdt d : DirectiveConfigurationService.getActionDefinitions().values()) {
            if (!isSupported(d, sourceObject)) {
                continue;
            }
            if (!hasPermission(d)) {
                continue;
            }
            options.add(new ActionOption(d));
        }
        return options;
    }

    /** Execute an action against a Work Item with audit + idempotency + FLS. */
    public static ActionResult execute(ExecuteActionInput input) {
        if (input == null || input.workItemId == null || String.isBlank(input.actionKey)) {
            throw new DirectiveException('workItemId and actionKey are required.');
        }

        // (a) resolve the action definition
        Directive_Action_Definition__mdt def = DirectiveConfigurationService.getActionDefinitions()
            .get(input.actionKey);
        if (def == null) {
            throw new DirectiveException('Unknown action: ' + input.actionKey);
        }

        ActionResult res = new ActionResult();

        // (b) idempotency short-circuit
        if (String.isNotBlank(input.idempotencyKey)) {
            List<Directive_Action_Run__c> prior = [
                SELECT Id, Result__c, Error__c
                FROM Directive_Action_Run__c
                WHERE Idempotency_Key__c = :input.idempotencyKey
                WITH USER_MODE
                LIMIT 1
            ];
            if (!prior.isEmpty()) {
                res.actionRunId = prior[0].Id;
                res.idempotentHit = true;
                res.result = prior[0].Result__c;
                res.success = prior[0].Result__c == 'Success';
                res.message = 'Returned prior run for idempotency key ' + input.idempotencyKey;
                return res;
            }
        }

        // (c) required custom permission
        if (!hasPermission(def)) {
            throw new DirectiveException(
                'You do not have permission to run ' +
                    def.Action_Key__c +
                    ' (requires ' +
                    def.Required_Custom_Permission__c +
                    ').'
            );
        }

        // (d) audit row
        Datetime startedAt = System.now();
        Directive_Action_Run__c run = new Directive_Action_Run__c(
            Work_Item__c = input.workItemId,
            Action_Key__c = input.actionKey,
            Requested_By__c = UserInfo.getUserId(),
            Requested_Source__c = String.isBlank(input.requestedSource) ? 'User' : input.requestedSource,
            Input_Payload__c = input.inputPayload,
            Idempotency_Key__c = input.idempotencyKey,
            Correlation_Id__c = generateCorrelationId(),
            Started_At__c = startedAt,
            Approval_State__c = def.Approval_Required__c == true ? 'Pending' : 'Not_Required',
            Rollback_State__c = 'None'
        );

        // (e) dispatch
        String outcome;
        String message;
        String error;
        try {
            switch on input.actionKey {
                when 'SNOOZE_ITEM' {
                    dispatchSnooze(input);
                    outcome = 'Success';
                    message = 'Work item snoozed.';
                }
                when 'DISMISS_FALSE_POSITIVE' {
                    dispatchDismiss(input);
                    outcome = 'Success';
                    message = 'Work item dismissed as a false positive.';
                }
                when 'CREATE_FOLLOWUP_TASK' {
                    dispatchFollowupTask(input);
                    outcome = 'Success';
                    message = 'Follow-up task created.';
                }
                when 'ESCALATE_CASE' {
                    message = dispatchFlow(def, input);
                    outcome = 'Success';
                }
                when 'REASSIGN_CASE' {
                    message = dispatchReassign(input);
                    outcome = 'Success';
                }
                when 'NOTIFY_MANAGER' {
                    message = dispatchNotifyManager(input);
                    outcome = 'Success';
                }
                when 'DRAFT_CUSTOMER_RESPONSE' {
                    message = dispatchDraftResponse(input);
                    outcome = 'Success';
                }
                when 'GENERATE_CASE_SUMMARY' {
                    message = dispatchGenerateSummary(input);
                    outcome = 'Success';
                }
                when 'CREATE_KNOWLEDGE_DRAFT' {
                    message = dispatchKnowledgeDraft(input);
                    outcome = 'Success';
                }
                when 'APPROVE_RECOMMENDATION' {
                    message = dispatchApprove(input, run);
                    outcome = 'Success';
                }
                when else {
                    if (def.Approval_Required__c == true) {
                        // Approval-gated action with no concrete implementation:
                        // record and hand off to a later approval phase.
                        outcome = 'Partial';
                        message = 'Action queued for approval.';
                    } else if (def.Implementation_Type__c == 'Flow') {
                        message = dispatchFlow(def, input);
                        outcome = 'Success';
                    } else {
                        outcome = 'Partial';
                        message =
                            'Action recorded and queued for ' +
                            def.Implementation_Type__c +
                            ' implementation "' +
                            def.Implementation_Name__c +
                            '".';
                    }
                }
            }
        } catch (Exception e) {
            outcome = 'Failure';
            error = e.getMessage();
            message = 'Action failed: ' + e.getMessage();
        }

        run.Result__c = outcome;
        run.Error__c = error;
        run.Completed_At__c = System.now();
        Database.insert(run, AccessLevel.USER_MODE);

        // (f) fire-and-forget telemetry (never breaks the primary operation)
        Integer durationMs = (Integer) (System.now().getTime() - startedAt.getTime());
        DirectiveTelemetryService.emitActionRun(
            run.Correlation_Id__c,
            input.workItemId,
            run.Id,
            outcome,
            error,
            durationMs
        );

        res.actionRunId = run.Id;
        res.result = outcome;
        res.success = outcome == 'Success';
        res.message = message;
        return res;
    }

    // -------------------------------------------------------------- dispatch

    private static void dispatchSnooze(ExecuteActionInput input) {
        Integer hours = 24;
        Map<String, Object> payload = parsePayload(input.inputPayload);
        if (payload.get('hours') != null) {
            hours = Integer.valueOf(payload.get('hours'));
        }
        DirectiveWorkService.snooze(input.workItemId, System.now().addHours(hours));
    }

    private static void dispatchDismiss(ExecuteActionInput input) {
        DirectiveWorkService.updateStatus(input.workItemId, 'Dismissed');
    }

    private static void dispatchFollowupTask(ExecuteActionInput input) {
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        Task t = new Task(
            Subject = 'Directive follow-up: ' + (String.isBlank(wi.Title__c) ? 'Work Item' : wi.Title__c),
            Status = 'Not Started',
            Priority = 'Normal',
            ActivityDate = Date.today().addDays(1),
            OwnerId = UserInfo.getUserId()
        );
        // Relate to the source Case when we have one.
        if (String.isNotBlank(wi.Source_Record_Id__c) && wi.Source_Object__c == 'Case') {
            t.WhatId = (Id) wi.Source_Record_Id__c;
        }
        Database.insert(t, AccessLevel.USER_MODE);
    }

    /**
     * Invoke the Flow named on the action definition, passing the work item's
     * source record as `recordId`. Reads the flow's `escalationMessage` output
     * variable for a human-readable result. Generic across Flow-type actions.
     */
    private static String dispatchFlow(Directive_Action_Definition__mdt def, ExecuteActionInput input) {
        if (String.isBlank(def.Implementation_Name__c)) {
            throw new DirectiveException('Action ' + def.Action_Key__c + ' has no Flow implementation configured.');
        }
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        if (String.isBlank(wi.Source_Record_Id__c)) {
            throw new DirectiveException('Work item has no source record to run the flow against.');
        }
        Map<String, Object> flowInputs = new Map<String, Object>{ 'recordId' => wi.Source_Record_Id__c };
        Flow.Interview interview = Flow.Interview.createInterview(def.Implementation_Name__c, flowInputs);
        interview.start();
        Object msg = interview.getVariableValue('escalationMessage');
        return msg == null ? 'Flow "' + def.Implementation_Name__c + '" completed.' : String.valueOf(msg);
    }

    /**
     * Reassign the source Case to a User or Queue supplied as `assigneeId` in the
     * payload. When the new owner is a User, mirror the assignment onto the Work
     * Item so Directive routing stays in sync.
     */
    private static String dispatchReassign(ExecuteActionInput input) {
        Map<String, Object> payload = parsePayload(input.inputPayload);
        Object assigneeRaw = payload.get('assigneeId');
        if (assigneeRaw == null || String.isBlank(String.valueOf(assigneeRaw))) {
            throw new DirectiveException('REASSIGN_CASE requires an "assigneeId" in the payload.');
        }
        Id assigneeId;
        try {
            assigneeId = (Id) String.valueOf(assigneeRaw);
        } catch (Exception e) {
            throw new DirectiveException('Invalid assigneeId: ' + assigneeRaw);
        }
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        if (String.isBlank(wi.Source_Record_Id__c) || wi.Source_Object__c != 'Case') {
            throw new DirectiveException('REASSIGN_CASE can only run on a Case-backed work item.');
        }
        Case c = new Case(Id = (Id) wi.Source_Record_Id__c, OwnerId = assigneeId);
        Database.update(c, AccessLevel.USER_MODE);

        // A User Id (key prefix 005) also owns the Directive work item.
        if (String.valueOf(assigneeId).startsWith('005')) {
            Directive_Work_Item__c wiu = new Directive_Work_Item__c(Id = wi.Id, Assigned_User__c = assigneeId);
            Database.update(wiu, AccessLevel.USER_MODE);
        }
        return 'Case reassigned to ' + assigneeId + '.';
    }

    /**
     * Notify the running user's manager (or a `managerId` override in the payload)
     * by creating a high-priority Task owned by that manager, related to the Case.
     */
    private static String dispatchNotifyManager(ExecuteActionInput input) {
        Map<String, Object> payload = parsePayload(input.inputPayload);
        Id managerId;
        Object managerOverride = payload.get('managerId');
        if (managerOverride != null && String.isNotBlank(String.valueOf(managerOverride))) {
            managerId = (Id) String.valueOf(managerOverride);
        } else {
            List<User> users = [
                SELECT Id, ManagerId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                WITH USER_MODE
                LIMIT 1
            ];
            if (!users.isEmpty()) {
                managerId = users[0].ManagerId;
            }
        }
        if (managerId == null) {
            throw new DirectiveException('No manager is configured for you; provide a "managerId" to notify.');
        }
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        Task t = new Task(
            Subject = 'Directive: attention requested - ' + (String.isBlank(wi.Title__c) ? 'Work Item' : wi.Title__c),
            Description = 'A Directive work item was escalated for your attention.\n\n' +
                'Work Item: ' +
                wi.Title__c +
                '\n' +
                'Severity: ' +
                wi.Severity__c +
                '\n' +
                'Category: ' +
                wi.Category__c,
            Status = 'Not Started',
            Priority = 'High',
            ActivityDate = Date.today().addDays(1),
            OwnerId = managerId
        );
        if (String.isNotBlank(wi.Source_Record_Id__c) && wi.Source_Object__c == 'Case') {
            t.WhatId = (Id) wi.Source_Record_Id__c;
        }
        Database.insert(t, AccessLevel.USER_MODE);
        return 'Manager notified via task (' + managerId + ').';
    }

    /**
     * Deterministic customer-response draft, stored as an Action recommendation on
     * the work item. A later phase can replace the templated body with Agentforce.
     */
    private static String dispatchDraftResponse(ExecuteActionInput input) {
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        String subject = caseSubject(wi);
        String draft =
            'Hello,\n\n' +
            'Thank you for your patience regarding "' +
            subject +
            '". ' +
            'We are actively working on your case and wanted to share an update. ' +
            'Our team is prioritizing a resolution and will follow up with next steps shortly.\n\n' +
            'If there are any additional details you can share, simply reply to this message ' +
            'and it will reach us right away.\n\n' +
            'Best regards,\nYour Support Team';
        Directive_Recommendation__c rec = newRecommendation(
            wi.Id,
            'Action',
            'DRAFT_CUSTOMER_RESPONSE',
            'Suggested customer response drafted from case context.',
            draft
        );
        Database.insert(rec, AccessLevel.USER_MODE);
        return 'Customer response drafted (recommendation ' + rec.Id + ').';
    }

    /**
     * Deterministic case summary. Idempotent: a repeat run refreshes the single
     * existing GENERATE_CASE_SUMMARY recommendation for the work item.
     */
    private static String dispatchGenerateSummary(ExecuteActionInput input) {
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        String summary = buildSummaryText(wi);
        List<Directive_Recommendation__c> existing = [
            SELECT Id
            FROM Directive_Recommendation__c
            WHERE Work_Item__c = :wi.Id AND Recommended_Action_Key__c = 'GENERATE_CASE_SUMMARY'
            WITH USER_MODE
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];
        if (!existing.isEmpty()) {
            Directive_Recommendation__c upd = new Directive_Recommendation__c(
                Id = existing[0].Id,
                Explanation__c = 'Deterministic case summary (refreshed).',
                Context_Snapshot__c = summary
            );
            Database.update(upd, AccessLevel.USER_MODE);
            return 'Case summary refreshed (recommendation ' + upd.Id + ').';
        }
        Directive_Recommendation__c rec = newRecommendation(
            wi.Id,
            'Summary',
            'GENERATE_CASE_SUMMARY',
            'Deterministic case summary generated from work item and case facts.',
            summary
        );
        Database.insert(rec, AccessLevel.USER_MODE);
        return 'Case summary generated (recommendation ' + rec.Id + ').';
    }

    /**
     * Deterministic knowledge-article draft, stored as a Summary recommendation
     * pending human review before publication.
     */
    private static String dispatchKnowledgeDraft(ExecuteActionInput input) {
        Directive_Work_Item__c wi = loadItem(input.workItemId);
        String subject = caseSubject(wi);
        String article =
            'Title: How to resolve - ' +
            subject +
            '\n\n' +
            'Symptom:\n' +
            subject +
            '\n\n' +
            'Resolution (draft):\n' +
            '1. Confirm the reported symptom with the customer.\n' +
            '2. Apply the standard remediation steps for this category (' +
            wi.Category__c +
            ').\n' +
            '3. Verify the fix and document the outcome on the case.\n\n' +
            'Status: DRAFT - pending review before publication.';
        Directive_Recommendation__c rec = newRecommendation(
            wi.Id,
            'Summary',
            'CREATE_KNOWLEDGE_DRAFT',
            'Knowledge article draft generated from the work item; requires review before publishing.',
            article
        );
        Database.insert(rec, AccessLevel.USER_MODE);
        return 'Knowledge draft created (recommendation ' + rec.Id + '). Pending review.';
    }

    /**
     * Approve a recommendation (by `recommendationId` in the payload, else the most
     * recent open recommendation on the work item). Marks it accepted and flips the
     * audit run's approval state to Approved.
     */
    private static String dispatchApprove(ExecuteActionInput input, Directive_Action_Run__c run) {
        Map<String, Object> payload = parsePayload(input.inputPayload);
        Directive_Recommendation__c rec;
        Object recRaw = payload.get('recommendationId');
        if (recRaw != null && String.isNotBlank(String.valueOf(recRaw))) {
            List<Directive_Recommendation__c> recs = [
                SELECT Id
                FROM Directive_Recommendation__c
                WHERE Id = :(Id) String.valueOf(recRaw)
                WITH USER_MODE
                LIMIT 1
            ];
            if (!recs.isEmpty()) {
                rec = recs[0];
            }
        } else {
            List<Directive_Recommendation__c> recs = [
                SELECT Id
                FROM Directive_Recommendation__c
                WHERE Work_Item__c = :input.workItemId AND Accepted__c = FALSE AND Dismissed__c = FALSE
                WITH USER_MODE
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];
            if (!recs.isEmpty()) {
                rec = recs[0];
            }
        }
        if (rec == null) {
            throw new DirectiveException('No recommendation found to approve for this work item.');
        }
        Database.update(
            new Directive_Recommendation__c(
                Id = rec.Id,
                Accepted__c = true,
                Dismissed__c = false,
                Outcome__c = 'Approved'
            ),
            AccessLevel.USER_MODE
        );
        run.Approval_State__c = 'Approved';
        return 'Recommendation ' + rec.Id + ' approved.';
    }

    // -------------------------------------------------------------- helpers

    /** Load the fields dispatchers need from a Work Item (FLS enforced). */
    private static Directive_Work_Item__c loadItem(Id workItemId) {
        List<Directive_Work_Item__c> items = [
            SELECT
                Id,
                Title__c,
                Summary__c,
                Category__c,
                Severity__c,
                Reason_Codes__c,
                Source_Record_Id__c,
                Source_Object__c,
                Source_Record_Label__c
            FROM Directive_Work_Item__c
            WHERE Id = :workItemId
            WITH USER_MODE
            LIMIT 1
        ];
        if (items.isEmpty()) {
            throw new DirectiveException('Work Item not found or not accessible: ' + workItemId);
        }
        return items[0];
    }

    private static Directive_Recommendation__c newRecommendation(
        Id workItemId,
        String recType,
        String actionKey,
        String explanation,
        String snapshot
    ) {
        return new Directive_Recommendation__c(
            Work_Item__c = workItemId,
            Recommendation_Type__c = recType,
            Recommended_Action_Key__c = actionKey,
            Explanation__c = explanation,
            Context_Snapshot__c = snapshot,
            Confidence__c = 60,
            Model_Version__c = 'directive-deterministic-v1',
            Accepted__c = false,
            Dismissed__c = false
        );
    }

    /** Resolve a display subject for a work item's Case, falling back to its title. */
    private static String caseSubject(Directive_Work_Item__c wi) {
        if (wi.Source_Object__c == 'Case' && String.isNotBlank(wi.Source_Record_Id__c)) {
            for (Case c : [
                SELECT Subject, CaseNumber
                FROM Case
                WHERE Id = :wi.Source_Record_Id__c
                WITH USER_MODE
                LIMIT 1
            ]) {
                return String.isBlank(c.Subject) ? c.CaseNumber : c.Subject;
            }
        }
        return String.isBlank(wi.Title__c) ? 'this case' : wi.Title__c;
    }

    /** Build a deterministic, human-readable case summary from work item + case facts. */
    private static String buildSummaryText(Directive_Work_Item__c wi) {
        String s =
            'Work Item: ' +
            wi.Title__c +
            '\n' +
            'Category: ' +
            wi.Category__c +
            ' | Severity: ' +
            wi.Severity__c +
            '\n' +
            'Reason codes: ' +
            (String.isBlank(wi.Reason_Codes__c) ? ' - ' : wi.Reason_Codes__c) +
            '\n';
        if (wi.Source_Object__c == 'Case' && String.isNotBlank(wi.Source_Record_Id__c)) {
            for (Case c : [
                SELECT CaseNumber, Subject, Status, Priority, IsClosed, CreatedDate
                FROM Case
                WHERE Id = :wi.Source_Record_Id__c
                WITH USER_MODE
                LIMIT 1
            ]) {
                Integer ageDays = c.CreatedDate == null ? 0 : c.CreatedDate.date().daysBetween(Date.today());
                s +=
                    'Case ' +
                    c.CaseNumber +
                    ': ' +
                    c.Subject +
                    '\n' +
                    'Status: ' +
                    c.Status +
                    ' | Priority: ' +
                    c.Priority +
                    ' | Age: ' +
                    ageDays +
                    ' day(s)' +
                    (c.IsClosed ? ' | CLOSED' : '') +
                    '\n';
            }
        }
        return s;
    }

    private static Boolean isSupported(Directive_Action_Definition__mdt d, String sourceObject) {
        if (String.isBlank(d.Supported_Object__c)) {
            return true;
        }
        // An action is applicable if it targets the item's source object, or the
        // Work Item itself, or a Directive object the item can produce.
        return d.Supported_Object__c == sourceObject ||
            d.Supported_Object__c == 'Directive_Work_Item__c' ||
            d.Supported_Object__c == 'Directive_Recommendation__c';
    }

    private static Boolean hasPermission(Directive_Action_Definition__mdt d) {
        if (String.isBlank(d.Required_Custom_Permission__c)) {
            return true;
        }
        return FeatureManagement.checkPermission(d.Required_Custom_Permission__c);
    }

    private static Map<String, Object> parsePayload(String payload) {
        if (String.isBlank(payload)) {
            return new Map<String, Object>();
        }
        try {
            return (Map<String, Object>) JSON.deserializeUntyped(payload);
        } catch (Exception e) {
            return new Map<String, Object>();
        }
    }

    private static String generateCorrelationId() {
        Blob b = Crypto.generateAesKey(128);
        return EncodingUtil.convertToHex(b).substring(0, 32);
    }
}
