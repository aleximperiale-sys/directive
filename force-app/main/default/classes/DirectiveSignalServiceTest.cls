@isTest
private class DirectiveSignalServiceTest {

    private static DirectiveSignalService.SignalInput slaInput(Id caseId, String dedupe) {
        // NOTE: `in` is a reserved word in Apex - this local must not use it.
        DirectiveSignalService.SignalInput si = new DirectiveSignalService.SignalInput();
        si.signalType = 'SLA_Threshold';
        si.sourceObject = 'Case';
        si.sourceRecordId = caseId;
        si.occurredAt = System.now();
        si.ruleKey = 'SLA_THRESHOLD';
        si.confidence = 90;
        si.severity = 'High';
        si.category = 'Service';
        si.title = 'SLA risk';
        si.reasonCodes = 'SLA_BREACH_IMMINENT';
        si.dedupeKey = dedupe;
        return si;
    }

    private static Case makeCase() {
        // This fixture is an open High-priority Case, which DirectiveCaseTrigger
        // would treat as a NO_OWNER_ACTION detection and emit its own signal for.
        // These tests exercise the signal pipeline directly, so suppress real-time
        // detection here; DirectiveDetectionTest covers the trigger itself.
        Boolean prior = DirectiveCaseTriggerHandler.bypass;
        DirectiveCaseTriggerHandler.bypass = true;
        try {
            Case c = new Case(Subject = 'Signal case', Status = 'New', Priority = 'High', Origin = 'Phone');
            insert c;
            return c;
        } finally {
            DirectiveCaseTriggerHandler.bypass = prior;
        }
    }

    @isTest
    static void duplicateSignalsProduceOneWorkItem() {
        Case c = makeCase();
        String dedupe = 'Case:' + c.Id + ':SLA_THRESHOLD';

        Test.startTest();
        DirectiveSignalService.ingestSignal(slaInput(c.Id, dedupe));
        DirectiveSignalService.ingestSignal(slaInput(c.Id, dedupe)); // same dedupe key
        Test.stopTest();

        Integer signals = [SELECT COUNT() FROM Directive_Signal__c WHERE Dedupe_Key__c = :dedupe];
        Assert.areEqual(1, signals, 'Signals must dedupe to a single record');

        List<Directive_Work_Item__c> items = [
            SELECT Id, Priority_Score__c, Explanation__c, Type__c, Status__c
            FROM Directive_Work_Item__c
        ];
        Assert.areEqual(1, items.size(), 'Duplicate signals must produce exactly one work item');
        Assert.isTrue(items[0].Priority_Score__c > 0, 'Work item should be scored');
        Assert.isTrue(String.isNotBlank(items[0].Explanation__c), 'Work item should carry an explanation');
        Assert.areEqual('SLA_Risk', items[0].Type__c, 'SLA_Threshold signal maps to SLA_Risk');
    }

    @isTest
    static void triggerBuildsWorkItemOnInsert() {
        Case c = makeCase();
        // Insert a signal directly so the trigger (not ingestSignal) drives the build.
        Directive_Signal__c s = new Directive_Signal__c(
            Signal_Type__c = 'No_Activity',
            Source_Object__c = 'Case',
            Source_Record_Id__c = c.Id,
            Occurred_At__c = System.now(),
            Rule_Key__c = 'NO_OWNER_ACTION',
            Confidence__c = 80,
            Processing_Status__c = 'Pending',
            Dedupe_Key__c = 'Case:' + c.Id + ':NO_OWNER_ACTION'
        );

        Test.startTest();
        insert s; // fires DirectiveSignalTrigger -> handler -> buildWorkItems
        Test.stopTest();

        List<Directive_Work_Item__c> items = [SELECT Id, Type__c FROM Directive_Work_Item__c];
        Assert.areEqual(1, items.size(), 'Trigger should build a work item');
        Assert.areEqual('Critical_Case', items[0].Type__c, 'No_Activity maps to Critical_Case');

        Directive_Signal__c reloaded = [SELECT Processing_Status__c, Work_Item__c FROM Directive_Signal__c WHERE Id = :s.Id];
        Assert.areEqual('Processed', reloaded.Processing_Status__c, 'Signal should be marked processed');
        Assert.isNotNull(reloaded.Work_Item__c, 'Signal should be linked to its work item');
    }

    @isTest
    static void evaluateScheduledEmitsSignalsForHighPriorityCases() {
        insert new Case(Subject = 'Nearing SLA', Status = 'New', Priority = 'High', Origin = 'Web');

        Test.startTest();
        Integer count = DirectiveSignalService.evaluateScheduled();
        Test.stopTest();

        Assert.isTrue(count >= 1, 'Should emit at least one signal for the open high-priority case');
        Assert.isTrue([SELECT COUNT() FROM Directive_Work_Item__c] >= 1,
            'Scheduled evaluation should yield a work item via the trigger');
    }
}
