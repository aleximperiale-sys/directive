/**
 * DirectiveSignalTrigger
 * ----------------------
 * After a Signal is inserted, build/refresh its Work Item. The re-entrancy guard
 * lets DirectiveSignalService.ingestSignal drive the build itself without a
 * duplicate pass here.
 */
trigger DirectiveSignalTrigger on Directive_Signal__c (after insert) {
    if (!DirectiveSignalService.bypassTrigger) {
        DirectiveSignalTriggerHandler.handleAfterInsert(Trigger.new);
    }
}
