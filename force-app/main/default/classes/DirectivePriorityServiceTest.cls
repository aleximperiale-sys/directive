/**
 * Tests the deterministic, explainable scoring engine. Uses an injected component
 * configuration so the math is independent of the org's Custom Metadata.
 */
@isTest
private class DirectivePriorityServiceTest {

    /** Canonical component weights (mirrors the seeded Custom Metadata). */
    private static Map<String, Directive_Score_Component__mdt> components() {
        Map<String, Directive_Score_Component__mdt> m = new Map<String, Directive_Score_Component__mdt>();
        m.put('BASE_RULE', comp('BASE_RULE', 'Base rule priority', 40));
        m.put('URGENCY', comp('URGENCY', 'Urgency / time pressure', 12));
        m.put('BUSINESS_IMPACT', comp('BUSINESS_IMPACT', 'Revenue exposure', 25));
        m.put('CUSTOMER_IMPORTANCE', comp('CUSTOMER_IMPORTANCE', 'Customer importance', 15));
        m.put('SLA_EXPOSURE', comp('SLA_EXPOSURE', 'SLA exposure', 20));
        m.put('USER_RELEVANCE', comp('USER_RELEVANCE', 'User relevance', 10));
        m.put('CONFIDENCE', comp('CONFIDENCE', 'Signal confidence', 10));
        m.put('ESCALATION', comp('ESCALATION', 'Escalation pressure', 10));
        m.put('RECENCY', comp('RECENCY', 'Recency', 8));
        m.put('MITIGATION', comp('MITIGATION', 'Recovery activity already scheduled', -15));
        m.put('SUPPRESSION', comp('SUPPRESSION', 'Suppression / snoozed', -30));
        return m;
    }

    private static Directive_Score_Component__mdt comp(String key, String label, Decimal max) {
        return new Directive_Score_Component__mdt(
            Calculation_Key__c = key, Component_Label__c = label,
            Weight__c = max, Maximum_Contribution__c = max,
            Calculation_Strategy__c = 'Apex', Active__c = true
        );
    }

    @isTest
    static void highValueCriticalScoresAndExplains() {
        DirectivePriorityService.componentOverride = components();

        Directive_Work_Item__c wi = new Directive_Work_Item__c(
            Title__c = 'High value account, SLA imminent',
            Type__c = 'Escalation',
            Category__c = 'Revenue',
            Status__c = 'New',
            Severity__c = 'Critical',                       // BASE_RULE  +40
            Business_Impact__c = 100000,                    // BUSINESS   +25
            Confidence__c = 100,                            // CONFIDENCE +10
            Due_At__c = System.now().addHours(1),           // URGENCY    +12
            Detected_At__c = System.now(),                  // RECENCY    +8
            Assigned_User__c = UserInfo.getUserId(),        // USER       +10
            Rule_Key__c = 'HIGH_VALUE_CRITICAL',
            // CUSTOMER +15, SLA +20, ESCALATION +10, MITIGATION -15
            Reason_Codes__c = 'HIGH_VALUE_ACCOUNT;SLA_BREACH_IMMINENT;' +
                'EXECUTIVE_ENGAGEMENT_GAP;RECOVERY_ALREADY_SCHEDULED'
        );

        DirectivePriorityService svc = new DirectivePriorityService();

        Test.startTest();
        DirectivePriorityService.PriorityResult result = svc.score(wi, null);
        String explanation = svc.explain(wi, null);
        Test.stopTest();

        // Raw sum is 135; must clamp to the published maximum of 100.
        Assert.areEqual(100, result.total, 'Score should clamp to 100');
        Assert.areEqual('Critical', result.band, 'Score 100 is Critical band');
        Assert.isFalse(result.breakdown.isEmpty(), 'Breakdown should be populated');

        // Largest absolute impact first: BASE_RULE (40).
        Assert.areEqual('BASE_RULE', result.breakdown[0].componentKey,
            'Largest contribution should sort first');

        // Both a positive and the negative mitigation line must appear.
        Assert.isTrue(explanation.contains('+40 Base rule priority'),
            'Explanation should include the base rule line: ' + explanation);
        Assert.isTrue(explanation.contains('-15 Recovery activity already scheduled'),
            'Explanation should include the negative mitigation line: ' + explanation);

        // Breakdown ordering must be non-increasing by absolute contribution.
        Decimal previous = null;
        for (DirectivePriorityService.ScoreLine line : result.breakdown) {
            Decimal abs = line.contribution.abs();
            if (previous != null) {
                Assert.isTrue(abs <= previous, 'Breakdown must be ordered by |contribution| desc');
            }
            previous = abs;
        }
    }

    @isTest
    static void snoozedItemIsSuppressed() {
        DirectivePriorityService.componentOverride = components();
        Directive_Work_Item__c wi = new Directive_Work_Item__c(
            Severity__c = 'Critical',            // +40
            Status__c = 'Snoozed',               // SUPPRESSION -30
            Snoozed_Until__c = System.now().addDays(1)
        );
        DirectivePriorityService svc = new DirectivePriorityService();
        DirectivePriorityService.PriorityResult r = svc.score(wi, null);
        // 40 - 30 = 10 -> Background band.
        Assert.areEqual(10, r.total, 'Suppression should pull the score down');
        Assert.areEqual('Background', r.band, 'Score 10 is Background');
    }

    @isTest
    static void bandBoundaries() {
        Assert.areEqual('Critical', DirectivePriorityService.band(90));
        Assert.areEqual('High', DirectivePriorityService.band(75));
        Assert.areEqual('Medium', DirectivePriorityService.band(50));
        Assert.areEqual('Low', DirectivePriorityService.band(25));
        Assert.areEqual('Background', DirectivePriorityService.band(0));
        Assert.areEqual('Background', DirectivePriorityService.band(null));
    }

    @isTest
    static void nullWorkItemScoresZero() {
        DirectivePriorityService svc = new DirectivePriorityService();
        DirectivePriorityService.PriorityResult r = svc.score(null, null);
        Assert.areEqual(0, r.total, 'Null work item scores zero');
    }
}
