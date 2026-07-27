/**
 * DirectiveOutcomeServiceTest
 * ---------------------------
 * Covers the Measure stage: explicit outcome recording, completion-derived
 * outcomes, and the DirectiveWorkService.updateStatus wiring.
 */
@isTest
private class DirectiveOutcomeServiceTest {
    @isTest
    static void recordCreatesOutcome() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            Directive_Outcome__c o = DirectiveOutcomeService.record(
                wi.Id,
                DirectiveOutcomeService.RISK_DECREASED,
                'Reduced risk',
                5000
            );
            Test.stopTest();

            Assert.isNotNull(o.Id, 'Outcome should be inserted');
            Directive_Outcome__c reloaded = [
                SELECT Outcome_Type__c, Business_Value__c, Work_Item__c
                FROM Directive_Outcome__c
                WHERE Id = :o.Id
            ];
            Assert.areEqual('Risk_Decreased', reloaded.Outcome_Type__c, 'Type persisted');
            Assert.areEqual(wi.Id, reloaded.Work_Item__c, 'Linked to work item');
        }
    }

    @isTest
    static void completionOnClosedCaseRecordsCaseClosed() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = new Case(Subject = 'Closed one', Status = 'Closed', Priority = 'High', Origin = 'Phone');
            insert c;
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            Directive_Outcome__c o = DirectiveOutcomeService.recordForCompletion(
                [
                    SELECT Id, Title__c, Source_Object__c, Source_Record_Id__c, Business_Impact__c
                    FROM Directive_Work_Item__c
                    WHERE Id = :wi.Id
                ]
            );
            Test.stopTest();

            Assert.areEqual('Case_Closed', o.Outcome_Type__c, 'A closed backing case yields a Case_Closed outcome');
        }
    }

    @isTest
    static void updateStatusToCompletedRecordsOutcome() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            DirectiveWorkService.updateStatus(wi.Id, 'Completed');
            Test.stopTest();

            Integer outcomes = [SELECT COUNT() FROM Directive_Outcome__c WHERE Work_Item__c = :wi.Id];
            Assert.areEqual(1, outcomes, 'Completing a work item records exactly one outcome');
        }
    }

    @isTest
    static void recordRequiresWorkItem() {
        Boolean threw = false;
        try {
            DirectiveOutcomeService.record(null, DirectiveOutcomeService.INEFFECTIVE, 'x', null);
        } catch (DirectiveException e) {
            threw = true;
        }
        Assert.isTrue(threw, 'A null work item id should be rejected');
    }
}
