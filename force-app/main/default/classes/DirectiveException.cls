/**
 * Directive - shared checked exception used across the service layer so the UI
 * receives a clean, actionable message (permission denied, unknown action, etc.).
 */
public with sharing class DirectiveException extends Exception {}
