/**
 * DirectiveOutcomeService
 * -----------------------
 * The "Measure" stage of the core loop. Records Directive_Outcome__c rows so the
 * business result of completed work is measurable (case closed, risk decreased,
 * approval completed, etc.). All DML runs in USER_MODE.
 *
 * Two entry points:
 *   - record(...)                - explicit, caller-specified outcome.
 *   - recordForCompletion(view)  - derive an outcome when a Work Item completes;
 *                                  invoked by DirectiveWorkService.updateStatus.
 */
public with sharing class DirectiveOutcomeService {
    /** Outcome_Type__c picklist values (mirror the field's value set). */
    public static final String CASE_CLOSED = 'Case_Closed';
    public static final String CUSTOMER_RESPONDED = 'Customer_Responded';
    public static final String RISK_DECREASED = 'Risk_Decreased';
    public static final String APPROVAL_COMPLETED = 'Approval_Completed';
    public static final String DUPLICATE_RESOLVED = 'Duplicate_Resolved';
    public static final String INEFFECTIVE = 'Ineffective';

    /** Record an explicit outcome for a Work Item. */
    public static Directive_Outcome__c record(Id workItemId, String outcomeType, String detail, Decimal businessValue) {
        if (workItemId == null) {
            throw new DirectiveException('workItemId is required.');
        }
        if (String.isBlank(outcomeType)) {
            throw new DirectiveException('outcomeType is required.');
        }
        Directive_Outcome__c outcome = new Directive_Outcome__c(
            Work_Item__c = workItemId,
            Outcome_Type__c = outcomeType,
            Detail__c = detail,
            Business_Value__c = businessValue,
            Measured_At__c = System.now()
        );
        Database.insert(outcome, AccessLevel.USER_MODE);
        return outcome;
    }

    /**
     * Derive and record an outcome for a Work Item that just transitioned to
     * Completed. If the backing Case is closed the outcome is Case_Closed;
     * otherwise the work itself reduced risk (Risk_Decreased). The item's
     * Business_Impact__c carries through as the measured business value.
     */
    public static Directive_Outcome__c recordForCompletion(Directive_Work_Item__c wi) {
        if (wi == null || wi.Id == null) {
            return null;
        }
        String outcomeType = RISK_DECREASED;
        if (wi.Source_Object__c == 'Case' && String.isNotBlank(wi.Source_Record_Id__c)) {
            for (Case c : [
                SELECT IsClosed
                FROM Case
                WHERE Id = :wi.Source_Record_Id__c
                WITH USER_MODE
                LIMIT 1
            ]) {
                if (c.IsClosed) {
                    outcomeType = CASE_CLOSED;
                }
            }
        }
        String detail = 'Work item completed: ' + (String.isBlank(wi.Title__c) ? String.valueOf(wi.Id) : wi.Title__c);
        return record(wi.Id, outcomeType, detail, wi.Business_Impact__c);
    }
}
