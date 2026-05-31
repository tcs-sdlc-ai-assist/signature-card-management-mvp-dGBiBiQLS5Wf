/**
 * eSign confirmation token validation service.
 * Provides token capture from URL parameters, validation against authenticated user,
 * expiration enforcement, and status transitions (pending → confirmed).
 * All events are logged via auditLogService.
 *
 * @module tokenService
 */

import { STORAGE_KEYS, AUDIT_EVENTS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import { getMockESignTokens } from '../data/mockData.js';
import config from '../config.js';

/** @type {string} Storage key for captured eSign token */
const CAPTURED_TOKEN_KEY = 'esign_captured_token';

/** @type {string} Storage key for eSign token status */
const TOKEN_STATUS_KEY = 'esign_token_status';

/** @type {string} Storage key for mock eSign tokens in localStorage */
const MOCK_ESIGN_TOKENS_KEY = 'sig_mock_esign_tokens';

/**
 * Token status values.
 * @enum {string}
 */
export const TOKEN_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  EXPIRED: 'EXPIRED',
  INVALID: 'INVALID',
};

/**
 * Default token expiry in milliseconds (72 hours).
 * Uses config.token.expiryHours if available, otherwise defaults to 72 hours.
 * @type {number}
 */
const TOKEN_EXPIRY_MS = (config.token.expiryHours || 72) * 60 * 60 * 1000;

/**
 * Captures an eSign token from URL search parameters.
 * Extracts the token value and persists it for subsequent validation.
 *
 * @param {URLSearchParams|string} urlParams - The URL search parameters or query string containing the token.
 * @returns {Object} Result object with shape { success: boolean, token?: string, error?: string }.
 */
export function captureToken(urlParams) {
  try {
    if (!urlParams) {
      return {
        success: false,
        error: 'URL parameters are required.',
      };
    }

    let params;
    if (typeof urlParams === 'string') {
      params = new URLSearchParams(urlParams);
    } else if (urlParams instanceof URLSearchParams) {
      params = urlParams;
    } else {
      return {
        success: false,
        error: 'Invalid URL parameters format. Expected URLSearchParams or string.',
      };
    }

    const token = params.get('token') || params.get('esign_token') || params.get('t');

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        success: false,
        error: 'No eSign token found in URL parameters.',
      };
    }

    const trimmedToken = token.trim();

    storageService.setItem(CAPTURED_TOKEN_KEY, trimmedToken);

    auditLogService.logEvent(AUDIT_EVENTS.ACCOUNT_SEARCHED, {
      context: {
        action: 'TOKEN_CAPTURED',
        tokenPrefix: trimmedToken.substring(0, 10) + '...',
      },
    });

    return {
      success: true,
      token: trimmedToken,
    };
  } catch (error) {
    console.error('tokenService.captureToken failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while capturing the eSign token.',
    };
  }
}

/**
 * Validates an eSign token against the mock data store.
 * Checks that the token exists, has not expired, has not already been used,
 * and is associated with the currently authenticated user.
 *
 * @param {string} token - The eSign token string to validate.
 * @returns {Object} Result object with shape { valid: boolean, tokenRecord?: Object, status?: string, error?: string, expired?: boolean }.
 */
export function validateToken(token) {
  try {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        valid: false,
        status: TOKEN_STATUS.INVALID,
        error: 'Token is required.',
      };
    }

    const trimmedToken = token.trim();

    // Retrieve all eSign tokens from mock data
    const allTokens = getMockESignTokens();
    const tokenRecord = allTokens.find((t) => t.token === trimmedToken);

    if (!tokenRecord) {
      auditLogService.logEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        context: {
          action: 'TOKEN_VALIDATION_FAILED',
          reason: 'Token not found',
          tokenPrefix: trimmedToken.substring(0, 10) + '...',
        },
      });

      return {
        valid: false,
        status: TOKEN_STATUS.INVALID,
        error: 'The provided eSign token is invalid or not recognized.',
      };
    }

    // Check if token has expired
    const expiresAt = new Date(tokenRecord.expiresAt).getTime();
    const createdAt = new Date(tokenRecord.createdAt).getTime();
    const now = Date.now();

    // Check against both the record's expiresAt and the configurable expiry window
    const configExpiry = createdAt + TOKEN_EXPIRY_MS;
    const effectiveExpiry = Math.min(expiresAt, configExpiry);

    if (now >= effectiveExpiry) {
      auditLogService.logEvent(AUDIT_EVENTS.SESSION_EXPIRED, {
        userId: tokenRecord.userId,
        context: {
          action: 'TOKEN_EXPIRED',
          tokenId: tokenRecord.id,
          expiresAt: tokenRecord.expiresAt,
        },
      });

      return {
        valid: false,
        status: TOKEN_STATUS.EXPIRED,
        error: 'The eSign token has expired. Please request a new one.',
        expired: true,
        tokenRecord,
      };
    }

    // Check if token has already been used/confirmed
    if (tokenRecord.used) {
      return {
        valid: false,
        status: TOKEN_STATUS.CONFIRMED,
        error: 'This eSign token has already been used.',
        tokenRecord,
      };
    }

    // Check association with authenticated user
    const currentUser = storageService.getItem(STORAGE_KEYS.USER, null);

    if (currentUser && currentUser.id && tokenRecord.userId !== currentUser.id) {
      auditLogService.logEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        userId: currentUser.id,
        context: {
          action: 'TOKEN_USER_MISMATCH',
          tokenId: tokenRecord.id,
          tokenUserId: tokenRecord.userId,
          authenticatedUserId: currentUser.id,
        },
      });

      return {
        valid: false,
        status: TOKEN_STATUS.INVALID,
        error: 'This eSign token is not associated with your account.',
        tokenRecord,
      };
    }

    auditLogService.logEvent(AUDIT_EVENTS.OTP_VERIFIED, {
      userId: tokenRecord.userId,
      context: {
        action: 'TOKEN_VALIDATED',
        tokenId: tokenRecord.id,
      },
    });

    return {
      valid: true,
      status: TOKEN_STATUS.PENDING,
      tokenRecord,
    };
  } catch (error) {
    console.error('tokenService.validateToken failed:', error);
    return {
      valid: false,
      status: TOKEN_STATUS.INVALID,
      error: 'An unexpected error occurred while validating the eSign token.',
    };
  }
}

