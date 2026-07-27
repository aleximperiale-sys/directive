/**
 * DirectiveDetectionTest
 * ----------------------
 * Covers the Detect stage added for real-time + scheduled channels: the Case
 * trigger, the scheduled evaluator wrapper, and the telemetry publisher.
 */
@isTest
private class DirectiveDetectionTest {
    @isTest
    static void highPriorityCaseInsertCreatesWorkItem() {
        Test.startTest();
        Case c = new Case(Subject = 'Urgent', Status = 'New', Priority = 'High', Origin = 'Phone');
        insert c;
        Test.stopTest();

        List<Directive_Work_Item__c> items = [
            SELECT Id, Rule_Key__c, Source_Record_Id__c
            FROM Directive_Work_Item__c
            WHERE Source_Record_Id__c = :c.Id
        ];
        Assert.areEqual(1, items.size(), 'A High-priority Case should produce one work item');
        Assert.areEqual('NO_OWNER_ACTION', items[0].Rule_Key__c, 'Detected via the no-owner-action rule');
    }

    @isTest
    static void lowPriorityCaseCreatesNothing() {
        Test.startTest();
        Case c = new Case(Subject = 'Routine', Status = 'New', Priority = 'Low', Origin = 'Phone');
        insert c;
        Test.stopTest();

        Integer items = [SELECT COUNT() FROM Directive_Work_Item__c WHERE Source_Record_Id__c = :c.Id];
        Assert.areEqual(0, items, 'A Low-priority Case should not produce work');
    }

    @isTest
    static void raisingPriorityToHighDetectsOnUpdate() {
        Case c = new Case(Subject = 'Escalating', Status = 'New', Priority = 'Low', Origin = 'Phone');
        insert c;

        Test.startTest();
        c.Priority = 'High';
        update c;
        Test.stopTest();

        Integer items = [SELECT COUNT() FROM Directive_Work_Item__c WHERE Source_Record_Id__c = :c.Id];
        Assert.areEqual(1, items, 'Raising a Case to High should detect on update');
    }

    @isTest
    static void detectionBypassSuppressesSignals() {
        DirectiveCaseTriggerHandler.bypass = true;
        Test.startTest();
        Case c = new Case(Subject = 'Bypassed', Status = 'New', Priority = 'High', Origin = 'Phone');
        insert c;
        Test.stopTest();
        DirectiveCaseTriggerHandler.bypass = false;

        Integer items = [SELECT COUNT() FROM Directive_Work_Item__c WHERE Source_Record_Id__c = :c.Id];
        Assert.areEqual(0, items, 'Bypass flag should suppress detection');
    }

    @isTest
    static void scheduledEvaluationCreatesSignals() {
        // Seed an open High-priority case with detection bypassed so evaluateScheduled
        // is what produces the work item.
        DirectiveCaseTriggerHandler.bypass = true;
        Case c = new Case(Subject = 'Aging', Status = 'New', Priority = 'High', Origin = 'Phone');
        insert c;
        DirectiveCaseTriggerHandler.bypass = false;

        Test.startTest();
        Integer created = DirectiveSignalService.evaluateScheduled();
        Test.stopTest();

        Assert.isTrue(created >= 1, 'Scheduled evaluation should create at least one signal');
    }

    @isTest
    static void schedulerRunsAndCanBeScheduled() {
        Test.startTest();
        Id jobId = DirectiveSignalScheduler.schedule('Directive Signal Test Job', '0 0 1 * * ?');
        // Also exercise execute() directly for coverage.
        new DirectiveSignalScheduler().execute(null);
        Test.stopTest();

        Assert.isNotNull(jobId, 'A CRON job id should be returned');
        Integer jobs = [SELECT COUNT() FROM CronTrigger WHERE Id = :jobId];
        Assert.areEqual(1, jobs, 'The scheduled job should be registered');
    }

    @isTest
    static void telemetryPublishReturnsTrueAndSkipsBlank() {
        Test.startTest();
        DirectiveTelemetryService.Event ev = new DirectiveTelemetryService.Event();
        ev.eventType = 'UNIT_TEST';
        ev.result = 'Success';
        Boolean published = DirectiveTelemetryService.publish(ev);
        Boolean skipped = DirectiveTelemetryService.publish(null);
        // Convenience path should not throw.
        DirectiveTelemetryService.emitActionRun('corr', null, null, 'Success', null, 12);
        Test.stopTest();

        Assert.isTrue(published, 'A well-formed event should be queued for publish');
        Assert.isFalse(skipped, 'A null event should be skipped, not published');
    }
}
