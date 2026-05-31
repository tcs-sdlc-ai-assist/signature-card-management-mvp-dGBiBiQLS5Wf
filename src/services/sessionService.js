/**
 * Session lifecycle management service.
 * Provides session creation, validation, invalidation, extension, and timeout checking.
 * Implements configurable inactivity timeout with warning threshold.
 * Tracks lastActivity timestamp and clears sensitive data on session expiration.
 *
 * @module sessionService
 */

import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS, AUDIT_EVENTS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import config from '../config.js';

/** @type {string} Storage key for last activity timestamp */
const LAST_ACTIVITY_KEY = 'last_activity';

/**
 * Creates a new session for the given user.
 * Generates a session token, persists user profile and timestamps to storage.
 *
 * @param {Object} user - The user profile object (should not contain password).
 * @returns {Object} Result object with shape { success: boolean, token?: string, error?: string }.
 */
export function createSession(user) {
  try {
    if (!user || !user.id) {
      return {
        success: false,
        error: 'A valid user object with an id is required to create a session.',
      };
    }

    const token = uuidv4();
    const now = Date.now();

    storageService.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    storageService.setItem(STORAGE_KEYS.USER, user);
    storageService.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, now);
    storageService.setItem(LAST_ACTIVITY_KEY, now);

    auditLogService.logEvent(AUDIT_EVENTS.LOGIN, {
      userId: user.id,
      context: {
        reason: 'Session created',
        role: user.role || null,
      },
    });

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('sessionService.createSession failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the session.',
    };
  }
}

/**
 * Validates the current session.
 * Checks that a token, user, and session timestamp exist and that the session
 * has not exceeded the configured inactivity timeout.
 *
 * @returns {Object} Result object with shape { valid: boolean, user?: Object, reason?: string, warning?: boolean, timeRemaining?: number }.
 */
export function validateSession() {
  try {
    const token = storageService.getItem(STORAGE_KEYS.AUTH_TOKEN, null);
    const user = storageService.getItem(STORAGE_KEYS.USER, null);
    const sessionTimestamp = storageService.getItem(STORAGE_KEYS.SESSION_TIMESTAMP, null);
    const lastActivity = storageService.getItem(LAST_ACTIVITY_KEY, null);

    if (!token || !user || !sessionTimestamp) {
      return {
        valid: false,
        reason: 'No active session found.',
      };
    }

    const now = Date.now();
    const activityTimestamp = lastActivity || sessionTimestamp;
    const elapsed = now - activityTimestamp;
    const timeoutMs = config.session.timeoutMs;
    const warningMs = config.session.warningMs;
    const timeRemaining = Math.max(0, timeoutMs - elapsed);

    if (elapsed >= timeoutMs) {
      // Session has expired — clean up
      invalidateSession('Session timeout exceeded');

      return {
        valid: false,
        reason: 'Session has expired due to inactivity.',
        timeRemaining: 0,
      };
    }

    const warning = timeRemaining <= warningMs;

    return {
      valid: true,
      user,
      warning,
      timeRemaining,
    };
  } catch (error) {
    console.error('sessionService.validateSession failed:', error);
    return {
      valid: false,
      reason: 'An unexpected error occurred while validating the session.',
    };
  }
}

/**
 * Invalidates the current session by clearing all session-related data from storage.
 * Logs the session invalidation event via auditLogService.
 *
 * @param {string} [reason='User initiated logout'] - The reason for invalidation.
 * @returns {boolean} True if the session was successfully invalidated, false otherwise.
 */
export function invalidateSession(reason = 'User initiated logout') {
  try {
    const user = storageService.getItem(STORAGE_KEYS.USER, null);
    const userId = user ? user.id : null;

    storageService.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    storageService.removeItem(STORAGE_KEYS.USER);
    storageService.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    storageService.removeItem(LAST_ACTIVITY_KEY);
    storageService.removeItem(STORAGE_KEYS.OTP_TIMESTAMP);
    storageService.removeItem(STORAGE_KEYS.OTP_ATTEMPTS);

    const isTimeout = reason !== 'User initiated logout';
    const eventType = isTimeout ? AUDIT_EVENTS.SESSION_EXPIRED : AUDIT_EVENTS.LOGOUT;

    auditLogService.logEvent(eventType, {
      userId,
      context: { reason },
    });

    return true;
  } catch (error) {
    console.error('sessionService.invalidateSession failed:', error);
    return false;
  }
}

/**
 * Extends the current session by updating the last activity timestamp.
 * Only extends if the session is currently valid.
 *
 * @returns {boolean} True if the session was extended, false otherwise.
 */
export function extendSession() {
  try {
    const validation = validateSession();

    if (!validation.valid) {
      return false;
    }

    const now = Date.now();
    storageService.setItem(LAST_ACTIVITY_KEY, now);
    storageService.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, now);

    return true;
  } catch (error) {
    console.error('sessionService.extendSession failed:', error);
    return false;
  }
}

/**
 * Retrieves the current session token from storage.
 *
 * @returns {string|null} The session token, or null if no active session exists.
 */
export function getSessionToken() {
  try {
    const validation = validateSession();

    if (!validation.valid) {
      return null;
    }

    return storageService.getItem(STORAGE_KEYS.AUTH_TOKEN, null);
  } catch (error) {
    console.error('sessionService.getSessionToken failed:', error);
    return null;
  }
}

/**
 * Checks the current session for timeout status.
 * Returns detailed information about the session's timeout state,
 * including whether a warning should be displayed.
 *
 * @returns {Object} Result object with shape { expired: boolean, warning: boolean, timeRemaining: number|null, lastActivity: number|null }.
 */
export function checkTimeout() {
  try {
    const token = storageService.getItem(STORAGE_KEYS.AUTH_TOKEN, null);
    const sessionTimestamp = storageService.getItem(STORAGE_KEYS.SESSION_TIMESTAMP, null);
    const lastActivity = storageService.getItem(LAST_ACTIVITY_KEY, null);

    if (!token || !sessionTimestamp) {
      return {
        expired: true,
        warning: false,
        timeRemaining: null,
        lastActivity: null,
      };
    }

    const now = Date.now();
    const activityTimestamp = lastActivity || sessionTimestamp;
    const elapsed = now - activityTimestamp;
    const timeoutMs = config.session.timeoutMs;
    const warningMs = config.session.warningMs;
    const timeRemaining = Math.max(0, timeoutMs - elapsed);

    if (elapsed >= timeoutMs) {
      invalidateSession('Session timeout exceeded');

      return {
        expired: true,
        warning: false,
        timeRemaining: 0,
        lastActivity: activityTimestamp,
      };
    }

    const warning = timeRemaining <= warningMs;

    return {
      expired: false,
      warning,
      timeRemaining,
      lastActivity: activityTimestamp,
    };
  } catch (error) {
    console.error('sessionService.checkTimeout failed:', error);
    return {
      expired: true,
      warning: false,
      timeRemaining: null,
      lastActivity: null,
    };
  }
}

const sessionService = {
  createSession,
  validateSession,
  invalidateSession,
  extendSession,
  getSessionToken,
  checkTimeout,
};

export default sessionService;