/**
 * Updates the status of an eSign token, transitioning from pending to confirmed.
 * Persists the updated status to both the mock data store and local tracking.
 *
 * @param {string} token - The eSign token string to update.
 * @param {string} status - The new status to set (from TOKEN_STATUS).
 * @returns {Object} Result object with shape { success: boolean, tokenRecord?: Object, error?: string }.
 */
export function updateTokenStatus(token, status) {
  try {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        success: false,
        error: 'Token is required.',
      };
    }

    const validStatuses = Object.values(TOKEN_STATUS);
    if (!status || !validStatuses.includes(status)) {
      return {
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
      };
    }

    const trimmedToken = token.trim();

    // Retrieve all eSign tokens from localStorage directly
    let allTokens;
    try {
      const data = localStorage.getItem(MOCK_ESIGN_TOKENS_KEY);
      allTokens = data ? JSON.parse(data) : getMockESignTokens();
    } catch (parseError) {
      allTokens = getMockESignTokens();
    }

    const tokenIndex = allTokens.findIndex((t) => t.token === trimmedToken);

    if (tokenIndex === -1) {
      return {
        success: false,
        error: 'The provided eSign token was not found.',
      };
    }

    const tokenRecord = allTokens[tokenIndex];
    const previousStatus = tokenRecord.used ? TOKEN_STATUS.CONFIRMED : TOKEN_STATUS.PENDING;

    // Apply status transition
    if (status === TOKEN_STATUS.CONFIRMED) {
      allTokens[tokenIndex] = {
        ...tokenRecord,
        used: true,
        confirmedAt: new Date().toISOString(),
      };
    } else if (status === TOKEN_STATUS.EXPIRED) {
      allTokens[tokenIndex] = {
        ...tokenRecord,
        expiresAt: new Date().toISOString(),
      };
    }

    // Persist updated tokens to localStorage
    try {
      localStorage.setItem(MOCK_ESIGN_TOKENS_KEY, JSON.stringify(allTokens));
    } catch (persistError) {
      console.error('tokenService.updateTokenStatus: Failed to persist token update:', persistError);
      return {
        success: false,
        error: 'Failed to persist token status update.',
      };
    }

    // Track status locally
    storageService.setItem(TOKEN_STATUS_KEY, {
      token: trimmedToken,
      status,
      updatedAt: new Date().toISOString(),
    });

    auditLogService.logEvent(AUDIT_EVENTS.CHANGES_SUBMITTED, {
      userId: tokenRecord.userId,
      before: { status: previousStatus },
      after: { status },
      context: {
        action: 'TOKEN_STATUS_UPDATED',
        tokenId: tokenRecord.id,
      },
    });

    return {
      success: true,
      tokenRecord: allTokens[tokenIndex],
    };
  } catch (error) {
    console.error('tokenService.updateTokenStatus failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the token status.',
    };
  }
}

/**
 * Retrieves the currently captured eSign token from storage.
 *
 * @returns {string|null} The captured token string, or null if none exists.
 */
export function getCapturedToken() {
  try {
    return storageService.getItem(CAPTURED_TOKEN_KEY, null);
  } catch (error) {
    console.error('tokenService.getCapturedToken failed:', error);
    return null;
  }
}

/**
 * Retrieves the current token status tracking data from storage.
 *
 * @returns {Object|null} The token status object, or null if none exists.
 */
export function getTokenStatus() {
  try {
    return storageService.getItem(TOKEN_STATUS_KEY, null);
  } catch (error) {
    console.error('tokenService.getTokenStatus failed:', error);
    return null;
  }
}

/**
 * Clears all token-related data from storage.
 * Used during logout or session cleanup.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clearTokenData() {
  try {
    storageService.removeItem(CAPTURED_TOKEN_KEY);
    storageService.removeItem(TOKEN_STATUS_KEY);
    return true;
  } catch (error) {
    console.error('tokenService.clearTokenData failed:', error);
    return false;
  }
}

const tokenService = {
  captureToken,
  validateToken,
  updateTokenStatus,
  getCapturedToken,
  getTokenStatus,
  clearTokenData,
  TOKEN_STATUS,
};

export default tokenService;