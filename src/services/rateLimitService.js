/**
 * Client-side rate-limiting enforcement service.
 * Provides per-signer attempt tracking for unlock and resend actions.
 * Enforces max 3 attempts per signer per calendar day.
 * Counters are stored in localStorage via storageService and reset at midnight.
 *
 * @module rateLimitService
 */

import * as storageService from './storageService.js';
import config from '../config.js';

/** @type {string} Storage key for unlock attempts data */
const UNLOCK_ATTEMPTS_KEY = 'rate_limit_unlock_attempts';

/** @type {string} Storage key for resend attempts data */
const RESEND_ATTEMPTS_KEY = 'rate_limit_resend_attempts';

/** @type {string} Storage key for the date the counters were last set */
const RATE_LIMIT_DATE_KEY = 'rate_limit_date';

/** @type {number} Maximum attempts per signer per action per calendar day */
const MAX_ATTEMPTS_PER_DAY = 3;

/**
 * Action type values for rate-limited operations.
 * @enum {string}
 */
export const ACTION_TYPES = {
  UNLOCK: 'UNLOCK',
  RESEND: 'RESEND',
};

/**
 * Returns the current calendar date string in YYYY-MM-DD format.
 *
 * @returns {string} The current date string.
 */
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether the stored counters are from a previous calendar day.
 * If so, resets all counters and updates the stored date.
 *
 * @returns {void}
 */
function checkAndResetIfNewDay() {
  try {
    const storedDate = storageService.getItem(RATE_LIMIT_DATE_KEY, null);
    const currentDate = getCurrentDateString();

    if (storedDate !== currentDate) {
      storageService.setItem(UNLOCK_ATTEMPTS_KEY, {});
      storageService.setItem(RESEND_ATTEMPTS_KEY, {});
      storageService.setItem(RATE_LIMIT_DATE_KEY, currentDate);
    }
  } catch (error) {
    console.error('rateLimitService.checkAndResetIfNewDay failed:', error);
  }
}

/**
 * Retrieves the attempts map for a given storage key.
 * Ensures counters are reset if a new calendar day has started.
 *
 * @param {string} storageKey - The storage key for the attempts map.
 * @returns {Object} A map of signerId to attempt count.
 */
function getAttemptsMap(storageKey) {
  try {
    checkAndResetIfNewDay();
    const data = storageService.getItem(storageKey, {});
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
  } catch (error) {
    console.error('rateLimitService.getAttemptsMap failed:', error);
    return {};
  }
}

/**
 * Retrieves the current unlock attempt count for a given signer.
 *
 * @param {string} signerId - The ID of the signer.
 * @returns {number} The number of unlock attempts used today.
 */
export function getUnlockAttempts(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return 0;
    }

    const attemptsMap = getAttemptsMap(UNLOCK_ATTEMPTS_KEY);
    return typeof attemptsMap[signerId] === 'number' ? attemptsMap[signerId] : 0;
  } catch (error) {
    console.error('rateLimitService.getUnlockAttempts failed:', error);
    return 0;
  }
}

/**
 * Increments the unlock attempt count for a given signer.
 * Returns the new attempt count after incrementing.
 *
 * @param {string} signerId - The ID of the signer.
 * @returns {Object} Result object with shape { success: boolean, attempts?: number, exhausted?: boolean, error?: string }.
 */
export function incrementUnlockAttempt(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    const attemptsMap = getAttemptsMap(UNLOCK_ATTEMPTS_KEY);
    const currentAttempts = typeof attemptsMap[signerId] === 'number' ? attemptsMap[signerId] : 0;

    if (currentAttempts >= MAX_ATTEMPTS_PER_DAY) {
      return {
        success: false,
        attempts: currentAttempts,
        exhausted: true,
        error: 'You have exceeded the maximum number of unlock attempts for today. Please try again tomorrow.',
      };
    }

    const newAttempts = currentAttempts + 1;
    attemptsMap[signerId] = newAttempts;
    storageService.setItem(UNLOCK_ATTEMPTS_KEY, attemptsMap);

    return {
      success: true,
      attempts: newAttempts,
      exhausted: newAttempts >= MAX_ATTEMPTS_PER_DAY,
    };
  } catch (error) {
    console.error('rateLimitService.incrementUnlockAttempt failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while tracking unlock attempts.',
    };
  }
}

