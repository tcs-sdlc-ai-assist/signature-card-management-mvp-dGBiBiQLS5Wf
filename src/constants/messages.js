/**
 * Centralized user-facing message strings organized by module.
 * Supports future content management and i18n.
 *
 * @module messages
 */

/**
 * Login-related messages.
 * @enum {string}
 */
export const LOGIN_MESSAGES = {
  INVALID_CREDENTIALS: 'The username or password you entered is incorrect. Please try again.',
  ACCOUNT_LOCKED: 'Your account has been locked due to too many failed login attempts. Please contact support.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  LOGIN_SUCCESS: 'You have successfully logged in.',
  LOGOUT_SUCCESS: 'You have been successfully logged out.',
  LOGIN_REQUIRED: 'Please log in to continue.',
  ATTEMPTS_REMAINING: (remaining) => `Invalid credentials. You have ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before your account is locked.`,
};

/**
 * OTP (One-Time Password) related messages.
 * @enum {string}
 */
export const OTP_MESSAGES = {
  OTP_SENT: 'A one-time password has been sent to your registered contact.',
  OTP_RESENT: 'A new one-time password has been sent.',
  OTP_EXPIRED: 'Your one-time password has expired. Please request a new one.',
  OTP_INVALID: 'The one-time password you entered is incorrect. Please try again.',
  OTP_VERIFIED: 'One-time password verified successfully.',
  OTP_MAX_ATTEMPTS: 'You have exceeded the maximum number of OTP verification attempts. Please request a new code.',
  OTP_RESEND_COOLDOWN: (seconds) => `Please wait ${seconds} second${seconds !== 1 ? 's' : ''} before requesting a new code.`,
  OTP_ATTEMPTS_REMAINING: (remaining) => `Incorrect code. You have ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
};

/**
 * Unlock attempt messaging matrix.
 * Messages displayed based on the current unlock attempt number.
 * @enum {string}
 */
export const UNLOCK_ATTEMPT_MESSAGES = {
  ATTEMPT_1: 'Incorrect unlock code. Please check your code and try again.',
  ATTEMPT_2: 'Incorrect unlock code. You have one more attempt remaining before your request is locked.',
  ATTEMPT_3: 'This is your final attempt. Please enter the correct unlock code carefully.',
  EXHAUSTED: 'You have exceeded the maximum number of unlock attempts. Please contact support for assistance.',
  /**
   * Returns the appropriate unlock attempt message for the given attempt number.
   * @param {number} attempt - The current attempt number (1-based).
   * @param {number} maxAttempts - The maximum number of allowed attempts.
   * @returns {string} The corresponding message.
   */
  getMessageForAttempt: (attempt, maxAttempts) => {
    if (attempt >= maxAttempts) {
      return UNLOCK_ATTEMPT_MESSAGES.EXHAUSTED;
    }
    if (attempt === maxAttempts - 1) {
      return UNLOCK_ATTEMPT_MESSAGES.ATTEMPT_3;
    }
    if (attempt === maxAttempts - 2) {
      return UNLOCK_ATTEMPT_MESSAGES.ATTEMPT_2;
    }
    return UNLOCK_ATTEMPT_MESSAGES.ATTEMPT_1;
  },
};

/**
 * Resend attempt messaging matrix.
 * Messages displayed based on the current resend attempt number.
 * @enum {string}
 */
export const RESEND_ATTEMPT_MESSAGES = {
  ATTEMPT_1: 'A new code has been sent. Please check your registered contact.',
  ATTEMPT_2: 'Another code has been sent. Please ensure you are checking the correct device.',
  ATTEMPT_3: 'A final code has been sent. If you continue to experience issues, please contact support.',
  EXHAUSTED: 'You have reached the maximum number of resend attempts. Please contact support for further assistance.',
  /**
   * Returns the appropriate resend attempt message for the given attempt number.
   * @param {number} attempt - The current resend attempt number (1-based).
   * @param {number} maxAttempts - The maximum number of allowed resend attempts.
   * @returns {string} The corresponding message.
   */
  getMessageForAttempt: (attempt, maxAttempts) => {
    if (attempt >= maxAttempts) {
      return RESEND_ATTEMPT_MESSAGES.EXHAUSTED;
    }
    if (attempt === maxAttempts - 1) {
      return RESEND_ATTEMPT_MESSAGES.ATTEMPT_3;
    }
    if (attempt === maxAttempts - 2) {
      return RESEND_ATTEMPT_MESSAGES.ATTEMPT_2;
    }
    return RESEND_ATTEMPT_MESSAGES.ATTEMPT_1;
  },
};

/**
 * Validation error messages.
 * @enum {string}
 */
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_ACCOUNT_NUMBER: 'Please enter a valid account number (8-12 digits).',
  INVALID_OTP_CODE: 'Please enter a valid code (4-8 digits).',
  INVALID_NAME: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only).',
  INVALID_SSN: 'Please enter a valid Social Security Number (XXX-XX-XXXX).',
  INVALID_ZIP_CODE: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789).',
  INVALID_ALPHANUMERIC: 'Only letters and numbers are allowed.',
  MIN_LENGTH: (min) => `Must be at least ${min} character${min !== 1 ? 's' : ''} long.`,
  MAX_LENGTH: (max) => `Must be no more than ${max} character${max !== 1 ? 's' : ''} long.`,
  FIELD_MISMATCH: (fieldName) => `${fieldName} values do not match.`,
};

/**
 * Confirmation messages.
 * @enum {string}
 */
export const CONFIRMATION_MESSAGES = {
  SUBMIT_CHANGES: 'Are you sure you want to submit these changes?',
  CANCEL_CHANGES: 'Are you sure you want to cancel? All unsaved changes will be lost.',
  REMOVE_SIGNER: 'Are you sure you want to remove this signer? This action cannot be undone.',
  CHANGES_SUBMITTED: 'Your changes have been submitted successfully.',
  CHANGES_SAVED: 'Your changes have been saved.',
  NO_CHANGES: 'No changes have been made.',
};

/**
 * General UI labels.
 * @enum {string}
 */
export const UI_LABELS = {
  LOADING: 'Loading...',
  SUBMITTING: 'Submitting...',
  SEARCHING: 'Searching...',
  NO_RESULTS: 'No results found.',
  ERROR_GENERIC: 'An unexpected error occurred. Please try again later.',
  ERROR_NETWORK: 'Unable to connect to the server. Please check your connection and try again.',
  ERROR_RATE_LIMIT: 'You have exceeded the maximum number of requests. Please try again later.',
  BACK: 'Back',
  NEXT: 'Next',
  SUBMIT: 'Submit',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  EDIT: 'Edit',
  DELETE: 'Delete',
  ADD: 'Add',
  SEARCH: 'Search',
  CLOSE: 'Close',
  CONFIRM: 'Confirm',
  YES: 'Yes',
  NO: 'No',
  RETRY: 'Retry',
  SIGN_IN: 'Sign In',
  SIGN_OUT: 'Sign Out',
};

/**
 * Signer-related messages.
 * @enum {string}
 */
export const SIGNER_MESSAGES = {
  SIGNER_ADDED: 'Signer has been added successfully.',
  SIGNER_UPDATED: 'Signer information has been updated.',
  SIGNER_REMOVED: 'Signer has been removed.',
  NO_SIGNERS: 'No signers are currently associated with this account.',
  DUPLICATE_SIGNER: 'This signer already exists on the account.',
};

/**
 * Account-related messages.
 * @enum {string}
 */
export const ACCOUNT_MESSAGES = {
  ACCOUNT_NOT_FOUND: 'No account found matching the provided information.',
  ACCOUNT_SELECTED: 'Account selected successfully.',
  MULTIPLE_ACCOUNTS: 'Multiple accounts found. Please select the correct account.',
};