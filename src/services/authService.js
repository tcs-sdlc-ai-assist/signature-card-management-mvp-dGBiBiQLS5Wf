/**
 * Mock authentication service providing login, logout, session management,
 * failed attempt tracking, and account lockout enforcement.
 * All events are logged via auditLogService.
 *
 * @module authService
 */

import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS, AUDIT_EVENTS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import { getMockUsers } from '../data/mockData.js';
import config from '../config.js';

/**
 * Retrieves the current failed login attempt count for a given username.
 *
 * @param {string} [username] - The username to check. If not provided, returns the global attempt count.
 * @returns {number} The number of failed login attempts.
 */
export function getFailedAttempts(username) {
  try {
    const attemptsData = storageService.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS, {});

    if (username) {
      return typeof attemptsData === 'object' && attemptsData !== null
        ? (attemptsData[username] || 0)
        : 0;
    }

    // Legacy support: if stored as a plain number
    if (typeof attemptsData === 'number') {
      return attemptsData;
    }

    return 0;
  } catch (error) {
    console.error('authService.getFailedAttempts failed:', error);
    return 0;
  }
}

/**
 * Sets the failed login attempt count for a given username.
 *
 * @param {string} username - The username to set attempts for.
 * @param {number} count - The number of failed attempts.
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
function setFailedAttempts(username, count) {
  try {
    const attemptsData = storageService.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS, {});
    const data = typeof attemptsData === 'object' && attemptsData !== null ? attemptsData : {};
    data[username] = count;
    return storageService.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, data);
  } catch (error) {
    console.error('authService.setFailedAttempts failed:', error);
    return false;
  }
}

/**
 * Checks whether a given username is locked out due to exceeding the maximum
 * number of failed login attempts.
 *
 * @param {string} username - The username to check.
 * @returns {boolean} True if the account is locked, false otherwise.
 */
export function isLocked(username) {
  if (!username) {
    return false;
  }

  const attempts = getFailedAttempts(username);
  return attempts >= config.login.maxAttempts;
}

/**
 * Checks whether the current session is authenticated.
 * Validates that both an auth token and user object exist in storage,
 * and that the session has not expired.
 *
 * @returns {boolean} True if the user is authenticated, false otherwise.
 */
