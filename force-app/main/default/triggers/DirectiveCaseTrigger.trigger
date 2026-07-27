/**
 * DirectiveCaseTrigger
 * --------------------
 * Real-time (transaction) signal detection. When a Case is created or changes in
 * a way Directive cares about (becomes High priority, gets escalated, or is
 * reopened while unresolved), emit a Directive_Signal__c so the deterministic
 * pipeline can create/refresh a Work Item. The Signal after-insert trigger builds
 * the Work Item, so this trigger stays thin and bulk-safe.
 */
trigger DirectiveCaseTrigger on Case(after insert, after update) {
    if (Trigger.isInsert) {
        DirectiveCaseTriggerHandler.handleAfterInsert(Trigger.new);
    } else if (Trigger.isUpdate) {
        DirectiveCaseTriggerHandler.handleAfterUpdate(Trigger.new, Trigger.oldMap);
    }
}
