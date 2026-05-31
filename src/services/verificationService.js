/**
 * Mock identity verification service providing OTP send, verify, resend,
 * delivery method selection with masked contact info, attempt tracking,
 * expiry enforcement, and resend cooldown/limit management.
 * All events are logged via auditLogService.
 *
 * @module verificationService
 */

import { STORAGE_KEYS, AUDIT_EVENTS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import { getMockUsers, generateMockOtp, getMockOtpCodes } from '../data/mockData.js';
import config from '../config.js';

/** @type {string} Storage key for OTP attempts count */
const OTP_ATTEMPTS_KEY = STORAGE_KEYS.OTP_ATTEMPTS;

/** @type {string} Storage key for OTP timestamp */
const OTP_TIMESTAMP_KEY = STORAGE_KEYS.OTP_TIMESTAMP;

/** @type {string} Storage key for resend attempts count */
const RESEND_ATTEMPTS_KEY = 'otp_resend_attempts';

/** @type {string} Storage key for last resend timestamp */
const RESEND_TIMESTAMP_KEY = 'otp_resend_timestamp';

/** @type {string} Storage key for the current active OTP id */
const ACTIVE_OTP_KEY = 'otp_active_id';

/** @type {string} Storage key for the current active OTP user id */
const ACTIVE_OTP_USER_KEY = 'otp_active_user_id';

/** @type {number} Maximum number of OTP verification attempts */
const MAX_OTP_ATTEMPTS = config.otp.maxAttempts;

/** @type {number} OTP expiry time in milliseconds */
const OTP_EXPIRY_MS = config.otp.expiryMs;

/** @type {number} Resend cooldown in milliseconds */
const RESEND_COOLDOWN_MS = config.otp.resendCooldownMs;

/** @type {number} Maximum number of resend attempts */
const MAX_RESEND_ATTEMPTS = 3;

/**
 * Masks an email address for display.
 * Example: john.smith@example.com -> j*********@example.com
 *
 * @param {string} email - The email address to mask.
 * @returns {string} The masked email address.
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return '****@****.***';
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return '****@****.***';
  }

  const [local, domain] = parts;
  if (local.length <= 1) {
    return `*@${domain}`;
  }

  return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
}

/**
 * Masks a phone number for display.
 * Example: 555-123-4567 -> ***-***-4567
 *
 * @param {string} phone - The phone number to mask.
 * @returns {string} The masked phone number.
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '***-***-****';
  }

  // Strip non-digit characters
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***-***-****';
  }

  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Returns available delivery methods with masked contact info for a given user.
 *
 * @param {string} userId - The user ID to retrieve delivery methods for.
 * @returns {Object} Result object with shape { success: boolean, methods?: Array<Object>, error?: string }.
 */
export function getDeliveryMethods(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required.',
      };
    }

    const users = getMockUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    const methods = [];

    if (user.email) {
      methods.push({
        id: 'email',
        type: 'EMAIL',
        label: 'Email',
        maskedValue: maskEmail(user.email),
      });
    }

    if (user.phone) {
      methods.push({
        id: 'sms',
        type: 'SMS',
        label: 'Text Message (SMS)',
        maskedValue: maskPhone(user.phone),
      });
    }

    return {
      success: true,
      methods,
    };
  } catch (error) {
    console.error('verificationService.getDeliveryMethods failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving delivery methods.',
    };
  }
}

/**
 * Sends a one-time password to the user via the specified delivery method.
 * Enforces resend cooldown and resend attempt limits.
 *
 * @param {string} userId - The user ID to send the OTP to.
 * @param {string} deliveryMethod - The delivery method ('email' or 'sms').
 * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string, cooldownRemaining?: number }.
 */
