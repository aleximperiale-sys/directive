/**
 * DirectiveTestFactory
 * --------------------
 * Shared test setup for the Directive service layer. Provides a fully-permitted
 * user (System Administrator profile + Directive_Administrator permission set, so
 * every Directive custom permission is granted) and simple record builders.
 *
 * Usage pattern to avoid MIXED_DML_OPERATION: create the user OUTSIDE a runAs
 * block (setup-object DML), then create Cases/Work Items INSIDE System.runAs so
 * the permitted user owns the data and can see it.
 */
@isTest
public class DirectiveTestFactory {
    /** A user with the System Administrator profile and all Directive permissions. */
    public static User permittedUser() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
        String suffix = String.valueOf(Math.abs(Crypto.getRandomInteger()));
        User u = new User(
            FirstName = 'Directive',
            LastName = 'Tester' + suffix,
            Alias = 'dtst',
            Email = 'directive.tester@example.com.invalid',
            Username = 'directive.tester.' + suffix + '@example.com.invalid',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'America/Los_Angeles',
            ProfileId = p.Id
        );
        insert u;
        PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Directive_Administrator' LIMIT 1];
        insert new PermissionSetAssignment(AssigneeId = u.Id, PermissionSetId = ps.Id);
        return u;
    }

    /**
     * A user with base Directive access (objects + fields via Directive_User) but
     * DELIBERATELY none of the Directive custom permissions.
     *
     * Negative permission tests must run as this user via System.runAs rather than
     * as the running user: an admin who self-assigns Directive_Administrator or
     * Directive_Sensitive_Actions would otherwise silently invalidate them. The
     * Directive objects are sharingModel=ReadWrite, so this user can still read
     * fixtures created by the test's own running user.
     */
    public static User unpermittedUser() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
        PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Directive_User' LIMIT 1];
        String suffix = String.valueOf(Math.abs(Crypto.getRandomInteger()));
        User u = new User(
            FirstName = 'Directive',
            LastName = 'Base' + suffix,
            Alias = 'dbse',
            Email = 'directive.base@example.com.invalid',
            Username = 'directive.base.' + suffix + '@example.com.invalid',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'America/Los_Angeles',
            ProfileId = p.Id
        );
        // User and PermissionSetAssignment are SETUP objects. Mixing them with
        // Case/Work Item DML in one transaction throws MIXED_DML_OPERATION in
        // either order, so isolate the setup DML in its own runAs context. This
        // lets callers create the user at any point in the test.
        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert u;
            insert new PermissionSetAssignment(AssigneeId = u.Id, PermissionSetId = ps.Id);
        }
        return u;
    }

    /** Insert and return a simple open, High-priority Case. */
    public static Case newCase() {
        return newCase('Test case', 'High');
    }

    public static Case newCase(String subject, String priority) {
        Case c = new Case(Subject = subject, Status = 'New', Priority = priority, Origin = 'Phone');
        insert c;
        return c;
    }

    /** Insert and return a Work Item backed by the given Case, owned by the caller. */
    public static Directive_Work_Item__c newWorkItem(Id caseId) {
        Directive_Work_Item__c wi = new Directive_Work_Item__c(
            Title__c = 'Action target',
            Type__c = 'SLA_Risk',
            Category__c = 'Service',
            Status__c = 'New',
            Severity__c = 'High',
            Priority_Score__c = 70,
            Business_Impact__c = 25000,
            Assigned_User__c = UserInfo.getUserId(),
            Source_Object__c = 'Case',
            Source_Record_Id__c = caseId,
            Dedupe_Key__c = 'ACT-' + caseId
        );
        insert wi;
        return wi;
    }

    /** Insert and return a recommendation on the given Work Item. */
    public static Directive_Recommendation__c newRecommendation(Id workItemId) {
        Directive_Recommendation__c rec = new Directive_Recommendation__c(
            Work_Item__c = workItemId,
            Recommendation_Type__c = 'Action',
            Recommended_Action_Key__c = 'DRAFT_CUSTOMER_RESPONSE',
            Explanation__c = 'Test recommendation',
            Confidence__c = 60,
            Accepted__c = false,
            Dismissed__c = false
        );
        insert rec;
        return rec;
    }

    /** Build (unsaved) an ExecuteActionInput for the given work item + action. */
    public static DirectiveActionService.ExecuteActionInput actionInput(Id workItemId, String actionKey) {
        DirectiveActionService.ExecuteActionInput input = new DirectiveActionService.ExecuteActionInput();
        input.workItemId = workItemId;
        input.actionKey = actionKey;
        return input;
    }
}
