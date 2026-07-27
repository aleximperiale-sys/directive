/**
 * DirectiveActionServiceExtendedTest
 * ----------------------------------
 * Covers the actions that require a custom permission and the Flow / content /
 * approval implementations added beyond the original three. Everything runs as a
 * fully-permitted user (Directive_Administrator) via System.runAs so the custom
 * permission checks pass.
 */
@isTest
private class DirectiveActionServiceExtendedTest {
    @isTest
    static void escalateCaseRunsFlow() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);
            DirectiveActionService.ExecuteActionInput input = DirectiveTestFactory.actionInput(wi.Id, 'ESCALATE_CASE');

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(input);
            Test.stopTest();

            Assert.isTrue(res.success, 'Escalate should succeed via the flow. Msg: ' + res.message);
            Case reloaded = [SELECT IsEscalated, Priority FROM Case WHERE Id = :c.Id];
            Assert.isTrue(reloaded.IsEscalated, 'Case should be flagged escalated by the flow');
            Assert.areEqual('High', reloaded.Priority, 'Flow should set priority High');
        }
    }

    @isTest
    static void reassignCaseUpdatesOwnerAndWorkItem() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);
            DirectiveActionService.ExecuteActionInput input = DirectiveTestFactory.actionInput(wi.Id, 'REASSIGN_CASE');
            input.inputPayload = '{"assigneeId":"' + u.Id + '"}';

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(input);
            Test.stopTest();

            Assert.isTrue(res.success, 'Reassign should succeed. Msg: ' + res.message);
            Case reloaded = [SELECT OwnerId FROM Case WHERE Id = :c.Id];
            Assert.areEqual(u.Id, reloaded.OwnerId, 'Case owner should be the assignee');
            Directive_Work_Item__c wiReloaded = [SELECT Assigned_User__c FROM Directive_Work_Item__c WHERE Id = :wi.Id];
            Assert.areEqual(u.Id, wiReloaded.Assigned_User__c, 'Work item assignment should mirror');
        }
    }

    @isTest
    static void reassignRequiresAssignee() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);
            DirectiveActionService.ExecuteActionInput input = DirectiveTestFactory.actionInput(wi.Id, 'REASSIGN_CASE'); // no payload

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(input);
            Test.stopTest();

            Assert.areEqual('Failure', res.result, 'Missing assigneeId should fail gracefully (audited)');
        }
    }

    @isTest
    static void notifyManagerCreatesTask() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);
            DirectiveActionService.ExecuteActionInput input = DirectiveTestFactory.actionInput(wi.Id, 'NOTIFY_MANAGER');
            input.inputPayload = '{"managerId":"' + u.Id + '"}';

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(input);
            Test.stopTest();

            Assert.isTrue(res.success, 'Notify should succeed. Msg: ' + res.message);
            Integer tasks = [SELECT COUNT() FROM Task WHERE WhatId = :c.Id AND OwnerId = :u.Id];
            Assert.areEqual(1, tasks, 'A task should be created for the manager on the case');
        }
    }

    @isTest
    static void draftCustomerResponseCreatesRecommendation() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(
                DirectiveTestFactory.actionInput(wi.Id, 'DRAFT_CUSTOMER_RESPONSE')
            );
            Test.stopTest();

            Assert.isTrue(res.success, 'Draft should succeed. Msg: ' + res.message);
            List<Directive_Recommendation__c> recs = [
                SELECT Recommendation_Type__c, Context_Snapshot__c
                FROM Directive_Recommendation__c
                WHERE Work_Item__c = :wi.Id AND Recommended_Action_Key__c = 'DRAFT_CUSTOMER_RESPONSE'
            ];
            Assert.areEqual(1, recs.size(), 'One response draft recommendation expected');
            Assert.isTrue(String.isNotBlank(recs[0].Context_Snapshot__c), 'Draft body should be stored');
        }
    }

    @isTest
    static void generateSummaryIsIdempotent() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            DirectiveActionService.execute(DirectiveTestFactory.actionInput(wi.Id, 'GENERATE_CASE_SUMMARY'));
            DirectiveActionService.execute(DirectiveTestFactory.actionInput(wi.Id, 'GENERATE_CASE_SUMMARY'));
            Test.stopTest();

            Integer recs = [
                SELECT COUNT()
                FROM Directive_Recommendation__c
                WHERE Work_Item__c = :wi.Id AND Recommended_Action_Key__c = 'GENERATE_CASE_SUMMARY'
            ];
            Assert.areEqual(1, recs, 'Repeat summary generation should refresh, not duplicate');
        }
    }

    @isTest
    static void createKnowledgeDraftCreatesRecommendation() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(
                DirectiveTestFactory.actionInput(wi.Id, 'CREATE_KNOWLEDGE_DRAFT')
            );
            Test.stopTest();

            Assert.isTrue(res.success, 'Knowledge draft should succeed. Msg: ' + res.message);
            Integer recs = [
                SELECT COUNT()
                FROM Directive_Recommendation__c
                WHERE Work_Item__c = :wi.Id AND Recommended_Action_Key__c = 'CREATE_KNOWLEDGE_DRAFT'
            ];
            Assert.areEqual(1, recs, 'One knowledge draft recommendation expected');
        }
    }

    @isTest
    static void approveRecommendationAcceptsAndApproves() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);
            Directive_Recommendation__c rec = DirectiveTestFactory.newRecommendation(wi.Id);

            Test.startTest();
            DirectiveActionService.ActionResult res = DirectiveActionService.execute(
                DirectiveTestFactory.actionInput(wi.Id, 'APPROVE_RECOMMENDATION')
            );
            Test.stopTest();

            Assert.isTrue(res.success, 'Approve should succeed. Msg: ' + res.message);
            Directive_Recommendation__c reloaded = [
                SELECT Accepted__c, Outcome__c
                FROM Directive_Recommendation__c
                WHERE Id = :rec.Id
            ];
            Assert.isTrue(reloaded.Accepted__c, 'Recommendation should be accepted');
            Directive_Action_Run__c run = [
                SELECT Approval_State__c
                FROM Directive_Action_Run__c
                WHERE Id = :res.actionRunId
            ];
            Assert.areEqual('Approved', run.Approval_State__c, 'Run approval state should be Approved');
        }
    }

    @isTest
    static void permittedUserSeesSensitiveActions() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Case c = DirectiveTestFactory.newCase();
            Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);

            Test.startTest();
            List<DirectiveActionService.ActionOption> options = DirectiveActionService.getAvailableActions(wi.Id);
            Test.stopTest();

            Set<String> keys = new Set<String>();
            for (DirectiveActionService.ActionOption o : options) {
                keys.add(o.actionKey);
            }
            Assert.isTrue(keys.contains('ESCALATE_CASE'), 'A permitted user should see the escalate action');
            Assert.isTrue(keys.contains('REASSIGN_CASE'), 'A permitted user should see the reassign action');
        }
    }
}
