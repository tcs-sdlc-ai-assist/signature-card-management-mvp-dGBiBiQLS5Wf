/**
 * Application-wide constants and enums.
 *
 * @module constants
 */

/**
 * Workflow step definitions for the card management process.
 * @enum {string}
 */
export const STEPS = {
  SEARCH: 'SEARCH',
  SELECT_ACCOUNT: 'SELECT_ACCOUNT',
  REVIEW_SIGNERS: 'REVIEW_SIGNERS',
  EDIT_SIGNERS: 'EDIT_SIGNERS',
  REVIEW_CHANGES: 'REVIEW_CHANGES',
  SUBMIT: 'SUBMIT',
  CONFIRMATION: 'CONFIRMATION',
};

/**
 * Signer status values.
 * @enum {string}
 */
export const SIGNER_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  LOCKED: 'LOCKED',
};

/**
 * Change type values for signer modifications.
 * @enum {string}
 */
export const CHANGE_TYPES = {
  ADD: 'ADD',
  EDIT: 'EDIT',
  REMOVE: 'REMOVE',
};

/**
 * Alert type values for UI notifications.
 * @enum {string}
 */
export const ALERT_TYPES = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  INFO: 'INFO',
};

/**
 * Audit event type values for logging user actions.
 * @enum {string}
 */
export const AUDIT_EVENTS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  OTP_REQUESTED: 'OTP_REQUESTED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  ACCOUNT_SEARCHED: 'ACCOUNT_SEARCHED',
  ACCOUNT_SELECTED: 'ACCOUNT_SELECTED',
  SIGNER_ADDED: 'SIGNER_ADDED',
  SIGNER_EDITED: 'SIGNER_EDITED',
  SIGNER_REMOVED: 'SIGNER_REMOVED',
  CHANGES_SUBMITTED: 'CHANGES_SUBMITTED',
  CHANGES_CANCELLED: 'CHANGES_CANCELLED',
};

/**
 * Keys used for localStorage persistence.
 * @enum {string}
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'sig_auth_token',
  USER: 'sig_user',
  SESSION_TIMESTAMP: 'sig_session_timestamp',
  LOGIN_ATTEMPTS: 'sig_login_attempts',
  OTP_TIMESTAMP: 'sig_otp_timestamp',
  OTP_ATTEMPTS: 'sig_otp_attempts',
  RATE_LIMIT_COUNT: 'sig_rate_limit_count',
  RATE_LIMIT_DATE: 'sig_rate_limit_date',
};

/**
 * Validation regex patterns for form inputs.
 * @enum {RegExp}
 */
export const VALIDATION_PATTERNS = {
  /** Matches a valid email address. */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  /** Matches a US phone number (10 digits, optional formatting). */
  PHONE: /^\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,

  /** Matches an account number (8-12 digits). */
  ACCOUNT_NUMBER: /^[0-9]{8,12}$/,

  /** Matches a numeric OTP code (4-8 digits). */
  OTP_CODE: /^[0-9]{4,8}$/,

  /** Matches a name (letters, spaces, hyphens, apostrophes). */
  NAME: /^[a-zA-Z\s'-]{1,100}$/,

  /** Matches a US Social Security Number (XXX-XX-XXXX). */
  SSN: /^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$/,

  /** Matches a US ZIP code (5 digits or 5+4 format). */
  ZIP_CODE: /^[0-9]{5}(-[0-9]{4})?$/,

  /** Matches alphanumeric characters only. */
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
};