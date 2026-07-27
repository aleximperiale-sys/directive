/**
 * DirectiveSignalService
 * ----------------------
 * Turns observed conditions (Signals) into deduplicated, scored Work Items.
 *
 * Flow:
 *   ingestSignal(input) -> upsert Signal by Dedupe_Key__c -> buildWorkItems(...)
 *   DirectiveSignalTrigger (after insert) -> buildWorkItems(...) for bulk loads
 *
 * Deduplication is the core guarantee: many signals that describe the SAME
 * underlying situation (same source record + rule) collapse onto ONE Work Item,
 * keyed by Directive_Work_Item__c.Dedupe_Key__c. Everything is bulk-safe.
 */
public with sharing class DirectiveSignalService {

    /**
     * Recursion / re-entrancy guard. When ingestSignal drives the DML itself it
     * builds Work Items directly, so the trigger must not build them again.
     */
    @TestVisible
    public static Boolean bypassTrigger = false;

    /** Structured input for a single ingested signal (used by the UI / Agentforce). */
    public class SignalInput {
        @AuraEnabled public String signalType;
        @AuraEnabled public String sourceRecordId;
        @AuraEnabled public String sourceObject;
        @AuraEnabled public Datetime occurredAt;
        @AuraEnabled public String rawValue;
        @AuraEnabled public Decimal normalizedValue;
        @AuraEnabled public String ruleKey;
        @AuraEnabled public Decimal confidence;
        @AuraEnabled public String dedupeKey;
        // Optional Work Item hints carried through onto the resulting item.
        @AuraEnabled public String title;
        @AuraEnabled public String category;
        @AuraEnabled public String severity;
        @AuraEnabled public Decimal businessImpact;
        @AuraEnabled public String reasonCodes;
        @AuraEnabled public Datetime dueAt;
    }

    /**
     * Ingest a single signal: upsert by dedupe key, then (re)build the Work Item.
     */
    public static Directive_Signal__c ingestSignal(SignalInput input) {
        if (input == null || String.isBlank(input.dedupeKey)) {
            throw new DirectiveException('Signal dedupeKey is required.');
        }
        Directive_Signal__c sig = toSignal(input);

        Boolean prior = bypassTrigger;
        try {
            bypassTrigger = true; // we drive the Work Item build ourselves
            Database.upsert(sig, Directive_Signal__c.Dedupe_Key__c, true);
            buildWorkItems(new List<Directive_Signal__c>{ sig }, input);
        } finally {
            bypassTrigger = prior;
        }
        return sig;
    }

    /**
     * Scheduled evaluation stub: find open, high-priority Cases nearing an SLA and
     * emit SLA_Threshold signals. Kept bulk-safe and idempotent via dedupe keys.
     * @return number of signals created/updated.
     */
    public static Integer evaluateScheduled() {
        List<Directive_Signal__c> signals = new List<Directive_Signal__c>();
        for (Case c : [
            SELECT Id, CaseNumber, Subject, Priority, Status, CreatedDate
            FROM Case
            WHERE IsClosed = false AND Priority = 'High'
            WITH USER_MODE
            ORDER BY CreatedDate ASC
            LIMIT 200
        ]) {
            SignalInput input = new SignalInput();
            input.signalType = 'SLA_Threshold';
            input.sourceRecordId = c.Id;
            input.sourceObject = 'Case';
            input.occurredAt = System.now();
            input.ruleKey = 'SLA_THRESHOLD';
            input.confidence = 90;
            input.severity = 'High';
            input.category = 'Service';
            input.title = 'SLA risk: ' + (c.Subject == null ? c.CaseNumber : c.Subject);
            input.reasonCodes = 'SLA_BREACH_IMMINENT';
            input.dedupeKey = 'Case:' + c.Id + ':SLA_THRESHOLD';
            signals.add(toSignal(input));
        }
        if (signals.isEmpty()) {
            return 0;
        }
        // Let the trigger build the Work Items for this bulk path.
        Database.upsert(signals, Directive_Signal__c.Dedupe_Key__c, false);
        return signals.size();
    }

    /**
     * Build/refresh Work Items for a batch of signals. Called by the trigger and
     * (with explicit hints) by ingestSignal. Idempotent: upserts by dedupe key.
     */
    public static void buildWorkItems(List<Directive_Signal__c> signals) {
        buildWorkItems(signals, null);
    }

    public static void buildWorkItems(List<Directive_Signal__c> signals, SignalInput hints) {
        if (signals == null || signals.isEmpty()) {
            return;
        }

        // Collapse signals onto their Work Item dedupe keys (last signal wins).
        Map<String, Directive_Signal__c> byWorkKey = new Map<String, Directive_Signal__c>();
        for (Directive_Signal__c s : signals) {
            byWorkKey.put(workItemDedupeKey(s), s);
        }

        // Load any existing Work Items for those keys.
        Map<String, Directive_Work_Item__c> existing = new Map<String, Directive_Work_Item__c>();
        for (Directive_Work_Item__c wi : [
            SELECT Id, Dedupe_Key__c, Title__c, Type__c, Category__c, Status__c, Severity__c,
                   Priority_Score__c, Rule_Key__c, Source_Record_Id__c, Source_Object__c,
                   Confidence__c, Business_Impact__c, Reason_Codes__c, Explanation__c,
                   Assigned_User__c, Detected_At__c, Due_At__c, Snoozed_Until__c, Version__c
            FROM Directive_Work_Item__c
            WHERE Dedupe_Key__c IN :byWorkKey.keySet()
        ]) {
            existing.put(wi.Dedupe_Key__c, wi);
        }

        DirectivePriorityService priority = new DirectivePriorityService();
        List<Directive_Work_Item__c> toUpsert = new List<Directive_Work_Item__c>();

        for (String workKey : byWorkKey.keySet()) {
            Directive_Signal__c s = byWorkKey.get(workKey);
            Directive_Work_Item__c wi = existing.get(workKey);
            if (wi == null) {
                wi = new Directive_Work_Item__c(
                    Dedupe_Key__c = workKey,
                    Status__c = 'New',
                    Detected_At__c = s.Occurred_At__c == null ? System.now() : s.Occurred_At__c
                );
            }

            // Carry signal facts onto the Work Item.
            wi.Rule_Key__c = s.Rule_Key__c;
            wi.Source_Record_Id__c = s.Source_Record_Id__c;
            wi.Source_Object__c = s.Source_Object__c;
            wi.Confidence__c = s.Confidence__c;
            wi.Type__c = mapSignalToType(s.Signal_Type__c);
            wi.Last_Evaluated_At__c = System.now();

            // Apply optional hints (ingestSignal) or sensible defaults.
            if (hints != null) {
                if (String.isNotBlank(hints.title))       wi.Title__c = hints.title;
                if (String.isNotBlank(hints.category))    wi.Category__c = hints.category;
                if (String.isNotBlank(hints.severity))    wi.Severity__c = hints.severity;
                if (hints.businessImpact != null)         wi.Business_Impact__c = hints.businessImpact;
                if (String.isNotBlank(hints.reasonCodes)) wi.Reason_Codes__c = hints.reasonCodes;
                if (hints.dueAt != null)                  wi.Due_At__c = hints.dueAt;
            }
            if (String.isBlank(wi.Title__c)) {
                wi.Title__c = mapSignalToType(s.Signal_Type__c) + ' on ' +
                    (String.isBlank(s.Source_Object__c) ? 'record' : s.Source_Object__c);
            }
            if (String.isBlank(wi.Category__c)) wi.Category__c = 'Service';
            if (String.isBlank(wi.Severity__c)) wi.Severity__c = defaultSeverity(s.Signal_Type__c);
            if (String.isBlank(wi.Reason_Codes__c)) wi.Reason_Codes__c = defaultReasonCode(s.Signal_Type__c);

            // Score + explain deterministically.
            List<Directive_Signal__c> ctx = new List<Directive_Signal__c>{ s };
            DirectivePriorityService.PriorityResult result = priority.score(wi, ctx);
            wi.Priority_Score__c = result.total;
            wi.Explanation__c = priority.explain(wi, ctx);
            wi.Version__c = wi.Version__c == null ? 1 : wi.Version__c + 1;

            toUpsert.add(wi);
        }

        Database.upsert(toUpsert, Directive_Work_Item__c.Dedupe_Key__c, true);

        // Link the signals back to their Work Items and mark them processed.
        Map<String, Id> keyToWorkId = new Map<String, Id>();
        for (Directive_Work_Item__c wi : toUpsert) {
            keyToWorkId.put(wi.Dedupe_Key__c, wi.Id);
        }
        List<Directive_Signal__c> signalUpdates = new List<Directive_Signal__c>();
        for (Directive_Signal__c s : signals) {
            Id workId = keyToWorkId.get(workItemDedupeKey(s));
            if (workId != null && s.Id != null) {
                signalUpdates.add(new Directive_Signal__c(
                    Id = s.Id,
                    Work_Item__c = workId,
                    Processing_Status__c = 'Processed'
                ));
            }
        }
        if (!signalUpdates.isEmpty()) {
            // after-insert only trigger, so this update does not re-enter.
            Database.update(signalUpdates, true);
        }
    }

    // -------------------------------------------------------------- helpers

    private static Directive_Signal__c toSignal(SignalInput input) {
        return new Directive_Signal__c(
            Signal_Type__c = input.signalType,
            Source_Record_Id__c = input.sourceRecordId,
            Source_Object__c = input.sourceObject,
            Occurred_At__c = input.occurredAt == null ? System.now() : input.occurredAt,
            Raw_Value__c = input.rawValue,
            Normalized_Value__c = input.normalizedValue,
            Rule_Key__c = input.ruleKey,
            Confidence__c = input.confidence,
            Processing_Status__c = 'Pending',
            Dedupe_Key__c = input.dedupeKey
        );
    }

    /**
     * Derive the Work Item dedupe key. Signals about the same source record + rule
     * collapse onto one Work Item; otherwise fall back to the signal dedupe key.
     */
    @TestVisible
    private static String workItemDedupeKey(Directive_Signal__c s) {
        if (String.isNotBlank(s.Source_Object__c) && String.isNotBlank(s.Source_Record_Id__c)) {
            return s.Source_Object__c + ':' + s.Source_Record_Id__c + ':' +
                (String.isBlank(s.Rule_Key__c) ? 'DEFAULT' : s.Rule_Key__c);
        }
        return 'SIG:' + s.Dedupe_Key__c;
    }

    private static String mapSignalToType(String signalType) {
        if (signalType == 'SLA_Threshold') return 'SLA_Risk';
        if (signalType == 'No_Activity') return 'Critical_Case';
        if (signalType == 'Case_Priority_Change') return 'Escalation';
        if (signalType == 'Repeated_Response') return 'Repeated_Response';
        if (signalType == 'Agent_Failure') return 'Agent_Failure';
        if (signalType == 'Routing_Anomaly') return 'Routing_Anomaly';
        if (signalType == 'Knowledge_Retrieval_Failure') return 'Knowledge_Gap';
        if (signalType == 'Approval_Submitted') return 'Approval';
        return 'SLA_Risk';
    }

    private static String defaultSeverity(String signalType) {
        if (signalType == 'Agent_Failure' || signalType == 'Case_Priority_Change') return 'Critical';
        if (signalType == 'SLA_Threshold' || signalType == 'Repeated_Response') return 'High';
        return 'Medium';
    }

    private static String defaultReasonCode(String signalType) {
        if (signalType == 'SLA_Threshold') return 'SLA_BREACH_IMMINENT';
        if (signalType == 'No_Activity') return 'NO_OWNER_ACTION';
        if (signalType == 'Repeated_Response') return 'REPEATED_CUSTOMER_RESPONSE';
        if (signalType == 'Agent_Failure') return 'AGENT_FAILURE';
        if (signalType == 'Knowledge_Retrieval_Failure') return 'KNOWLEDGE_GAP';
        return '';
    }
}
