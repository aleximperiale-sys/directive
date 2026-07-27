/**
 * DirectiveSignalTriggerHandler
 * -----------------------------
 * Keeps trigger bodies thin. On after-insert of Directive_Signal__c it delegates
 * to DirectiveSignalService to (re)build the deduplicated, scored Work Items.
 */
public with sharing class DirectiveSignalTriggerHandler {

    public static void handleAfterInsert(List<Directive_Signal__c> newSignals) {
        if (newSignals == null || newSignals.isEmpty()) {
            return;
        }
        DirectiveSignalService.buildWorkItems(newSignals);
    }
}
