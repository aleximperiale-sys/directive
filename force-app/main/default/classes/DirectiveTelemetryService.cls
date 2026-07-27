/**
 * DirectiveTelemetryService
 * -------------------------
 * Fire-and-forget observability publisher. The service layer calls this to emit
 * a Directive_Telemetry__e platform event (action runs, latencies, errors) so a
 * subscriber can aggregate metrics or forward them to an external observability
 * platform WITHOUT blocking the user interface.
 *
 * Telemetry must never break the primary operation: every publish path swallows
 * its own exceptions. Callers should not have to try/catch around it.
 */
public with sharing class DirectiveTelemetryService {
    /** Structured telemetry payload. All fields optional except eventType. */
    public class Event {
        public String eventType;
        public String correlationId;
        public Id workItemId;
        public Id actionRunId;
        public Integer durationMs;
        public String result;
        public String errorCode;
        public String metadataJson;
    }

    /**
     * Publish a fully-specified telemetry event. Never throws.
     * @return true if the event was queued for publish, false if it was skipped.
     */
    public static Boolean publish(Event ev) {
        if (ev == null || String.isBlank(ev.eventType)) {
            return false;
        }
        try {
            Directive_Telemetry__e e = new Directive_Telemetry__e(
                Event_Type__c = ev.eventType,
                User_Id__c = UserInfo.getUserId(),
                Session_Id__c = safeSessionId(),
                Correlation_Id__c = ev.correlationId,
                Work_Item_Id__c = ev.workItemId,
                Action_Run_Id__c = ev.actionRunId,
                Duration_Ms__c = ev.durationMs,
                Result__c = ev.result,
                Error_Code__c = ev.errorCode,
                Metadata__c = ev.metadataJson,
                Occurred_At__c = System.now()
            );
            EventBus.publish(e);
            return true;
        } catch (Exception ex) {
            System.debug(LoggingLevel.WARN, 'Directive telemetry publish failed: ' + ex.getMessage());
            return false;
        }
    }

    /**
     * Convenience publisher for the most common shape: an action run result.
     * Never throws.
     */
    public static void emitActionRun(
        String correlationId,
        Id workItemId,
        Id actionRunId,
        String result,
        String errorCode,
        Integer durationMs
    ) {
        Event ev = new Event();
        ev.eventType = 'ACTION_EXECUTED';
        ev.correlationId = correlationId;
        ev.workItemId = workItemId;
        ev.actionRunId = actionRunId;
        ev.result = result;
        ev.errorCode = errorCode;
        ev.durationMs = durationMs;
        publish(ev);
    }

    /** getSessionId throws in some async contexts; degrade gracefully. */
    private static String safeSessionId() {
        try {
            return UserInfo.getSessionId();
        } catch (Exception ex) {
            return null;
        }
    }
}
