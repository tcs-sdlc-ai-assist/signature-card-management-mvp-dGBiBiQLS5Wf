/**
 * Custom React hook for session timeout management.
 * Monitors user activity (mouse, keyboard, touch events), shows a warning
 * modal when approaching timeout, and expires the session after inactivity.
 * Provides extendSession() callback to reset the inactivity timer.
 *
 * Returns { isWarningVisible, timeRemaining, extendSession, isExpired }.
 *
 * @module useSessionTimeout
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as sessionService from '../services/sessionService.js';
import * as authService from '../services/authService.js';
import config from '../config.js';

/** @type {number} Interval in milliseconds for checking session timeout status */
const CHECK_INTERVAL_MS = 1000;

/** @type {Array<string>} DOM events that indicate user activity */
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'keypress',
  'scroll',
  'touchstart',
  'touchmove',
  'click',
];

/**
 * Custom React hook for session timeout management.
 * Monitors user activity, shows warning before timeout, and expires session on inactivity.
 *
 * @param {Object} [options={}] - Optional configuration overrides.
 * @param {number} [options.timeoutMs] - Session timeout in milliseconds (default: from config).
 * @param {number} [options.warningMs] - Warning threshold in milliseconds before timeout (default: from config).
 * @param {function} [options.onExpire] - Callback invoked when the session expires.
 * @param {function} [options.onWarning] - Callback invoked when the warning threshold is reached.
 * @returns {Object} Session timeout state and methods.
 * @returns {boolean} return.isWarningVisible - Whether the session timeout warning should be displayed.
 * @returns {number} return.timeRemaining - Time remaining in milliseconds before session expires.
 * @returns {function} return.extendSession - Callback to extend the session and reset the inactivity timer.
 * @returns {boolean} return.isExpired - Whether the session has expired.
 */
export function useSessionTimeout(options = {}) {
  const {
    timeoutMs = config.session.timeoutMs,
    warningMs = config.session.warningMs,
    onExpire,
    onWarning,
  } = options;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMs);
  const [isExpired, setIsExpired] = useState(false);

  const onExpireRef = useRef(onExpire);
  const onWarningRef = useRef(onWarning);
  const warningTriggeredRef = useRef(false);
  const intervalRef = useRef(null);
  const activityThrottleRef = useRef(0);

  // Keep callback refs up to date
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  /**
   * Extends the current session by updating the last activity timestamp.
   * Resets the warning state and re-validates the session.
   *
   * @returns {void}
   */
  const extendSession = useCallback(() => {
    const extended = sessionService.extendSession();

    if (extended) {
      setIsWarningVisible(false);
      setIsExpired(false);
      setTimeRemaining(timeoutMs);
      warningTriggeredRef.current = false;
    }
  }, [timeoutMs]);

  /**
   * Handles user activity events by extending the session.
   * Throttles activity handling to avoid excessive updates.
   *
   * @returns {void}
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();

    // Throttle activity events to once per 30 seconds
    if (now - activityThrottleRef.current < 30000) {
      return;
    }

    activityThrottleRef.current = now;

    // Only auto-extend if the warning is not visible
    // When warning is visible, user must explicitly click extend
    if (!isExpired) {
      const validation = sessionService.validateSession();

      if (validation.valid && !validation.warning) {
        sessionService.extendSession();
        warningTriggeredRef.current = false;
      }
    }
  }, [isExpired]);

  // Set up the interval to check session timeout status
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return;
    }

    /**
     * Checks the current session timeout status and updates state accordingly.
     *
     * @returns {void}
     */
    function checkSessionStatus() {
      const timeoutStatus = sessionService.checkTimeout();

      if (timeoutStatus.expired) {
        setIsExpired(true);
        setIsWarningVisible(false);
        setTimeRemaining(0);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        if (typeof onExpireRef.current === 'function') {
          onExpireRef.current();
        }

        return;
      }

      const remaining = timeoutStatus.timeRemaining != null
        ? timeoutStatus.timeRemaining
        : timeoutMs;

      setTimeRemaining(remaining);

      if (timeoutStatus.warning) {
        setIsWarningVisible(true);

        if (!warningTriggeredRef.current) {
          warningTriggeredRef.current = true;

          if (typeof onWarningRef.current === 'function') {
            onWarningRef.current();
          }
        }
      } else {
        setIsWarningVisible(false);
        warningTriggeredRef.current = false;
      }
    }

    // Run initial check
    checkSessionStatus();

    // Set up periodic checking
    intervalRef.current = setInterval(checkSessionStatus, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timeoutMs, warningMs]);

  // Set up activity event listeners
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return;
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [handleActivity]);

  return {
    isWarningVisible,
    timeRemaining,
    extendSession,
    isExpired,
  };
}

export default useSessionTimeout;