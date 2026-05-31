/**
 * Custom React hook wrapping auditLogService for convenient use in components.
 * Provides logEvent(eventType, details) and getLogs() with automatic userId
 * injection from the current authenticated session context.
 *
 * @module useAuditLog
 */

import { useCallback } from 'react';
import * as auditLogService from '../services/auditLogService.js';
import * as authService from '../services/authService.js';

/**
 * Custom React hook for audit logging with automatic userId injection.
 * Wraps auditLogService methods and injects the current authenticated user's ID
 * into every log entry automatically.
 *
 * @returns {Object} Audit logging methods.
 * @returns {function} return.logEvent - Logs an audit event with automatic userId injection. Signature: (eventType: string, details?: Object) => Object|null.
 * @returns {function} return.getLogs - Retrieves all audit log entries. Signature: () => Array<Object>.
 * @returns {function} return.getLogsByEventType - Retrieves logs filtered by event type. Signature: (eventType: string) => Array<Object>.
 * @returns {function} return.getLogsByUserId - Retrieves logs filtered by user ID. Signature: (userId: string) => Array<Object>.
 * @returns {function} return.getMyLogs - Retrieves logs for the current authenticated user. Signature: () => Array<Object>.
 */
export function useAuditLog() {
  /**
   * Logs an audit event with automatic userId injection from the current session.
   * If the details object does not include a userId, the current authenticated
   * user's ID is injected automatically.
   *
   * @param {string} eventType - The type of event being logged (should be a value from AUDIT_EVENTS).
   * @param {Object} [details={}] - Additional details about the event.
   * @param {string} [details.userId] - Optional explicit userId (overrides automatic injection).
   * @param {Object} [details.before] - The state before the action (for change tracking).
   * @param {Object} [details.after] - The state after the action (for change tracking).
   * @param {Object} [details.context] - Additional context information.
   * @returns {Object|null} The created log entry (with PII scrubbed), or null if logging failed.
   */
  const logEvent = useCallback((eventType, details = {}) => {
    const currentUser = authService.getCurrentUser();
    const enrichedDetails = {
      ...details,
    };

    if (!enrichedDetails.userId && currentUser) {
      enrichedDetails.userId = currentUser.id;
    }

    return auditLogService.logEvent(eventType, enrichedDetails);
  }, []);

  /**
   * Retrieves all audit log entries from storage.
   *
   * @returns {Array<Object>} An array of audit log entries.
   */
  const getLogs = useCallback(() => {
    return auditLogService.getLogs();
  }, []);

  /**
   * Retrieves audit log entries filtered by event type.
   *
   * @param {string} eventType - The event type to filter by (from AUDIT_EVENTS).
   * @returns {Array<Object>} An array of matching audit log entries.
   */
  const getLogsByEventType = useCallback((eventType) => {
    return auditLogService.getLogsByEventType(eventType);
  }, []);

  /**
   * Retrieves audit log entries filtered by user ID.
   *
   * @param {string} userId - The user ID to filter by.
   * @returns {Array<Object>} An array of matching audit log entries.
   */
  const getLogsByUserId = useCallback((userId) => {
    return auditLogService.getLogsByUserId(userId);
  }, []);

  /**
   * Retrieves audit log entries for the currently authenticated user.
   * Returns an empty array if no user is authenticated.
   *
   * @returns {Array<Object>} An array of audit log entries for the current user.
   */
  const getMyLogs = useCallback(() => {
    const currentUser = authService.getCurrentUser();

    if (!currentUser || !currentUser.id) {
      return [];
    }

    return auditLogService.getLogsByUserId(currentUser.id);
  }, []);

  return {
    logEvent,
    getLogs,
    getLogsByEventType,
    getLogsByUserId,
    getMyLogs,
  };
}

export default useAuditLog;