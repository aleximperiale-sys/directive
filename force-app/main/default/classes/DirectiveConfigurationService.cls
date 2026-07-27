/**
 * DirectiveConfigurationService
 * ------------------------------
 * Read-through cache for all Custom Metadata driven configuration:
 * score components, action definitions, rules, personas and saved views.
 *
 * Custom Metadata is immutable at runtime and org-wide, so caching the query
 * results in static maps keeps every request within governor limits (a single
 * SOQL per type per transaction) while remaining bulk-safe.
 */
public with sharing class DirectiveConfigurationService {

    // Static, per-transaction caches. Keyed by their natural business key.
    private static Map<String, Directive_Score_Component__mdt> scoreComponentCache;
    private static Map<String, Directive_Action_Definition__mdt> actionDefinitionCache;
    private static Map<String, Directive_Rule__mdt> ruleCache;
    private static Map<String, Directive_Persona__mdt> personaCache;
    private static Map<String, Directive_View__mdt> viewCache;

    /** Active score components keyed by Calculation_Key__c (e.g. BASE_RULE). */
    public static Map<String, Directive_Score_Component__mdt> getScoreComponents() {
        if (scoreComponentCache == null) {
            scoreComponentCache = new Map<String, Directive_Score_Component__mdt>();
            for (Directive_Score_Component__mdt c : [
                SELECT DeveloperName, MasterLabel, Calculation_Key__c, Component_Label__c,
                       Weight__c, Maximum_Contribution__c, Calculation_Strategy__c, Active__c
                FROM Directive_Score_Component__mdt
            ]) {
                if (c.Active__c == true && String.isNotBlank(c.Calculation_Key__c)) {
                    scoreComponentCache.put(c.Calculation_Key__c, c);
                }
            }
        }
        return scoreComponentCache;
    }

    /** Action definitions keyed by Action_Key__c (e.g. SNOOZE_ITEM). */
    public static Map<String, Directive_Action_Definition__mdt> getActionDefinitions() {
        if (actionDefinitionCache == null) {
            actionDefinitionCache = new Map<String, Directive_Action_Definition__mdt>();
            for (Directive_Action_Definition__mdt d : [
                SELECT DeveloperName, MasterLabel, Action_Key__c, Label__c, Implementation_Type__c,
                       Implementation_Name__c, Confirmation_Required__c, Approval_Required__c,
                       Required_Custom_Permission__c, Supported_Object__c, Idempotent__c
                FROM Directive_Action_Definition__mdt
            ]) {
                if (String.isNotBlank(d.Action_Key__c)) {
                    actionDefinitionCache.put(d.Action_Key__c, d);
                }
            }
        }
        return actionDefinitionCache;
    }

    /** Rules keyed by DeveloperName. */
    public static Map<String, Directive_Rule__mdt> getRules() {
        if (ruleCache == null) {
            ruleCache = new Map<String, Directive_Rule__mdt>();
            for (Directive_Rule__mdt r : [
                SELECT DeveloperName, MasterLabel, Object__c, Evaluation_Type__c, Condition_Strategy__c,
                       Condition_Key__c, Threshold__c, Persona__c, Category__c, Severity__c,
                       Priority_Base__c, Active__c
                FROM Directive_Rule__mdt
            ]) {
                ruleCache.put(r.DeveloperName, r);
            }
        }
        return ruleCache;
    }

    /** Personas keyed by DeveloperName (e.g. Service_Operations). */
    public static Map<String, Directive_Persona__mdt> getPersonas() {
        if (personaCache == null) {
            personaCache = new Map<String, Directive_Persona__mdt>();
            for (Directive_Persona__mdt p : [
                SELECT DeveloperName, MasterLabel, Categories__c, Default_View__c, Allowed_Actions__c
                FROM Directive_Persona__mdt
            ]) {
                personaCache.put(p.DeveloperName, p);
            }
        }
        return personaCache;
    }

    /** Convenience single-persona lookup. */
    public static Directive_Persona__mdt getPersona(String developerName) {
        return getPersonas().get(developerName);
    }

    /** Saved views keyed by DeveloperName. */
    public static Map<String, Directive_View__mdt> getViews() {
        if (viewCache == null) {
            viewCache = new Map<String, Directive_View__mdt>();
            for (Directive_View__mdt v : [
                SELECT DeveloperName, MasterLabel, Persona__c, Filter_Definition__c, Sort__c, Shared__c
                FROM Directive_View__mdt
            ]) {
                viewCache.put(v.DeveloperName, v);
            }
        }
        return viewCache;
    }
}
