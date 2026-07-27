/**
 * DirectiveCaseTriggerHandler
 * ---------------------------
 * Keeps DirectiveCaseTrigger thin. Evaluates the transaction-type Case rules and
 * emits deduplicated Directive_Signal__c records; the Signal after-insert trigger
 * turns those into scored, explainable Work Items.
 *
 * Detection is intentionally conservative and bulk-safe:
 *   - insert: a High-priority open Case is an immediate concern.
 *   - update: only fire when the Case NEWLY becomes a concern (raised to High,
 *     escalated, or reopened) so routine edits don't churn signals.
 *
 * Signals are upserted by Dedupe_Key__c so repeated fires collapse onto one Work
 * Item (the core dedupe guarantee), matching DirectiveSignalService.
 */
public with sharing class DirectiveCaseTriggerHandler {
    /** Re-entrancy / test guard. */
    @TestVisible
    public static Boolean bypass = false;

    public static void handleAfterInsert(List<Case> cases) {
        detect(cases, null);
    }

    public static void handleAfterUpdate(List<Case> cases, Map<Id, Case> oldMap) {
        detect(cases, oldMap);
    }

    private static void detect(List<Case> cases, Map<Id, Case> oldMap) {
        if (bypass || cases == null || cases.isEmpty()) {
            return;
        }
        List<Directive_Signal__c> signals = new List<Directive_Signal__c>();
        for (Case c : cases) {
            if (c.IsClosed || c.Priority != 'High') {
                continue;
            }
            // On update, require a NEW concern rather than any edit to a High case.
            if (oldMap != null) {
                Case prior = oldMap.get(c.Id);
                Boolean becameHigh = prior != null && prior.Priority != 'High';
                Boolean becameEscalated = prior != null && prior.IsEscalated != true && c.IsEscalated == true;
                Boolean reopened = prior != null && prior.IsClosed == true && !c.IsClosed;
                if (!(becameHigh || becameEscalated || reopened)) {
                    continue;
                }
            }
            signals.add(
                new Directive_Signal__c(
                    Signal_Type__c = 'No_Activity',
                    Source_Record_Id__c = c.Id,
                    Source_Object__c = 'Case',
                    Occurred_At__c = System.now(),
                    Rule_Key__c = 'NO_OWNER_ACTION',
                    Confidence__c = 85,
                    Raw_Value__c = c.Subject,
                    Processing_Status__c = 'Pending',
                    Dedupe_Key__c = 'Case:' + c.Id + ':NO_OWNER_ACTION'
                )
            );
        }
        if (signals.isEmpty()) {
            return;
        }
        // Upsert by dedupe key; the Signal after-insert trigger builds Work Items
        // for any newly-inserted signals.
        //
        // Deliberately NOT USER_MODE: detection is a platform-side concern that
        // must succeed regardless of whether the person editing the Case holds
        // Directive object permissions. Enforcing user CRUD here would let a
        // support agent's lack of Directive access break ordinary Case saves.
        // `with sharing` still constrains record visibility. Mirrors
        // DirectiveSignalService.evaluateScheduled().
        Database.upsert(signals, Directive_Signal__c.Dedupe_Key__c, false);
    }
}
