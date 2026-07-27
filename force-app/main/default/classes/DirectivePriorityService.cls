/**
 * DirectivePriorityService
 * -------------------------
 * The flagship scoring engine. Given a Work Item and its Signals it produces a
 * deterministic, fully EXPLAINABLE priority score in the range 0-100.
 *
 * Design goals:
 *  - Deterministic: the same inputs always produce the same score and the same
 *    ordered breakdown. No randomness, no time-of-day drift beyond the explicit
 *    urgency/recency time-decay inputs.
 *  - Explainable: every point is attributed to a named component and surfaced as
 *    a breakdown line ("+18 Revenue exposure", "-8 Recovery activity already
 *    scheduled"). Positive and negative contributions both appear.
 *  - Configurable: the WEIGHT and MAXIMUM_CONTRIBUTION for each component come
 *    from Directive_Score_Component__mdt so operators can retune without code.
 *
 * The engine computes, for each active component, a normalized input in [0,1]
 * derived from Work Item / Signal facts, multiplies it by the component's
 * Maximum_Contribution (which may be negative for mitigating/suppressing
 * components), rounds to a whole number of points, sums them and clamps the
 * total to [0,100].
 */
public with sharing class DirectivePriorityService {

    // --- Component keys (mirror Directive_Score_Component__mdt.Calculation_Key__c) ---
    public static final String BASE_RULE          = 'BASE_RULE';
    public static final String URGENCY            = 'URGENCY';
    public static final String BUSINESS_IMPACT    = 'BUSINESS_IMPACT';
    public static final String CUSTOMER_IMPORTANCE= 'CUSTOMER_IMPORTANCE';
    public static final String SLA_EXPOSURE       = 'SLA_EXPOSURE';
    public static final String USER_RELEVANCE     = 'USER_RELEVANCE';
    public static final String CONFIDENCE         = 'CONFIDENCE';
    public static final String ESCALATION         = 'ESCALATION';
    public static final String RECENCY            = 'RECENCY';
    public static final String MITIGATION         = 'MITIGATION';
    public static final String SUPPRESSION        = 'SUPPRESSION';

    /**
     * Allows tests to inject a deterministic component configuration so the
     * scoring math is independent of the org's Custom Metadata records.
     */
    @TestVisible
    private static Map<String, Directive_Score_Component__mdt> componentOverride;

    // ---------------------------------------------------------------- results

    /** One attributed line of the score breakdown. */
    public class ScoreLine {
        @AuraEnabled public String componentKey;
        @AuraEnabled public String label;
        @AuraEnabled public Decimal contribution;
        public ScoreLine(String componentKey, String label, Decimal contribution) {
            this.componentKey = componentKey;
            this.label = label;
            this.contribution = contribution;
        }
    }

    /** The full, explainable result of a scoring pass. */
    public class PriorityResult {
        @AuraEnabled public Integer total;
        @AuraEnabled public String band;
        @AuraEnabled public List<ScoreLine> breakdown;
        public PriorityResult() {
            this.breakdown = new List<ScoreLine>();
        }
    }

    // ------------------------------------------------------------- public API

    /**
     * Score a Work Item against its signals.
     * @return a PriorityResult with the clamped total (0-100), its band and the
     *         ordered contribution breakdown (largest absolute impact first).
     */
    public PriorityResult score(Directive_Work_Item__c wi, List<Directive_Signal__c> signals) {
        PriorityResult result = new PriorityResult();
        if (wi == null) {
            result.total = 0;
            result.band = band(0);
            return result;
        }
        List<Directive_Signal__c> sigs = signals == null ? new List<Directive_Signal__c>() : signals;

        Map<String, Directive_Score_Component__mdt> comps = getComponents();
        Set<String> reasons = reasonCodes(wi);

        Decimal raw = 0;
        for (String key : comps.keySet()) {
            Directive_Score_Component__mdt comp = comps.get(key);
            Decimal maxContribution = comp.Maximum_Contribution__c == null ? 0 : comp.Maximum_Contribution__c;
            if (maxContribution == 0) {
                continue;
            }
            Decimal normalized = normalizedInput(key, wi, sigs, reasons); // 0..1 magnitude
            if (normalized <= 0) {
                continue;
            }
            Decimal contribution = (maxContribution * normalized).setScale(0, System.RoundingMode.HALF_UP);
            if (contribution == 0) {
                continue;
            }
            result.breakdown.add(new ScoreLine(key, comp.Component_Label__c, contribution));
            raw += contribution;
        }

        // Largest absolute impact first, ties broken by key for determinism.
        result.breakdown.sort(new ScoreLineComparator());

        // Clamp to the published 0-100 band range.
        Decimal capped = raw;
        if (capped < 0) capped = 0;
        if (capped > 100) capped = 100;
        result.total = capped.intValue();
        result.band = band(result.total);
        return result;
    }

    /**
     * Human-readable one-line explanation, e.g.
     * "+40 Base rule priority / +25 Revenue exposure / -15 Recovery activity already scheduled".
     */
    public String explain(Directive_Work_Item__c wi, List<Directive_Signal__c> signals) {
        PriorityResult r = score(wi, signals);
        List<String> parts = new List<String>();
        for (ScoreLine line : r.breakdown) {
            String sign = line.contribution >= 0 ? '+' : '-';
            parts.add(sign + String.valueOf(line.contribution.abs()) + ' ' + line.label);
        }
        return String.join(parts, ' / ');
    }

    /** Map a 0-100 score to its published band. */
    public static String band(Integer score) {
        Integer s = score == null ? 0 : score;
        if (s >= 90) return 'Critical';
        if (s >= 75) return 'High';
        if (s >= 50) return 'Medium';
        if (s >= 25) return 'Low';
        return 'Background';
    }

    // ----------------------------------------------------------- computation

    /**
     * Returns a normalized [0,1] input magnitude for a component. Sign is applied
     * by the component's Maximum_Contribution (negative for MITIGATION/SUPPRESSION).
     */
    private Decimal normalizedInput(String key, Directive_Work_Item__c wi,
                                    List<Directive_Signal__c> signals, Set<String> reasons) {
        if (key == BASE_RULE) {
            // Base priority anchored to severity; falls back to "has a rule" signal.
            if (wi.Severity__c == 'Critical') return 1;
            if (wi.Severity__c == 'High')     return 0.75;
            if (wi.Severity__c == 'Medium')   return 0.5;
            if (wi.Severity__c == 'Low')      return 0.25;
            return String.isNotBlank(wi.Rule_Key__c) ? 0.5 : 0;
        }
        if (key == URGENCY) {
            if (wi.Due_At__c == null) return 0;
            Decimal hours = hoursBetween(System.now(), wi.Due_At__c);
            if (hours <= 0)  return 1;      // overdue
            if (hours <= 2)  return 1;
            if (hours <= 24) return 0.5;
            if (hours <= 72) return 0.25;
            return 0;
        }
        if (key == BUSINESS_IMPACT) {
            if (wi.Business_Impact__c == null || wi.Business_Impact__c <= 0) return 0;
            // Linear ramp; $100k or more saturates the component.
            Decimal ratio = wi.Business_Impact__c / 100000;
            return ratio >= 1 ? 1 : ratio;
        }
        if (key == CUSTOMER_IMPORTANCE) {
            return reasons.contains('HIGH_VALUE_ACCOUNT') ? 1 : 0;
        }
        if (key == SLA_EXPOSURE) {
            if (reasons.contains('SLA_BREACH_IMMINENT')) return 1;
            for (Directive_Signal__c s : signals) {
                if (s.Signal_Type__c == 'SLA_Threshold') return 1;
            }
            return 0;
        }
        if (key == USER_RELEVANCE) {
            if (wi.Assigned_User__c == UserInfo.getUserId()) return 1;
            return wi.Assigned_User__c != null ? 0.4 : 0;
        }
        if (key == CONFIDENCE) {
            if (wi.Confidence__c == null) return 0;
            Decimal ratio = wi.Confidence__c / 100;
            if (ratio < 0) return 0;
            return ratio > 1 ? 1 : ratio;
        }
        if (key == ESCALATION) {
            if (reasons.contains('EXECUTIVE_ENGAGEMENT_GAP')) return 1;
            return wi.Type__c == 'Escalation' ? 1 : 0;
        }
        if (key == RECENCY) {
            if (wi.Detected_At__c == null) return 0;
            Decimal hours = hoursBetween(wi.Detected_At__c, System.now());
            if (hours <= 1)  return 1;
            if (hours <= 24) return 0.5;
            if (hours <= 72) return 0.25;
            return 0;
        }
        if (key == MITIGATION) {
            // A recovery/remediation is already in flight - de-prioritize.
            return reasons.contains('RECOVERY_ALREADY_SCHEDULED') ? 1 : 0;
        }
        if (key == SUPPRESSION) {
            // Snoozed or dismissed work should sink to the bottom.
            if (wi.Status__c == 'Snoozed' || wi.Status__c == 'Dismissed') return 1;
            if (wi.Snoozed_Until__c != null && wi.Snoozed_Until__c > System.now()) return 1;
            return 0;
        }
        return 0;
    }

    /** Decimal hours between two datetimes (to > from is positive). */
    private Decimal hoursBetween(Datetime fromDt, Datetime toDt) {
        Decimal ms = toDt.getTime() - fromDt.getTime();
        return ms / 3600000;
    }

    /** Parse the delimited Reason_Codes__c field into a set of codes. */
    private Set<String> reasonCodes(Directive_Work_Item__c wi) {
        Set<String> codes = new Set<String>();
        if (String.isBlank(wi.Reason_Codes__c)) {
            return codes;
        }
        for (String raw : wi.Reason_Codes__c.split('[,;\\n\\r\\t ]+')) {
            if (String.isNotBlank(raw)) {
                codes.add(raw.trim().toUpperCase());
            }
        }
        return codes;
    }

    /** Resolve the component config: test override, then CMDT, then code defaults. */
    private Map<String, Directive_Score_Component__mdt> getComponents() {
        if (componentOverride != null) {
            return componentOverride;
        }
        Map<String, Directive_Score_Component__mdt> configured = DirectiveConfigurationService.getScoreComponents();
        if (configured != null && !configured.isEmpty()) {
            return configured;
        }
        return defaultComponents();
    }

    /**
     * Code-level default weights, used only when no Custom Metadata is present.
     * Kept in lockstep with the seeded Directive_Score_Component__mdt records.
     */
    private Map<String, Directive_Score_Component__mdt> defaultComponents() {
        Map<String, Directive_Score_Component__mdt> m = new Map<String, Directive_Score_Component__mdt>();
        m.put(BASE_RULE,           component(BASE_RULE, 'Base rule priority', 40));
        m.put(URGENCY,             component(URGENCY, 'Urgency / time pressure', 12));
        m.put(BUSINESS_IMPACT,     component(BUSINESS_IMPACT, 'Revenue exposure', 25));
        m.put(CUSTOMER_IMPORTANCE, component(CUSTOMER_IMPORTANCE, 'Customer importance', 15));
        m.put(SLA_EXPOSURE,        component(SLA_EXPOSURE, 'SLA exposure', 20));
        m.put(USER_RELEVANCE,      component(USER_RELEVANCE, 'User relevance', 10));
        m.put(CONFIDENCE,          component(CONFIDENCE, 'Signal confidence', 10));
        m.put(ESCALATION,          component(ESCALATION, 'Escalation pressure', 10));
        m.put(RECENCY,             component(RECENCY, 'Recency', 8));
        m.put(MITIGATION,          component(MITIGATION, 'Recovery activity already scheduled', -15));
        m.put(SUPPRESSION,         component(SUPPRESSION, 'Suppression / snoozed', -30));
        return m;
    }

    private Directive_Score_Component__mdt component(String key, String label, Decimal max) {
        return new Directive_Score_Component__mdt(
            Calculation_Key__c = key,
            Component_Label__c = label,
            Weight__c = max,
            Maximum_Contribution__c = max,
            Calculation_Strategy__c = 'Apex',
            Active__c = true
        );
    }

    /** Orders breakdown lines by descending absolute contribution, then key. */
    public class ScoreLineComparator implements System.Comparator<ScoreLine> {
        public Integer compare(ScoreLine a, ScoreLine b) {
            Decimal aa = a.contribution.abs();
            Decimal bb = b.contribution.abs();
            if (aa > bb) return -1;
            if (aa < bb) return 1;
            return a.componentKey.compareTo(b.componentKey);
        }
    }
}
