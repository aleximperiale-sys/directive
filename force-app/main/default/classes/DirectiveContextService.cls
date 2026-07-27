/**
 * DirectiveContextService
 * -----------------------
 * Assembles the full decision context for a Work Item into a single JSON string
 * that the UI (and Agentforce) can consume. It queries only the fields needed
 * for each section: user, persona, work item, source record, related records,
 * signals, prior actions and available actions.
 */
public with sharing class DirectiveContextService {

    /**
     * Build the context payload for a user + work item.
     * @return a JSON object string with keys:
     *   generatedAt, user, persona, workItem, sourceRecord,
     *   relatedRecords, signals, priorActions, availableActions
     */
    public static String buildContext(Id userId, Id workItemId) {
        if (workItemId == null) {
            throw new DirectiveException('workItemId is required.');
        }
        Id resolvedUserId = userId == null ? UserInfo.getUserId() : userId;

        Map<String, Object> ctx = new Map<String, Object>();
        ctx.put('generatedAt', System.now());

        // --- user ---
        Map<String, Object> userMap = new Map<String, Object>();
        for (User u : [
            SELECT Id, Name, Email, UserRoleId, ProfileId FROM User
            WHERE Id = :resolvedUserId WITH USER_MODE LIMIT 1
        ]) {
            userMap.put('id', u.Id);
            userMap.put('name', u.Name);
            userMap.put('email', u.Email);
        }
        ctx.put('user', userMap);

        // --- work item ---
        DirectiveWorkService.WorkItemView view = DirectiveWorkService.getWorkItem(workItemId);
        Directive_Work_Item__c wi = view.record;
        Map<String, Object> wiMap = new Map<String, Object>{
            'id' => wi.Id,
            'name' => wi.Name,
            'title' => wi.Title__c,
            'type' => wi.Type__c,
            'category' => wi.Category__c,
            'status' => wi.Status__c,
            'severity' => wi.Severity__c,
            'priorityScore' => wi.Priority_Score__c,
            'band' => view.band,
            'reasonCodes' => wi.Reason_Codes__c,
            'explanation' => wi.Explanation__c,
            'confidence' => wi.Confidence__c,
            'businessImpact' => wi.Business_Impact__c,
            'dueAt' => wi.Due_At__c,
            'detectedAt' => wi.Detected_At__c,
            'sourceObject' => wi.Source_Object__c,
            'sourceRecordId' => wi.Source_Record_Id__c
        };
        ctx.put('workItem', wiMap);

        // --- persona (Service Operations MVP) ---
        Directive_Persona__mdt persona = DirectiveConfigurationService.getPersona('Service_Operations');
        if (persona != null) {
            ctx.put('persona', new Map<String, Object>{
                'developerName' => persona.DeveloperName,
                'label' => persona.MasterLabel,
                'categories' => persona.Categories__c,
                'defaultView' => persona.Default_View__c,
                'allowedActions' => persona.Allowed_Actions__c
            });
        }

        // --- source record (Case only for the MVP) ---
        if (wi.Source_Object__c == 'Case' && String.isNotBlank(wi.Source_Record_Id__c)) {
            ctx.put('sourceRecord', buildCaseSnapshot((Id) wi.Source_Record_Id__c));
        }

        // --- signals ---
        List<Map<String, Object>> signals = new List<Map<String, Object>>();
        for (Directive_Signal__c s : [
            SELECT Id, Signal_Type__c, Occurred_At__c, Raw_Value__c, Normalized_Value__c,
                   Confidence__c, Processing_Status__c
            FROM Directive_Signal__c WHERE Work_Item__c = :workItemId
            WITH USER_MODE ORDER BY Occurred_At__c DESC LIMIT 50
        ]) {
            signals.add(new Map<String, Object>{
                'id' => s.Id,
                'type' => s.Signal_Type__c,
                'occurredAt' => s.Occurred_At__c,
                'rawValue' => s.Raw_Value__c,
                'normalizedValue' => s.Normalized_Value__c,
                'confidence' => s.Confidence__c,
                'status' => s.Processing_Status__c
            });
        }
        ctx.put('signals', signals);

        // --- prior actions ---
        List<Map<String, Object>> priorActions = new List<Map<String, Object>>();
        for (Directive_Action_Run__c r : [
            SELECT Id, Action_Key__c, Result__c, Approval_State__c, Started_At__c, Completed_At__c
            FROM Directive_Action_Run__c WHERE Work_Item__c = :workItemId
            WITH USER_MODE ORDER BY Started_At__c DESC LIMIT 50
        ]) {
            priorActions.add(new Map<String, Object>{
                'id' => r.Id,
                'actionKey' => r.Action_Key__c,
                'result' => r.Result__c,
                'approvalState' => r.Approval_State__c,
                'startedAt' => r.Started_At__c,
                'completedAt' => r.Completed_At__c
            });
        }
        ctx.put('priorActions', priorActions);

        // --- related records placeholder (extended per source type in later phases) ---
        ctx.put('relatedRecords', new List<Object>());

        // --- available actions ---
        ctx.put('availableActions', DirectiveActionService.getAvailableActions(workItemId));

        return JSON.serialize(ctx, true);
    }

    private static Map<String, Object> buildCaseSnapshot(Id caseId) {
        for (Case c : [
            SELECT Id, CaseNumber, Subject, Status, Priority, IsClosed, CreatedDate, OwnerId
            FROM Case WHERE Id = :caseId WITH USER_MODE LIMIT 1
        ]) {
            return new Map<String, Object>{
                'id' => c.Id,
                'caseNumber' => c.CaseNumber,
                'subject' => c.Subject,
                'status' => c.Status,
                'priority' => c.Priority,
                'isClosed' => c.IsClosed,
                'createdDate' => c.CreatedDate,
                'ownerId' => c.OwnerId
            };
        }
        return new Map<String, Object>();
    }
}
