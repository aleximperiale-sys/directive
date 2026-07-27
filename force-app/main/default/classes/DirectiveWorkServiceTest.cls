@isTest
private class DirectiveWorkServiceTest {

    private static Directive_Work_Item__c makeItem(String dedupe, Integer score) {
        return new Directive_Work_Item__c(
            Title__c = 'Test work',
            Type__c = 'SLA_Risk',
            Category__c = 'Service',
            Status__c = 'New',
            Severity__c = 'High',
            Priority_Score__c = score,
            Assigned_User__c = UserInfo.getUserId(),
            Dedupe_Key__c = dedupe,
            Detected_At__c = System.now()
        );
    }

    @isTest
    static void getMyWorkReturnsAssignedItemsSortedByPriority() {
        insert new List<Directive_Work_Item__c>{
            makeItem('WQ-1', 80),
            makeItem('WQ-2', 40)
        };

        Test.startTest();
        DirectiveWorkService.WorkQuery q = new DirectiveWorkService.WorkQuery();
        q.severity = 'High';
        List<DirectiveWorkService.WorkItemView> views = DirectiveWorkService.getMyWork(q);
        Test.stopTest();

        Assert.areEqual(2, views.size(), 'Both assigned items should return');
        Assert.areEqual(80, views[0].record.Priority_Score__c.intValue(),
            'Highest priority should come first');
        Assert.areEqual('High', views[0].band, 'Score 80 is High band');
    }

    @isTest
    static void getWorkItemLoadsSingle() {
        Directive_Work_Item__c wi = makeItem('WQ-single', 60);
        insert wi;
        DirectiveWorkService.WorkItemView view = DirectiveWorkService.getWorkItem(wi.Id);
        Assert.areEqual(wi.Id, view.record.Id, 'Should load the requested item');
        Assert.areEqual('Medium', view.band, 'Score 60 is Medium band');
    }

    @isTest
    static void updateStatusToCompletedStampsMetadata() {
        Directive_Work_Item__c wi = makeItem('WQ-complete', 50);
        insert wi;

        Test.startTest();
        DirectiveWorkService.WorkItemView view = DirectiveWorkService.updateStatus(wi.Id, 'Completed');
        Test.stopTest();

        Assert.areEqual('Completed', view.record.Status__c, 'Status should update');
        Assert.isNotNull(view.record.Completed_At__c, 'Completed timestamp should be set');
        Assert.areEqual(UserInfo.getUserId(), view.record.Completed_By__c,
            'Completed by should be the running user');
    }

    @isTest
    static void snoozeSetsFutureDatetime() {
        Directive_Work_Item__c wi = makeItem('WQ-snooze', 50);
        insert wi;
        Datetime until = System.now().addDays(2);

        Test.startTest();
        DirectiveWorkService.WorkItemView view = DirectiveWorkService.snooze(wi.Id, until);
        Test.stopTest();

        Assert.areEqual('Snoozed', view.record.Status__c, 'Status should be Snoozed');
        Assert.isNotNull(view.record.Snoozed_Until__c, 'Snooze target should be set');
    }

    @isTest
    static void invalidStatusThrows() {
        Directive_Work_Item__c wi = makeItem('WQ-bad', 50);
        insert wi;
        try {
            DirectiveWorkService.updateStatus(wi.Id, 'Bogus');
            Assert.fail('Expected DirectiveException for invalid status');
        } catch (DirectiveException e) {
            Assert.isTrue(e.getMessage().contains('Invalid status'), 'Should reject bad status');
        }
    }
}