export function sendOtp(userId, deliveryMethod) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required.',
      };
    }

    if (!deliveryMethod) {
      return {
        success: false,
        error: 'Delivery method is required.',
      };
    }

    const validMethods = ['email', 'sms'];
    if (!validMethods.includes(deliveryMethod.toLowerCase())) {
      return {
        success: false,
        error: 'Invalid delivery method. Must be "email" or "sms".',
      };
    }

    const users = getMockUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    // Check resend cooldown
    const lastResendTimestamp = storageService.getItem(RESEND_TIMESTAMP_KEY, null);
    if (lastResendTimestamp) {
      const elapsed = Date.now() - lastResendTimestamp;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const cooldownRemaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          error: `Please wait ${cooldownRemaining} second${cooldownRemaining !== 1 ? 's' : ''} before requesting a new code.`,
          cooldownRemaining,
        };
      }
    }

    // Check resend attempt limit
    const resendAttempts = storageService.getItem(RESEND_ATTEMPTS_KEY, 0);
    if (resendAttempts >= MAX_RESEND_ATTEMPTS) {
      return {
        success: false,
        error: 'You have reached the maximum number of resend attempts. Please contact support for further assistance.',
      };
    }

    // Generate OTP
    const otpRecord = generateMockOtp(userId);

    // Persist active OTP tracking data
    storageService.setItem(ACTIVE_OTP_KEY, otpRecord.id);
    storageService.setItem(ACTIVE_OTP_USER_KEY, userId);
    storageService.setItem(OTP_TIMESTAMP_KEY, Date.now());
    storageService.setItem(OTP_ATTEMPTS_KEY, 0);
    storageService.setItem(RESEND_TIMESTAMP_KEY, Date.now());

    // Increment resend attempts (first send counts as attempt 0, resends increment)
    if (lastResendTimestamp) {
      storageService.setItem(RESEND_ATTEMPTS_KEY, resendAttempts + 1);
    } else {
      storageService.setItem(RESEND_ATTEMPTS_KEY, 0);
    }

    auditLogService.logEvent(AUDIT_EVENTS.OTP_REQUESTED, {
      userId,
      context: {
        deliveryMethod: deliveryMethod.toLowerCase(),
        otpId: otpRecord.id,
      },
    });

    // In a real app, the code would be sent via the delivery method.
    // For development/testing, log the code to the console.
    console.info(`[DEV] OTP code for user ${userId}: ${otpRecord.code}`);

    const maskedContact = deliveryMethod.toLowerCase() === 'email'
      ? maskEmail(user.email)
      : maskPhone(user.phone);

    return {
      success: true,
      message: `A one-time password has been sent to ${maskedContact}.`,
    };
  } catch (error) {
    console.error('verificationService.sendOtp failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while sending the one-time password.',
    };
  }
}

/**
 * Resends a one-time password to the user via the specified delivery method.
 * Enforces resend cooldown and resend attempt limits.
 *
 * @param {string} userId - The user ID to resend the OTP to.
 * @param {string} deliveryMethod - The delivery method ('email' or 'sms').
 * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string, cooldownRemaining?: number, resendAttempt?: number }.
 */
export function resendOtp(userId, deliveryMethod) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required.',
      };
    }

    if (!deliveryMethod) {
      return {
        success: false,
        error: 'Delivery method is required.',
      };
    }

    // Check resend cooldown
    const lastResendTimestamp = storageService.getItem(RESEND_TIMESTAMP_KEY, null);
    if (lastResendTimestamp) {
      const elapsed = Date.now() - lastResendTimestamp;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const cooldownRemaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          error: `Please wait ${cooldownRemaining} second${cooldownRemaining !== 1 ? 's' : ''} before requesting a new code.`,
          cooldownRemaining,
        };
      }
    }

    // Check resend attempt limit
    const resendAttempts = storageService.getItem(RESEND_ATTEMPTS_KEY, 0);
    if (resendAttempts >= MAX_RESEND_ATTEMPTS) {
      return {
        success: false,
        error: 'You have reached the maximum number of resend attempts. Please contact support for further assistance.',
      };
    }

    // Increment resend attempts
    const newResendAttempts = resendAttempts + 1;
    storageService.setItem(RESEND_ATTEMPTS_KEY, newResendAttempts);

    // Generate new OTP
    const otpRecord = generateMockOtp(userId);

    // Update active OTP tracking data
    storageService.setItem(ACTIVE_OTP_KEY, otpRecord.id);
    storageService.setItem(ACTIVE_OTP_USER_KEY, userId);
    storageService.setItem(OTP_TIMESTAMP_KEY, Date.now());
    storageService.setItem(OTP_ATTEMPTS_KEY, 0);
    storageService.setItem(RESEND_TIMESTAMP_KEY, Date.now());

    auditLogService.logEvent(AUDIT_EVENTS.OTP_REQUESTED, {
      userId,
      context: {
        deliveryMethod: deliveryMethod.toLowerCase(),
        otpId: otpRecord.id,
        resendAttempt: newResendAttempts,
      },
    });

    console.info(`[DEV] Resent OTP code for user ${userId}: ${otpRecord.code}`);

    const users = getMockUsers();
    const user = users.find((u) => u.id === userId);
    const maskedContact = deliveryMethod.toLowerCase() === 'email'
      ? maskEmail(user ? user.email : '')
      : maskPhone(user ? user.phone : '');

    return {
      success: true,
      message: `A new one-time password has been sent to ${maskedContact}.`,
      resendAttempt: newResendAttempts,
    };
  } catch (error) {
    console.error('verificationService.resendOtp failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while resending the one-time password.',
    };
  }
}

