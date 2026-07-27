/**
 * DirectiveSignalScheduler
 * ------------------------
 * Schedulable wrapper around DirectiveSignalService.evaluateScheduled() so the
 * periodic (scheduled-channel) signal evaluation can run on a CRON schedule.
 *
 * Schedule from anonymous Apex, e.g. hourly:
 *   System.schedule(
 *     'Directive Signal Evaluation',
 *     '0 0 * * * ?',
 *     new DirectiveSignalScheduler());
 *
 * Kept intentionally thin: all detection logic lives in the service so it stays
 * unit-testable independent of the scheduler.
 */
public with sharing class DirectiveSignalScheduler implements Schedulable {
    /** Standard hourly CRON expression, provided for convenience. */
    public static final String CRON_HOURLY = '0 0 * * * ?';

    public void execute(SchedulableContext context) {
        DirectiveSignalService.evaluateScheduled();
    }

    /**
     * Convenience helper to schedule the job with a stable name.
     * @return the scheduled job Id.
     */
    public static Id schedule(String jobName, String cronExpression) {
        String name = String.isBlank(jobName) ? 'Directive Signal Evaluation' : jobName;
        String cron = String.isBlank(cronExpression) ? CRON_HOURLY : cronExpression;
        return System.schedule(name, cron, new DirectiveSignalScheduler());
    }
}
