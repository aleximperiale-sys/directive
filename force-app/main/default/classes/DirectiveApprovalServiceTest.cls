/**
 * DirectiveApprovalServiceTest
 * ----------------------------
 * Covers listing, approving and rejecting pending action runs, plus the
 * permission gate on approve/reject.
 */
@isTest
private class DirectiveApprovalServiceTest {
    /** Insert a pending action run for a fresh work item; returns the run. */
    private static Directive_Action_Run__c pendingRun() {
        Case c = DirectiveTestFactory.newCase();
        Directive_Work_Item__c wi = DirectiveTestFactory.newWorkItem(c.Id);
        Directive_Action_Run__c run = new Directive_Action_Run__c(
            Work_Item__c = wi.Id,
            Action_Key__c = 'APPROVE_RECOMMENDATION',
            Requested_By__c = UserInfo.getUserId(),
            Requested_Source__c = 'User',
            Correlation_Id__c = 'corr-1',
            Started_At__c = System.now(),
            Approval_State__c = 'Pending',
            Result__c = 'Partial',
            Rollback_State__c = 'None'
        );
        insert run;
        return run;
    }

    @isTest
    static void approveMovesToApprovedAndRecordsOutcome() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Directive_Action_Run__c run = pendingRun();

            Test.startTest();
            List<DirectiveApprovalService.PendingApproval> pending = DirectiveApprovalService.getPending();
            DirectiveApprovalService.approve(run.Id);
            Test.stopTest();

            Assert.isFalse(pending.isEmpty(), 'The pending run should be listed');
            Directive_Action_Run__c reloaded = [
                SELECT Approval_State__c, Result__c, Work_Item__c
                FROM Directive_Action_Run__c
                WHERE Id = :run.Id
            ];
            Assert.areEqual('Approved', reloaded.Approval_State__c, 'State should be Approved');
            Assert.areEqual('Success', reloaded.Result__c, 'Result should be Success');
            Integer outcomes = [
                SELECT COUNT()
                FROM Directive_Outcome__c
                WHERE Work_Item__c = :reloaded.Work_Item__c AND Outcome_Type__c = 'Approval_Completed'
            ];
            Assert.areEqual(1, outcomes, 'Approval should record an Approval_Completed outcome');
        }
    }

    @isTest
    static void rejectMovesToRejectedWithReason() {
        User u = DirectiveTestFactory.permittedUser();
        System.runAs(u) {
            Directive_Action_Run__c run = pendingRun();

            Test.startTest();
            DirectiveApprovalService.reject(run.Id, 'Not this quarter');
            Test.stopTest();

            Directive_Action_Run__c reloaded = [
                SELECT Approval_State__c, Result__c, Error__c
                FROM Directive_Action_Run__c
                WHERE Id = :run.Id
            ];
            Assert.areEqual('Rejected', reloaded.Approval_State__c, 'State should be Rejected');
            Assert.areEqual('Failure', reloaded.Result__c, 'Result should be Failure');
            Assert.areEqual('Not this quarter', reloaded.Error__c, 'Reason should be captured');
        }
    }

    @isTest
    static void approveWithoutPermissionIsDenied() {
        // Setup-object DML must precede non-setup DML (MIXED_DML_OPERATION).
        // Explicitly unpermitted user - the running user may well have
        // Directive_Approve_Recommendation via a self-assigned permission set.
        User baseUser = DirectiveTestFactory.unpermittedUser();

        Directive_Action_Run__c run = pendingRun();

        Test.startTest();
        Boolean denied = false;
        System.runAs(baseUser) {
            try {
                DirectiveApprovalService.approve(run.Id);
            } catch (DirectiveException e) {
                denied = true;
                Assert.isTrue(e.getMessage().contains('permission'), 'Message should mention permission');
            }
        }
        Test.stopTest();

        Assert.isTrue(denied, 'Approving without the custom permission must be denied');
    }
}
