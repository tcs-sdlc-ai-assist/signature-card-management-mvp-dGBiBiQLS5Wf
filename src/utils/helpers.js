/**
 * Shared utility helper functions for the SIG Card Management application.
 * Provides masking, formatting, generation, and general-purpose utilities.
 *
 * @module helpers
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Masks an account number to show only the last 4 digits.
 * Example: '82019384521' -> '****4521'
 *
 * @param {string} number - The full account number to mask.
 * @returns {string} The masked account number.
 */
export function maskAccountNumber(number) {
  if (!number || typeof number !== 'string') {
    return '****';
  }

  const trimmed = number.trim();

  if (trimmed.length <= 4) {
    return `****${trimmed}`;
  }

  const lastFour = trimmed.slice(-4);
  return `****${lastFour}`;
}

/**
 * Masks contact information (email or phone) for display.
 * Detects whether the input is an email or phone number and applies
 * the appropriate masking strategy.
 *
 * Email example: 'john.smith@example.com' -> 'j*********@example.com'
 * Phone example: '555-123-4567' -> '***-***-4567'
 *
 * @param {string} info - The contact information to mask (email or phone).
 * @returns {string} The masked contact information.
 */
export function maskContactInfo(info) {
  if (!info || typeof info !== 'string') {
    return '****';
  }

  const trimmed = info.trim();

  if (trimmed.length === 0) {
    return '****';
  }

  // Detect email by presence of '@'
  if (trimmed.includes('@')) {
    return maskEmail(trimmed);
  }

  // Otherwise treat as phone number
  return maskPhone(trimmed);
}

/**
 * Masks an email address for display.
 * Example: 'john.smith@example.com' -> 'j*********@example.com'
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
 * Example: '555-123-4567' -> '***-***-4567'
 *
 * @param {string} phone - The phone number to mask.
 * @returns {string} The masked phone number.
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '***-***-****';
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***-***-****';
  }

  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Generates a unique reference ID using UUID v4.
 *
 * @returns {string} A unique reference ID string.
 */
export function generateReferenceId() {
  return uuidv4();
}

/**
 * Formats a date value into a human-readable timestamp string.
 * Accepts Date objects, ISO 8601 strings, or Unix timestamps (milliseconds).
 * Returns the formatted string in the format: 'MM/DD/YYYY, HH:MM:SS AM/PM'.
 *
 * @param {Date|string|number} date - The date value to format.
 * @returns {string} The formatted timestamp string, or 'Invalid Date' if the input is not valid.
 */
export function formatTimestamp(date) {
  if (date === null || date === undefined) {
    return 'Invalid Date';
  }

  let dateObj;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return 'Invalid Date';
  }

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  try {
    return dateObj.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('helpers.formatTimestamp failed:', error);
    return 'Invalid Date';
  }
}

/**
 * Formats a phone number string into the standard US format: (XXX) XXX-XXXX.
 * Strips all non-digit characters before formatting.
 * Returns the original input if it does not contain exactly 10 digits.
 *
 * @param {string} phone - The phone number string to format.
 * @returns {string} The formatted phone number, or the original string if formatting is not possible.
 */
export function formatPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length !== 10) {
    return phone;
  }

  const areaCode = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  return `(${areaCode}) ${prefix}-${line}`;
}

/**
 * Creates a debounced version of the provided function.
 * The debounced function delays invoking the provided function until after
 * the specified delay in milliseconds has elapsed since the last time it was invoked.
 *
 * @param {function} fn - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {function} A debounced version of the provided function with a cancel() method.
 */
export function debounce(fn, delay) {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected the first argument to be a function.');
  }

  if (typeof delay !== 'number' || delay < 0) {
    throw new TypeError('Expected the second argument to be a non-negative number.');
  }

  let timerId = null;

  /**
   * The debounced function.
   * @param {...*} args - Arguments to pass to the original function.
   * @returns {void}
   */
  function debounced(...args) {
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(this, args);
    }, delay);
  }

  /**
   * Cancels any pending debounced invocation.
   * @returns {void}
   */
  debounced.cancel = function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}

/**
 * Creates a deep clone of the provided object.
 * Uses structured cloning via JSON serialization/deserialization.
 * Does not support functions, undefined values, Dates (converted to strings),
 * RegExp, Map, Set, or circular references.
 *
 * @param {Object} obj - The object to deep clone.
 * @returns {Object} A deep clone of the provided object.
 */
export function deepClone(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('helpers.deepClone failed:', error);
    return obj;
  }
}

/**
 * Checks whether a token has expired based on its expiration timestamp.
 * Accepts ISO 8601 date strings, Date objects, or Unix timestamps (milliseconds).
 *
 * @param {string|Date|number} expiresAt - The expiration timestamp to check.
 * @returns {boolean} True if the token has expired (current time >= expiresAt), false otherwise.
 */
export function isTokenExpired(expiresAt) {
  if (expiresAt === null || expiresAt === undefined) {
    return true;
  }

  let expiryTime;

  if (expiresAt instanceof Date) {
    expiryTime = expiresAt.getTime();
  } else if (typeof expiresAt === 'string') {
    expiryTime = new Date(expiresAt).getTime();
  } else if (typeof expiresAt === 'number') {
    expiryTime = expiresAt;
  } else {
    return true;
  }

  if (isNaN(expiryTime)) {
    return true;
  }

  return Date.now() >= expiryTime;
}

const helpers = {
  maskAccountNumber,
  maskContactInfo,
  generateReferenceId,
  formatTimestamp,
  formatPhoneNumber,
  debounce,
  deepClone,
  isTokenExpired,
};

export default helpers;