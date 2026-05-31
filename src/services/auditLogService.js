/**
 * Immutable audit logging service implementing append-only log operations.
 * Logs include eventId (UUID), timestamp, userId, action, before/after values, and context.
 * Ensures PII is scrubbed from log entries before persistence.
 * Stores logs in localStorage via storageService.
 *
 * @module auditLogService
 */

import { v4 as uuidv4 } from 'uuid';
import { AUDIT_EVENTS } from '../constants/constants.js';
import * as storageService from './storageService.js';

/** @type {string} Storage key for audit logs */
const AUDIT_LOGS_KEY = 'audit_logs';

/**
 * Set of field names considered PII that must be scrubbed from log entries.
 * @type {Set<string>}
 */
const PII_FIELDS = new Set([
  'password',
  'ssn',
  'socialSecurityNumber',
  'fullAccountNumber',
  'accountNumber',
  'email',
  'phone',
  'dateOfBirth',
  'dob',
  'otp',
  'code',
  'token',
  'authToken',
]);

/**
 * Masks a string value for PII scrubbing.
 * Shows only the last 4 characters if the value is long enough, otherwise fully masks it.
 *
 * @param {string} value - The value to mask.
 * @returns {string} The masked value.
 */
function maskValue(value) {
  if (typeof value !== 'string') {
    return '***REDACTED***';
  }
  if (value.length <= 4) {
    return '****';
  }
  return `****${value.slice(-4)}`;
}

/**
 * Recursively scrubs PII fields from an object.
 * Returns a new object with PII fields masked. Does not mutate the original.
 *
 * @param {*} data - The data to scrub.
 * @returns {*} A new object with PII fields redacted.
 */
function scrubPii(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubPii(item));
  }

  const scrubbed = {};

  for (const [key, value] of Object.entries(data)) {
    if (PII_FIELDS.has(key)) {
      scrubbed[key] = maskValue(value);
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubPii(value);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/**
 * Retrieves all audit log entries from localStorage.
 *
 * @returns {Array<Object>} An array of audit log entries, ordered by insertion time.
 */
export function getLogs() {
  try {
    const logs = storageService.getItem(AUDIT_LOGS_KEY, []);
    return Array.isArray(logs) ? logs : [];
  } catch (error) {
    console.error('auditLogService.getLogs failed:', error);
    return [];
  }
}

/**
 * Retrieves audit log entries filtered by event type.
 *
 * @param {string} eventType - The event type to filter by (from AUDIT_EVENTS).
 * @returns {Array<Object>} An array of matching audit log entries.
 */
export function getLogsByEventType(eventType) {
  try {
    const logs = getLogs();
    return logs.filter((log) => log.action === eventType);
  } catch (error) {
    console.error('auditLogService.getLogsByEventType failed:', error);
    return [];
  }
}

/**
 * Retrieves audit log entries filtered by user ID.
 *
 * @param {string} userId - The user ID to filter by.
 * @returns {Array<Object>} An array of matching audit log entries.
 */
export function getLogsByUserId(userId) {
  try {
    const logs = getLogs();
    return logs.filter((log) => log.userId === userId);
  } catch (error) {
    console.error('auditLogService.getLogsByUserId failed:', error);
    return [];
  }
}

/**
 * Appends an immutable audit log entry to the log store.
 * PII is scrubbed from all detail fields before persistence.
 * Each entry receives a unique eventId (UUID) and ISO 8601 timestamp.
 *
 * @param {string} eventType - The type of event being logged (should be a value from AUDIT_EVENTS).
 * @param {Object} [details={}] - Additional details about the event.
 * @param {string} [details.userId] - The ID of the user performing the action.
 * @param {Object} [details.before] - The state before the action (for change tracking).
 * @param {Object} [details.after] - The state after the action (for change tracking).
 * @param {Object} [details.context] - Additional context information.
 * @returns {Object|null} The created log entry (with PII scrubbed), or null if logging failed.
 */
export function logEvent(eventType, details = {}) {
  try {
    if (!eventType || typeof eventType !== 'string') {
      console.error('auditLogService.logEvent: eventType is required and must be a string.');
      return null;
    }

    const scrubbedDetails = scrubPii(details);

    const logEntry = Object.freeze({
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: scrubbedDetails.userId || null,
      action: eventType,
      before: scrubbedDetails.before || null,
      after: scrubbedDetails.after || null,
      context: scrubbedDetails.context || null,
    });

    const logs = getLogs();
    logs.push(logEntry);

    const success = storageService.setItem(AUDIT_LOGS_KEY, logs);

    if (!success) {
      console.error('auditLogService.logEvent: Failed to persist log entry.');
      return null;
    }

    return logEntry;
  } catch (error) {
    console.error('auditLogService.logEvent failed:', error);
    return null;
  }
}

/**
 * Clears all audit logs from localStorage.
 * This operation is intended for development and testing purposes only.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clearLogs() {
  try {
    return storageService.setItem(AUDIT_LOGS_KEY, []);
  } catch (error) {
    console.error('auditLogService.clearLogs failed:', error);
    return false;
  }
}

const auditLogService = {
  logEvent,
  getLogs,
  getLogsByEventType,
  getLogsByUserId,
  clearLogs,
};

export default auditLogService;