@isTest
private class DirectiveActionServiceTest {

    private static Directive_Work_Item__c makeItem(Id caseId) {
        Directive_Work_Item__c wi = new Directive_Work_Item__c(
            Title__c = 'Action target',
            Type__c = 'SLA_Risk',
            Category__c = 'Service',
            Status__c = 'New',
            Severity__c = 'High',
            Priority_Score__c = 70,
            Assigned_User__c = UserInfo.getUserId(),
            Source_Object__c = 'Case',
            Source_Record_Id__c = caseId,
            Dedupe_Key__c = 'ACT-' + caseId
        );
        insert wi;
        return wi;
    }

    private static Case makeCase() {
        // Suppress real-time Case detection so this fixture doesn't also create
        // its own NO_OWNER_ACTION signal/work item (see DirectiveDetectionTest).
        Boolean prior = DirectiveCaseTriggerHandler.bypass;
        DirectiveCaseTriggerHandler.bypass = true;
        try {
            Case c = new Case(Subject = 'Action case', Status = 'New', Priority = 'High', Origin = 'Phone');
            insert c;
            return c;
        } finally {
            DirectiveCaseTriggerHandler.bypass = prior;
        }
    }

    @isTest
    static void snoozeIsIdempotent() {
        Case c = makeCase();
        Directive_Work_Item__c wi = makeItem(c.Id);

        DirectiveActionService.ExecuteActionInput input = new DirectiveActionService.ExecuteActionInput();
        input.workItemId = wi.Id;
        input.actionKey = 'SNOOZE_ITEM';
        input.idempotencyKey = 'IDEMP-1';
        input.inputPayload = '{"hours":2}';

        Test.startTest();
        DirectiveActionService.ActionResult first = DirectiveActionService.execute(input);
        DirectiveActionService.ActionResult second = DirectiveActionService.execute(input);
        Test.stopTest();

        Assert.isTrue(first.success, 'First snooze should succeed');
        Assert.isFalse(first.idempotentHit, 'First call is not an idempotent hit');
        Assert.isNotNull(first.actionRunId, 'An audit run should be recorded');

        Assert.isTrue(second.idempotentHit, 'Second call with same key is an idempotent hit');
        Assert.areEqual(first.actionRunId, second.actionRunId,
            'Idempotent replay returns the original run');

        Integer runs = [SELECT COUNT() FROM Directive_Action_Run__c WHERE Idempotency_Key__c = 'IDEMP-1'];
        Assert.areEqual(1, runs, 'Only one audit run should exist for the key');

        Directive_Work_Item__c reloaded = [SELECT Status__c FROM Directive_Work_Item__c WHERE Id = :wi.Id];
        Assert.areEqual('Snoozed', reloaded.Status__c, 'Work item should be snoozed');
    }

    @isTest
    static void missingPermissionIsDenied() {
        // Create the user FIRST: User is a setup object, so inserting it after the
        // Case/Work Item DML in the same transaction raises MIXED_DML_OPERATION.
        // Run as a user explicitly WITHOUT the custom permission, rather than
        // relying on the running user not having self-assigned it.
        User baseUser = DirectiveTestFactory.unpermittedUser();

        Case c = makeCase();
        Directive_Work_Item__c wi = makeItem(c.Id);

        DirectiveActionService.ExecuteActionInput input = new DirectiveActionService.ExecuteActionInput();
        input.workItemId = wi.Id;
        input.actionKey = 'ESCALATE_CASE'; // requires Directive_Escalate_Case, not granted here

        Test.startTest();
        Boolean denied = false;
        System.runAs(baseUser) {
            try {
                DirectiveActionService.execute(input);
            } catch (DirectiveException e) {
                denied = true;
                Assert.isTrue(e.getMessage().contains('permission'), 'Message should mention permission');
            }
        }
        Test.stopTest();

        Assert.isTrue(denied, 'Execution without the custom permission must be denied');
    }

    @isTest
    static void availableActionsExcludePermissionedAndIncludeOpen() {
        // Setup-object DML must come before any non-setup DML (MIXED_DML_OPERATION).
        // Permission-gated options must be filtered for a user that genuinely
        // lacks the custom permissions - not merely assumed of the running user.
        User baseUser = DirectiveTestFactory.unpermittedUser();

        Case c = makeCase();
        Directive_Work_Item__c wi = makeItem(c.Id);

        Test.startTest();
        List<DirectiveActionService.ActionOption> options;
        System.runAs(baseUser) {
            options = DirectiveActionService.getAvailableActions(wi.Id);
        }
        Test.stopTest();

        Set<String> keys = new Set<String>();
        for (DirectiveActionService.ActionOption o : options) {
            keys.add(o.actionKey);
        }
        Assert.isTrue(keys.contains('SNOOZE_ITEM'), 'Open action should be available');
        Assert.isFalse(keys.contains('ESCALATE_CASE'),
            'Permission-gated action should be filtered out for this user');
    }

    @isTest
    static void followupTaskIsCreated() {
        Case c = makeCase();
        Directive_Work_Item__c wi = makeItem(c.Id);

        DirectiveActionService.ExecuteActionInput input = new DirectiveActionService.ExecuteActionInput();
        input.workItemId = wi.Id;
        input.actionKey = 'CREATE_FOLLOWUP_TASK';

        Test.startTest();
        DirectiveActionService.ActionResult res = DirectiveActionService.execute(input);
        Test.stopTest();

        Assert.isTrue(res.success, 'Follow-up task action should succeed');
        Integer tasks = [SELECT COUNT() FROM Task WHERE WhatId = :c.Id];
        Assert.areEqual(1, tasks, 'A follow-up task should be created against the case');
    }

    @isTest
    static void unknownActionThrows() {
        Case c = makeCase();
        Directive_Work_Item__c wi = makeItem(c.Id);
        DirectiveActionService.ExecuteActionInput input = new DirectiveActionService.ExecuteActionInput();
        input.workItemId = wi.Id;
        input.actionKey = 'NOT_A_REAL_ACTION';
        try {
            DirectiveActionService.execute(input);
            Assert.fail('Expected DirectiveException for unknown action');
        } catch (DirectiveException e) {
            Assert.isTrue(e.getMessage().contains('Unknown action'), 'Should reject unknown action');
        }
    }

    @isTest
    static void buildContextReturnsJson() {
        Case c = makeCase();
        Directive_Work_Item__c wi = makeItem(c.Id);

        Test.startTest();
        // Do not name this `json` - it would shadow the system JSON class.
        String contextJson = DirectiveContextService.buildContext(UserInfo.getUserId(), wi.Id);
        Test.stopTest();

        Assert.isTrue(String.isNotBlank(contextJson), 'Context JSON should not be blank');
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(contextJson);
        Assert.isTrue(parsed.containsKey('workItem'), 'Context should contain the work item');
        Assert.isTrue(parsed.containsKey('availableActions'), 'Context should contain available actions');
    }
}
