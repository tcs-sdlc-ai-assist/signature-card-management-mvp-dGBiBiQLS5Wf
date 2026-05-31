/**
 * Centralized application configuration module.
 * All configurable values are read from environment variables with sensible defaults.
 *
 * @module config
 */

/**
 * Parses an environment variable as an integer, returning the default if not set or invalid.
 * @param {string} value - The environment variable value.
 * @param {number} defaultValue - The default value to use if parsing fails.
 * @returns {number} The parsed integer or the default value.
 */
const parseIntEnv = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Application configuration object.
 * @typedef {Object} AppConfig
 * @property {string} appTitle - The application title.
 * @property {Object} session - Session management settings.
 * @property {number} session.timeoutMs - Session timeout in milliseconds.
 * @property {number} session.warningMs - Warning before session timeout in milliseconds.
 * @property {Object} login - Login security settings.
 * @property {number} login.maxAttempts - Maximum failed login attempts before lockout.
 * @property {Object} otp - OTP (One-Time Password) settings.
 * @property {number} otp.expiryMs - OTP expiry time in milliseconds.
 * @property {number} otp.maxAttempts - Maximum OTP verification attempts.
 * @property {number} otp.resendCooldownMs - Cooldown period before allowing OTP resend in milliseconds.
 * @property {Object} token - Token configuration.
 * @property {number} token.expiryHours - Token expiry time in hours.
 * @property {Object} rateLimit - Rate limiting settings.
 * @property {number} rateLimit.dailyLimit - Maximum number of requests per day.
 */

/** @type {AppConfig} */
const config = {
  appTitle: import.meta.env.VITE_APP_TITLE || 'SIG Card Management',

  session: {
    timeoutMs: parseIntEnv(import.meta.env.VITE_SESSION_TIMEOUT_MS, 1800000),
    warningMs: parseIntEnv(import.meta.env.VITE_SESSION_WARNING_MS, 120000),
  },

  login: {
    maxAttempts: parseIntEnv(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS, 5),
  },

  otp: {
    expiryMs: parseIntEnv(import.meta.env.VITE_OTP_EXPIRY_MS, 300000),
    maxAttempts: parseIntEnv(import.meta.env.VITE_OTP_MAX_ATTEMPTS, 3),
    resendCooldownMs: parseIntEnv(import.meta.env.VITE_OTP_RESEND_COOLDOWN_MS, 60000),
  },

  token: {
    expiryHours: parseIntEnv(import.meta.env.VITE_TOKEN_EXPIRY_HOURS, 24),
  },

  rateLimit: {
    dailyLimit: parseIntEnv(import.meta.env.VITE_DAILY_RATE_LIMIT, 1000),
  },
};

export default config;