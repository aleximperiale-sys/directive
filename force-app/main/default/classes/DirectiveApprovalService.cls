/**
 * DirectiveApprovalService
 * ------------------------
 * The approval facade behind Directive's Approvals surface. Actions whose
 * definition sets Approval_Required were audited with Approval_State = 'Pending'
 * and a Partial result; a permitted approver resolves them here.
 *
 *   getPending()            - list action runs awaiting approval.
 *   approve(actionRunId)    - approve a pending run (records an outcome).
 *   reject(actionRunId, ..) - reject a pending run with a reason.
 *
 * Approve/reject require the Directive_Approve_Recommendation custom permission.
 * All SOQL/DML runs in USER_MODE.
 */
public with sharing class DirectiveApprovalService {
    private static final String APPROVE_PERMISSION = 'Directive_Approve_Recommendation';

    /** A pending approval, projected for the UI. */
    public class PendingApproval {
        @AuraEnabled
        public Id actionRunId;
        @AuraEnabled
        public Id workItemId;
        @AuraEnabled
        public String actionKey;
        @AuraEnabled
        public Id requestedById;
        @AuraEnabled
        public Datetime startedAt;
        @AuraEnabled
        public String approvalState;
    }

    /** Action runs awaiting an approval decision, newest first. */
    public static List<PendingApproval> getPending() {
        List<PendingApproval> out = new List<PendingApproval>();
        for (Directive_Action_Run__c r : [
            SELECT Id, Work_Item__c, Action_Key__c, Requested_By__c, Started_At__c, Approval_State__c
            FROM Directive_Action_Run__c
            WHERE Approval_State__c = 'Pending'
            WITH USER_MODE
            ORDER BY Started_At__c DESC
            LIMIT 200
        ]) {
            PendingApproval p = new PendingApproval();
            p.actionRunId = r.Id;
            p.workItemId = r.Work_Item__c;
            p.actionKey = r.Action_Key__c;
            p.requestedById = r.Requested_By__c;
            p.startedAt = r.Started_At__c;
            p.approvalState = r.Approval_State__c;
            out.add(p);
        }
        return out;
    }

    /** Approve a pending action run and record an Approval_Completed outcome. */
    public static Directive_Action_Run__c approve(Id actionRunId) {
        requireApprovalPermission();
        Directive_Action_Run__c run = loadPendingRun(actionRunId);
        run.Approval_State__c = 'Approved';
        run.Result__c = 'Success';
        run.Completed_At__c = System.now();
        Database.update(run, AccessLevel.USER_MODE);

        if (run.Work_Item__c != null) {
            DirectiveOutcomeService.record(
                run.Work_Item__c,
                DirectiveOutcomeService.APPROVAL_COMPLETED,
                'Approved action run ' + run.Id + ' (' + run.Action_Key__c + ').',
                null
            );
        }
        DirectiveTelemetryService.emitActionRun(run.Correlation_Id__c, run.Work_Item__c, run.Id, 'Success', null, null);
        return run;
    }

    /** Reject a pending action run, capturing the reason on the audit row. */
    public static Directive_Action_Run__c reject(Id actionRunId, String reason) {
        requireApprovalPermission();
        Directive_Action_Run__c run = loadPendingRun(actionRunId);
        run.Approval_State__c = 'Rejected';
        run.Result__c = 'Failure';
        run.Error__c = String.isBlank(reason) ? 'Rejected by approver.' : reason;
        run.Completed_At__c = System.now();
        Database.update(run, AccessLevel.USER_MODE);

        DirectiveTelemetryService.emitActionRun(
            run.Correlation_Id__c,
            run.Work_Item__c,
            run.Id,
            'Failure',
            'REJECTED',
            null
        );
        return run;
    }

    // -------------------------------------------------------------- helpers

    private static Directive_Action_Run__c loadPendingRun(Id actionRunId) {
        if (actionRunId == null) {
            throw new DirectiveException('actionRunId is required.');
        }
        List<Directive_Action_Run__c> runs = [
            SELECT Id, Work_Item__c, Action_Key__c, Correlation_Id__c, Approval_State__c
            FROM Directive_Action_Run__c
            WHERE Id = :actionRunId
            WITH USER_MODE
            LIMIT 1
        ];
        if (runs.isEmpty()) {
            throw new DirectiveException('Action run not found or not accessible: ' + actionRunId);
        }
        if (runs[0].Approval_State__c != 'Pending') {
            throw new DirectiveException(
                'Only a Pending action run can be decided (current state: ' + runs[0].Approval_State__c + ').'
            );
        }
        return runs[0];
    }

    private static void requireApprovalPermission() {
        if (!FeatureManagement.checkPermission(APPROVE_PERMISSION)) {
            throw new DirectiveException(
                'You do not have permission to decide approvals (requires ' + APPROVE_PERMISSION + ').'
            );
        }
    }
}
