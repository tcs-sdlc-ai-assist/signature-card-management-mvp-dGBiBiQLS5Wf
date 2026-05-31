/**
 * React Context provider for session state management.
 * Provides authenticated user info, session status, login/logout handlers,
 * session timeout state, and token validation status.
 * Wraps the entire app to make session data available to all components.
 *
 * @module SessionContext
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as authService from '../services/authService.js';
import * as sessionService from '../services/sessionService.js';
import * as tokenService from '../services/tokenService.js';
import { useSessionTimeout } from '../hooks/useSessionTimeout.js';
import { useAuditLog } from '../hooks/useAuditLog.js';
import { AUDIT_EVENTS } from '../constants/constants.js';
import { LOGIN_MESSAGES } from '../constants/messages.js';

/**
 * @typedef {Object} SessionContextValue
 * @property {Object|null} user - The currently authenticated user profile, or null if not authenticated.
 * @property {boolean} isAuthenticated - Whether the user is currently authenticated.
 * @property {boolean} isLoading - Whether a login/logout operation is in progress.
 * @property {string|null} error - The most recent authentication error message, or null.
 * @property {boolean} isWarningVisible - Whether the session timeout warning should be displayed.
 * @property {number} timeRemaining - Time remaining in milliseconds before session expires.
 * @property {boolean} isExpired - Whether the session has expired.
 * @property {Object|null} tokenStatus - The current eSign token validation status, or null.
 * @property {function} login - Authenticates a user with username and password. Signature: (username: string, password: string) => Promise<Object>.
 * @property {function} logout - Logs out the current user. Signature: () => void.
 * @property {function} extendSession - Extends the current session. Signature: () => void.
 * @property {function} validateESignToken - Validates an eSign token. Signature: (token: string) => Object.
 * @property {function} clearError - Clears the current error message. Signature: () => void.
 */

/** @type {React.Context<SessionContextValue>} */
const SessionContext = createContext(null);

/**
 * Custom hook to access the SessionContext value.
 * Throws an error if used outside of a SessionProvider.
 *
 * @returns {SessionContextValue} The session context value.
 */
export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within a SessionProvider.');
  }

  return context;
}

/**
 * SessionProvider component that wraps the application and provides
 * session state management to all child components via React Context.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render within the provider.
 * @returns {React.ReactElement} The SessionProvider component.
 */
export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState(null);

  const { logEvent } = useAuditLog();

  /**
   * Handles session expiration by clearing user state and logging the event.
   *
   * @returns {void}
   */
  const handleSessionExpire = useCallback(() => {
    sessionService.invalidateSession('Session timeout exceeded');
    setUser(null);
    setIsAuthenticated(false);
    setError(LOGIN_MESSAGES.SESSION_EXPIRED);
    setTokenStatus(null);
  }, []);

  /**
   * Handles session warning trigger.
   *
   * @returns {void}
   */
  const handleSessionWarning = useCallback(() => {
    // Warning state is managed by useSessionTimeout hook
  }, []);

  const {
    isWarningVisible,
    timeRemaining,
    extendSession,
    isExpired,
  } = useSessionTimeout({
    onExpire: handleSessionExpire,
    onWarning: handleSessionWarning,
  });

  // Sync authentication state on mount and when storage changes
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const authenticated = authService.isAuthenticated();

    setUser(currentUser);
    setIsAuthenticated(authenticated);

    if (!authenticated && currentUser === null) {
      setTokenStatus(null);
    }
  }, []);

  // Handle session expiration from the hook
  useEffect(() => {
    if (isExpired && isAuthenticated) {
      setUser(null);
      setIsAuthenticated(false);
      setError(LOGIN_MESSAGES.SESSION_EXPIRED);
      setTokenStatus(null);
    }
  }, [isExpired, isAuthenticated]);

  /**
   * Authenticates a user with the provided username and password.
   *
   * @param {string} username - The username to authenticate.
   * @param {string} password - The password to authenticate.
   * @returns {Promise<Object>} Result object with shape { success: boolean, user?: Object, error?: string, attemptsRemaining?: number, locked?: boolean }.
   */
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = authService.login(username, password);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        setError(null);
        setTokenStatus(null);

        return {
          success: true,
          user: result.user,
        };
      }

      setError(result.error || LOGIN_MESSAGES.INVALID_CREDENTIALS);

      return {
        success: false,
        error: result.error || LOGIN_MESSAGES.INVALID_CREDENTIALS,
        attemptsRemaining: result.attemptsRemaining,
        locked: result.locked || false,
      };
    } catch (err) {
      console.error('SessionContext.login failed:', err);
      const errorMessage = 'An unexpected error occurred. Please try again later.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logs out the current user by clearing all session data.
   *
   * @returns {void}
   */
  const logout = useCallback(() => {
    try {
      const currentUser = authService.getCurrentUser();

      authService.logout();
      tokenService.clearTokenData();

      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setTokenStatus(null);

      if (currentUser) {
        logEvent(AUDIT_EVENTS.LOGOUT, {
          userId: currentUser.id,
          context: { reason: 'User initiated logout' },
        });
      }
    } catch (err) {
      console.error('SessionContext.logout failed:', err);
      // Force clear state even if service calls fail
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setTokenStatus(null);
    }
  }, [logEvent]);

  /**
   * Validates an eSign token and updates the token status state.
   *
   * @param {string} token - The eSign token string to validate.
   * @returns {Object} Result object from tokenService.validateToken.
   */
  const validateESignToken = useCallback((token) => {
    try {
      const result = tokenService.validateToken(token);

      setTokenStatus({
        valid: result.valid,
        status: result.status || null,
        error: result.error || null,
        expired: result.expired || false,
        tokenRecord: result.tokenRecord || null,
      });

      return result;
    } catch (err) {
      console.error('SessionContext.validateESignToken failed:', err);

      const errorResult = {
        valid: false,
        status: tokenService.TOKEN_STATUS.INVALID,
        error: 'An unexpected error occurred while validating the token.',
      };

      setTokenStatus({
        valid: false,
        status: tokenService.TOKEN_STATUS.INVALID,
        error: errorResult.error,
        expired: false,
        tokenRecord: null,
      });

      return errorResult;
    }
  }, []);

  /**
   * Clears the current error message.
   *
   * @returns {void}
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    error,
    isWarningVisible,
    timeRemaining,
    isExpired,
    tokenStatus,
    login,
    logout,
    extendSession,
    validateESignToken,
    clearError,
  }), [
    user,
    isAuthenticated,
    isLoading,
    error,
    isWarningVisible,
    timeRemaining,
    isExpired,
    tokenStatus,
    login,
    logout,
    extendSession,
    validateESignToken,
    clearError,
  ]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

SessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SessionContext;