export function isAuthenticated() {
  try {
    const token = storageService.getItem(STORAGE_KEYS.AUTH_TOKEN, null);
    const user = storageService.getItem(STORAGE_KEYS.USER, null);
    const sessionTimestamp = storageService.getItem(STORAGE_KEYS.SESSION_TIMESTAMP, null);

    if (!token || !user) {
      return false;
    }

    if (sessionTimestamp) {
      const elapsed = Date.now() - sessionTimestamp;
      if (elapsed > config.session.timeoutMs) {
        // Session expired — clean up
        storageService.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        storageService.removeItem(STORAGE_KEYS.USER);
        storageService.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);

        auditLogService.logEvent(AUDIT_EVENTS.SESSION_EXPIRED, {
          userId: user.id,
          context: { reason: 'Session timeout exceeded' },
        });

        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('authService.isAuthenticated failed:', error);
    return false;
  }
}

/**
 * Retrieves the currently authenticated user from storage.
 *
 * @returns {Object|null} The user profile object, or null if not authenticated.
 */
export function getCurrentUser() {
  try {
    if (!isAuthenticated()) {
      return null;
    }
    return storageService.getItem(STORAGE_KEYS.USER, null);
  } catch (error) {
    console.error('authService.getCurrentUser failed:', error);
    return null;
  }
}

/**
 * Authenticates a user with the provided username and password.
 * Validates credentials against mock fixture data, tracks failed attempts,
 * enforces account lockout, and creates a session token on success.
 *
 * @param {string} username - The username to authenticate.
 * @param {string} password - The password to authenticate.
 * @returns {Object} Result object with shape { success: boolean, user?: Object, token?: string, error?: string, attemptsRemaining?: number }.
 */
export function login(username, password) {
  try {
    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required.',
      };
    }

    // Check if account is locked
    if (isLocked(username)) {
      auditLogService.logEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        userId: null,
        context: {
          username,
          reason: 'Account locked due to too many failed attempts',
        },
      });

      return {
        success: false,
        error: 'Your account has been locked due to too many failed login attempts. Please contact support.',
        locked: true,
      };
    }

    // Find user in mock data
    const users = getMockUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    // Invalid username
    if (!user) {
      const newAttempts = getFailedAttempts(username) + 1;
      setFailedAttempts(username, newAttempts);

      const attemptsRemaining = Math.max(0, config.login.maxAttempts - newAttempts);

      auditLogService.logEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        userId: null,
        context: {
          username,
          reason: 'Invalid username',
          attemptNumber: newAttempts,
        },
      });

      if (newAttempts >= config.login.maxAttempts) {
        return {
          success: false,
          error: 'Your account has been locked due to too many failed login attempts. Please contact support.',
          locked: true,
          attemptsRemaining: 0,
        };
      }

      return {
        success: false,
        error: 'The username or password you entered is incorrect. Please try again.',
        attemptsRemaining,
      };
    }

    // Check if user is locked in mock data
    if (user.locked) {
      auditLogService.logEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        userId: user.id,
        context: {
          username,
          reason: 'Account is locked in user record',
        },
      });

      return {
        success: false,
        error: 'Your account has been locked due to too many failed login attempts. Please contact support.',
        locked: true,
      };
    }

    // Invalid password
    if (user.password !== password) {
      const newAttempts = getFailedAttempts(username) + 1;
      setFailedAttempts(username, newAttempts);

      const attemptsRemaining = Math.max(0, config.login.maxAttempts - newAttempts);

      auditLogService.logEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        userId: user.id,
        context: {
          username,
          reason: 'Invalid password',
          attemptNumber: newAttempts,
        },
      });

      if (newAttempts >= config.login.maxAttempts) {
        return {
          success: false,
          error: 'Your account has been locked due to too many failed login attempts. Please contact support.',
          locked: true,
          attemptsRemaining: 0,
        };
      }

      return {
        success: false,
        error: 'The username or password you entered is incorrect. Please try again.',
        attemptsRemaining,
      };
    }

    // Successful login — reset failed attempts
    setFailedAttempts(username, 0);

    // Create session token
    const token = uuidv4();

    // Build safe user profile (exclude password)
    const { password: _pw, ...userProfile } = user;

    // Persist session data
    storageService.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    storageService.setItem(STORAGE_KEYS.USER, userProfile);
    storageService.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now());

    auditLogService.logEvent(AUDIT_EVENTS.LOGIN, {
      userId: user.id,
      context: {
        username,
        role: user.role,
      },
    });

    return {
      success: true,
      user: userProfile,
      token,
    };
  } catch (error) {
    console.error('authService.login failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
    };
  }
}

/**
 * Logs out the current user by clearing all session data from storage.
 *
 * @returns {boolean} True if the logout succeeded, false otherwise.
 */
export function logout() {
  try {
    const user = storageService.getItem(STORAGE_KEYS.USER, null);

    storageService.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    storageService.removeItem(STORAGE_KEYS.USER);
    storageService.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);

    auditLogService.logEvent(AUDIT_EVENTS.LOGOUT, {
      userId: user ? user.id : null,
      context: { reason: 'User initiated logout' },
    });

    return true;
  } catch (error) {
    console.error('authService.logout failed:', error);
    return false;
  }
}

/**
 * Refreshes the session timestamp to extend the session.
 *
 * @returns {boolean} True if the session was refreshed, false otherwise.
 */
export function refreshSession() {
  try {
    if (!isAuthenticated()) {
      return false;
    }
    return storageService.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now());
  } catch (error) {
    console.error('authService.refreshSession failed:', error);
    return false;
  }
}

/**
 * Returns the remaining time in milliseconds before the session expires.
 *
 * @returns {number|null} Remaining time in milliseconds, or null if not authenticated.
 */
export function getSessionTimeRemaining() {
  try {
    if (!isAuthenticated()) {
      return null;
    }

    const sessionTimestamp = storageService.getItem(STORAGE_KEYS.SESSION_TIMESTAMP, null);

    if (!sessionTimestamp) {
      return null;
    }

    const elapsed = Date.now() - sessionTimestamp;
    const remaining = config.session.timeoutMs - elapsed;

    return Math.max(0, remaining);
  } catch (error) {
    console.error('authService.getSessionTimeRemaining failed:', error);
    return null;
  }
}

const authService = {
  login,
  logout,
  isAuthenticated,
  getCurrentUser,
  getFailedAttempts,
  isLocked,
  refreshSession,
  getSessionTimeRemaining,
};

export default authService;