/**
 * Retrieves the current resend attempt count for a given signer.
 *
 * @param {string} signerId - The ID of the signer.
 * @returns {number} The number of resend attempts used today.
 */
export function getResendAttempts(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return 0;
    }

    const attemptsMap = getAttemptsMap(RESEND_ATTEMPTS_KEY);
    return typeof attemptsMap[signerId] === 'number' ? attemptsMap[signerId] : 0;
  } catch (error) {
    console.error('rateLimitService.getResendAttempts failed:', error);
    return 0;
  }
}

/**
 * Increments the resend attempt count for a given signer.
 * Returns the new attempt count after incrementing.
 *
 * @param {string} signerId - The ID of the signer.
 * @returns {Object} Result object with shape { success: boolean, attempts?: number, exhausted?: boolean, error?: string }.
 */
export function incrementResendAttempt(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    const attemptsMap = getAttemptsMap(RESEND_ATTEMPTS_KEY);
    const currentAttempts = typeof attemptsMap[signerId] === 'number' ? attemptsMap[signerId] : 0;

    if (currentAttempts >= MAX_ATTEMPTS_PER_DAY) {
      return {
        success: false,
        attempts: currentAttempts,
        exhausted: true,
        error: 'You have exceeded the maximum number of resend attempts for today. Please try again tomorrow.',
      };
    }

    const newAttempts = currentAttempts + 1;
    attemptsMap[signerId] = newAttempts;
    storageService.setItem(RESEND_ATTEMPTS_KEY, attemptsMap);

    return {
      success: true,
      attempts: newAttempts,
      exhausted: newAttempts >= MAX_ATTEMPTS_PER_DAY,
    };
  } catch (error) {
    console.error('rateLimitService.incrementResendAttempt failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while tracking resend attempts.',
    };
  }
}

/**
 * Checks whether the rate limit is exhausted for a given signer and action type.
 *
 * @param {string} signerId - The ID of the signer.
 * @param {string} actionType - The action type (from ACTION_TYPES: 'UNLOCK' or 'RESEND').
 * @returns {boolean} True if the limit is exhausted, false otherwise.
 */
export function isLimitExhausted(signerId, actionType) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return false;
    }

    if (!actionType || typeof actionType !== 'string') {
      return false;
    }

    const normalizedAction = actionType.toUpperCase();

    if (normalizedAction === ACTION_TYPES.UNLOCK) {
      return getUnlockAttempts(signerId) >= MAX_ATTEMPTS_PER_DAY;
    }

    if (normalizedAction === ACTION_TYPES.RESEND) {
      return getResendAttempts(signerId) >= MAX_ATTEMPTS_PER_DAY;
    }

    return false;
  } catch (error) {
    console.error('rateLimitService.isLimitExhausted failed:', error);
    return false;
  }
}

/**
 * Resets all daily rate limit counters.
 * Clears both unlock and resend attempt maps and updates the stored date.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function resetDailyLimits() {
  try {
    storageService.setItem(UNLOCK_ATTEMPTS_KEY, {});
    storageService.setItem(RESEND_ATTEMPTS_KEY, {});
    storageService.setItem(RATE_LIMIT_DATE_KEY, getCurrentDateString());
    return true;
  } catch (error) {
    console.error('rateLimitService.resetDailyLimits failed:', error);
    return false;
  }
}

const rateLimitService = {
  getUnlockAttempts,
  incrementUnlockAttempt,
  getResendAttempts,
  incrementResendAttempt,
  resetDailyLimits,
  isLimitExhausted,
  ACTION_TYPES,
};

export default rateLimitService;