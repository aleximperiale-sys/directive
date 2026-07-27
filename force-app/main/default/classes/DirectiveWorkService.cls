/**
 * DirectiveWorkService
 * --------------------
 * The read/write facade the UI uses to load and update the running user's work.
 * All SOQL/DML runs in USER_MODE so object- and field-level security is enforced
 * for the calling user on top of the class's `with sharing` record visibility.
 */
public with sharing class DirectiveWorkService {

    /** Columns projected for a Work Item. Shared by every read path here. */
    @TestVisible
    private static final List<String> WORK_ITEM_FIELDS = new List<String>{
        'Id', 'Name', 'Title__c', 'Summary__c', 'Type__c', 'Category__c', 'Status__c',
        'Severity__c', 'Priority_Score__c', 'Assigned_User__c', 'Assigned_Queue_Id__c',
        'Source_Record_Id__c', 'Source_Object__c', 'Source_Record_Label__c', 'Rule_Key__c',
        'Dedupe_Key__c', 'Reason_Codes__c', 'Explanation__c', 'Confidence__c',
        'Business_Impact__c', 'Detected_At__c', 'Last_Evaluated_At__c', 'Due_At__c',
        'Snoozed_Until__c', 'Completed_At__c', 'Completed_By__c', 'Context_JSON__c',
        'Version__c', 'Expires_At__c', 'CreatedDate'
    };

    private static final Set<String> ALLOWED_STATUSES = new Set<String>{
        'New', 'In_Progress', 'Waiting', 'Snoozed', 'Completed', 'Dismissed'
    };

    /** Filter/paging parameters for getMyWork. */
    public class WorkQuery {
        @AuraEnabled public String category;
        @AuraEnabled public String severity;
        @AuraEnabled public String viewKey;
        @AuraEnabled public Integer queryLimit;
        @AuraEnabled public Integer queryOffset;
    }

    /** A Work Item decorated with its computed priority band for the UI. */
    public class WorkItemView {
        @AuraEnabled public Directive_Work_Item__c record;
        @AuraEnabled public String band;
        public WorkItemView(Directive_Work_Item__c record) {
            this.record = record;
            Integer score = record.Priority_Score__c == null ? 0 : record.Priority_Score__c.intValue();
            this.band = DirectivePriorityService.band(score);
        }
    }

    /**
     * Return the running user's work, filtered and ordered by priority descending.
     */
    public static List<WorkItemView> getMyWork(WorkQuery q) {
        WorkQuery query = q == null ? new WorkQuery() : q;

        Integer lim = (query.queryLimit == null || query.queryLimit <= 0)
            ? 50 : Math.min(query.queryLimit, 200);
        Integer off = (query.queryOffset == null || query.queryOffset < 0) ? 0 : query.queryOffset;

        Id uid = UserInfo.getUserId();
        String cat = query.category;
        String sev = query.severity;

        // NOTE: `where` is a reserved word in Apex - this list must not use it.
        List<String> filters = new List<String>{ 'Assigned_User__c = :uid' };
        if (String.isNotBlank(cat)) {
            filters.add('Category__c = :cat');
        }
        if (String.isNotBlank(sev)) {
            filters.add('Severity__c = :sev');
        }

        String soql =
            'SELECT ' + String.join(WORK_ITEM_FIELDS, ', ') +
            ' FROM Directive_Work_Item__c' +
            ' WHERE ' + String.join(filters, ' AND ') +
            ' WITH USER_MODE' +
            ' ORDER BY Priority_Score__c DESC NULLS LAST, CreatedDate DESC' +
            ' LIMIT :lim OFFSET :off';

        List<WorkItemView> views = new List<WorkItemView>();
        for (Directive_Work_Item__c wi : (List<Directive_Work_Item__c>) Database.query(soql)) {
            views.add(new WorkItemView(wi));
        }
        return views;
    }

    /** Load a single Work Item (FLS enforced). */
    public static WorkItemView getWorkItem(Id workItemId) {
        if (workItemId == null) {
            throw new DirectiveException('workItemId is required.');
        }
        String soql =
            'SELECT ' + String.join(WORK_ITEM_FIELDS, ', ') +
            ' FROM Directive_Work_Item__c WHERE Id = :workItemId WITH USER_MODE LIMIT 1';
        List<Directive_Work_Item__c> records = Database.query(soql);
        if (records.isEmpty()) {
            throw new DirectiveException('Work Item not found or not accessible: ' + workItemId);
        }
        return new WorkItemView(records[0]);
    }

    /** Transition a Work Item's status, stamping completion metadata as needed. */
    public static WorkItemView updateStatus(Id workItemId, String status) {
        if (workItemId == null) {
            throw new DirectiveException('workItemId is required.');
        }
        if (!ALLOWED_STATUSES.contains(status)) {
            throw new DirectiveException('Invalid status: ' + status);
        }
        Directive_Work_Item__c wi = new Directive_Work_Item__c(Id = workItemId);
        wi.Status__c = status;
        if (status == 'Completed') {
            wi.Completed_At__c = System.now();
            wi.Completed_By__c = UserInfo.getUserId();
        }
        Database.update(wi, AccessLevel.USER_MODE);

        WorkItemView view = getWorkItem(workItemId);
        // Measure: completing a work item records a business outcome.
        if (status == 'Completed') {
            DirectiveOutcomeService.recordForCompletion(view.record);
        }
        return view;
    }

    /** Snooze a Work Item until the given datetime. */
    public static WorkItemView snooze(Id workItemId, Datetime until) {
        if (workItemId == null) {
            throw new DirectiveException('workItemId is required.');
        }
        if (until == null || until <= System.now()) {
            throw new DirectiveException('Snooze target must be in the future.');
        }
        Directive_Work_Item__c wi = new Directive_Work_Item__c(Id = workItemId);
        wi.Status__c = 'Snoozed';
        wi.Snoozed_Until__c = until;
        Database.update(wi, AccessLevel.USER_MODE);
        return getWorkItem(workItemId);
    }
}