/**
 * Verifies a one-time password code entered by the user.
 * Validates the code against the active OTP, enforces attempt limits and expiry.
 *
 * @param {string} userId - The user ID to verify the OTP for.
 * @param {string} code - The 6-digit OTP code entered by the user.
 * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string, attemptsRemaining?: number, expired?: boolean }.
 */
export function verifyOtp(userId, code) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required.',
      };
    }

    if (!code || typeof code !== 'string') {
      return {
        success: false,
        error: 'OTP code is required.',
      };
    }

    // Validate 6-digit format
    const trimmedCode = code.trim();
    if (!/^[0-9]{6}$/.test(trimmedCode)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit code.',
      };
    }

    // Check attempt limit
    const currentAttempts = storageService.getItem(OTP_ATTEMPTS_KEY, 0);
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      auditLogService.logEvent(AUDIT_EVENTS.OTP_FAILED, {
        userId,
        context: {
          reason: 'Maximum OTP verification attempts exceeded',
          attempts: currentAttempts,
        },
      });

      return {
        success: false,
        error: 'You have exceeded the maximum number of OTP verification attempts. Please request a new code.',
      };
    }

    // Check OTP expiry
    const otpTimestamp = storageService.getItem(OTP_TIMESTAMP_KEY, null);
    if (otpTimestamp) {
      const elapsed = Date.now() - otpTimestamp;
      if (elapsed >= OTP_EXPIRY_MS) {
        auditLogService.logEvent(AUDIT_EVENTS.OTP_FAILED, {
          userId,
          context: {
            reason: 'OTP expired',
          },
        });

        return {
          success: false,
          error: 'Your one-time password has expired. Please request a new one.',
          expired: true,
        };
      }
    }

    // Find the active OTP
    const activeOtpId = storageService.getItem(ACTIVE_OTP_KEY, null);
    const activeOtpUserId = storageService.getItem(ACTIVE_OTP_USER_KEY, null);

    if (!activeOtpId || activeOtpUserId !== userId) {
      return {
        success: false,
        error: 'No active OTP found. Please request a new code.',
      };
    }

    // Retrieve OTP codes and find the active one
    const otpCodes = getMockOtpCodes(userId);
    const activeOtp = otpCodes.find((otp) => otp.id === activeOtpId);

    if (!activeOtp) {
      return {
        success: false,
        error: 'No active OTP found. Please request a new code.',
      };
    }

    // Check if OTP record itself has expired
    if (new Date(activeOtp.expiresAt).getTime() < Date.now()) {
      auditLogService.logEvent(AUDIT_EVENTS.OTP_FAILED, {
        userId,
        context: {
          reason: 'OTP record expired',
          otpId: activeOtpId,
        },
      });

      return {
        success: false,
        error: 'Your one-time password has expired. Please request a new one.',
        expired: true,
      };
    }

    // Verify the code
    if (activeOtp.code !== trimmedCode) {
      const newAttempts = currentAttempts + 1;
      storageService.setItem(OTP_ATTEMPTS_KEY, newAttempts);

      const attemptsRemaining = Math.max(0, MAX_OTP_ATTEMPTS - newAttempts);

      auditLogService.logEvent(AUDIT_EVENTS.OTP_FAILED, {
        userId,
        context: {
          reason: 'Invalid OTP code',
          attemptNumber: newAttempts,
          attemptsRemaining,
          otpId: activeOtpId,
        },
      });

      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        return {
          success: false,
          error: 'You have exceeded the maximum number of OTP verification attempts. Please request a new code.',
          attemptsRemaining: 0,
        };
      }

      return {
        success: false,
        error: `Incorrect code. You have ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
        attemptsRemaining,
      };
    }

    // OTP verified successfully — clean up tracking data
    storageService.removeItem(ACTIVE_OTP_KEY);
    storageService.removeItem(ACTIVE_OTP_USER_KEY);
    storageService.removeItem(OTP_ATTEMPTS_KEY);
    storageService.removeItem(OTP_TIMESTAMP_KEY);
    storageService.removeItem(RESEND_ATTEMPTS_KEY);
    storageService.removeItem(RESEND_TIMESTAMP_KEY);

    auditLogService.logEvent(AUDIT_EVENTS.OTP_VERIFIED, {
      userId,
      context: {
        otpId: activeOtpId,
      },
    });

    return {
      success: true,
      message: 'One-time password verified successfully.',
    };
  } catch (error) {
    console.error('verificationService.verifyOtp failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while verifying the one-time password.',
    };
  }
}

/**
 * Returns the current OTP verification status including attempts used,
 * remaining attempts, expiry status, and resend information.
 *
 * @param {string} userId - The user ID to check status for.
 * @returns {Object} Status object with shape { hasActiveOtp: boolean, attemptsUsed: number, attemptsRemaining: number, expired: boolean, resendAttemptsUsed: number, resendAttemptsRemaining: number, cooldownRemaining: number }.
 */
export function getVerificationStatus(userId) {
  try {
    const activeOtpId = storageService.getItem(ACTIVE_OTP_KEY, null);
    const activeOtpUserId = storageService.getItem(ACTIVE_OTP_USER_KEY, null);
    const hasActiveOtp = !!(activeOtpId && activeOtpUserId === userId);

    const attemptsUsed = storageService.getItem(OTP_ATTEMPTS_KEY, 0);
    const attemptsRemaining = Math.max(0, MAX_OTP_ATTEMPTS - attemptsUsed);

    let expired = false;
    const otpTimestamp = storageService.getItem(OTP_TIMESTAMP_KEY, null);
    if (otpTimestamp) {
      const elapsed = Date.now() - otpTimestamp;
      expired = elapsed >= OTP_EXPIRY_MS;
    }

    const resendAttemptsUsed = storageService.getItem(RESEND_ATTEMPTS_KEY, 0);
    const resendAttemptsRemaining = Math.max(0, MAX_RESEND_ATTEMPTS - resendAttemptsUsed);

    let cooldownRemaining = 0;
    const lastResendTimestamp = storageService.getItem(RESEND_TIMESTAMP_KEY, null);
    if (lastResendTimestamp) {
      const elapsed = Date.now() - lastResendTimestamp;
      if (elapsed < RESEND_COOLDOWN_MS) {
        cooldownRemaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      }
    }

    return {
      hasActiveOtp,
      attemptsUsed,
      attemptsRemaining,
      expired,
      resendAttemptsUsed,
      resendAttemptsRemaining,
      cooldownRemaining,
    };
  } catch (error) {
    console.error('verificationService.getVerificationStatus failed:', error);
    return {
      hasActiveOtp: false,
      attemptsUsed: 0,
      attemptsRemaining: MAX_OTP_ATTEMPTS,
      expired: false,
      resendAttemptsUsed: 0,
      resendAttemptsRemaining: MAX_RESEND_ATTEMPTS,
      cooldownRemaining: 0,
    };
  }
}

/**
 * Resets all OTP verification state for a clean start.
 * Clears active OTP, attempts, timestamps, and resend tracking.
 *
 * @returns {boolean} True if the reset succeeded, false otherwise.
 */
export function resetVerificationState() {
  try {
    storageService.removeItem(ACTIVE_OTP_KEY);
    storageService.removeItem(ACTIVE_OTP_USER_KEY);
    storageService.removeItem(OTP_ATTEMPTS_KEY);
    storageService.removeItem(OTP_TIMESTAMP_KEY);
    storageService.removeItem(RESEND_ATTEMPTS_KEY);
    storageService.removeItem(RESEND_TIMESTAMP_KEY);
    return true;
  } catch (error) {
    console.error('verificationService.resetVerificationState failed:', error);
    return false;
  }
}

const verificationService = {
  getDeliveryMethods,
  sendOtp,
  resendOtp,
  verifyOtp,
  getVerificationStatus,
  resetVerificationState,
};

export default verificationService;