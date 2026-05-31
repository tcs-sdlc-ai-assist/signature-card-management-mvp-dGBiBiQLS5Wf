/**
 * Reusable alert/notification component using HB CSS framework classes.
 * Supports error, warning, success, and info alert types with optional dismiss functionality.
 * Includes ARIA role="alert" for accessibility compliance.
 *
 * @module Alert
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ALERT_TYPES } from '../../constants/constants.js';

/**
 * Maps alert type values to their corresponding HB CSS framework class names.
 * @type {Object<string, string>}
 */
const ALERT_CLASS_MAP = {
  [ALERT_TYPES.ERROR]: 'hb-alert-critical',
  [ALERT_TYPES.WARNING]: 'hb-alert-warning',
  [ALERT_TYPES.SUCCESS]: 'hb-alert-success',
  [ALERT_TYPES.INFO]: 'hb-alert-info',
};

/**
 * Maps alert type values to their default ARIA live politeness settings.
 * @type {Object<string, string>}
 */
const ARIA_LIVE_MAP = {
  [ALERT_TYPES.ERROR]: 'assertive',
  [ALERT_TYPES.WARNING]: 'assertive',
  [ALERT_TYPES.SUCCESS]: 'polite',
  [ALERT_TYPES.INFO]: 'polite',
};

/**
 * Normalizes the alert type string to a valid ALERT_TYPES value.
 * Accepts lowercase or uppercase variants (e.g., 'error', 'ERROR').
 * Defaults to ALERT_TYPES.INFO if the type is not recognized.
 *
 * @param {string} type - The alert type string to normalize.
 * @returns {string} A valid ALERT_TYPES value.
 */
function normalizeType(type) {
  if (!type || typeof type !== 'string') {
    return ALERT_TYPES.INFO;
  }

  const upper = type.toUpperCase();

  if (Object.values(ALERT_TYPES).includes(upper)) {
    return upper;
  }

  return ALERT_TYPES.INFO;
}

/**
 * Alert component for displaying notification messages to the user.
 * Uses HB CSS framework alert classes for styling and includes
 * ARIA attributes for screen reader accessibility.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.type='info'] - The alert type ('error', 'warning', 'success', 'info').
 * @param {string} props.message - The alert message text to display.
 * @param {boolean} [props.dismissible=false] - Whether the alert can be dismissed by the user.
 * @param {function} [props.onDismiss] - Callback invoked when the dismiss button is clicked.
 * @param {string} [props.className] - Additional CSS class names to apply to the alert container.
 * @param {React.ReactNode} [props.children] - Optional child content to render inside the alert (used instead of or in addition to message).
 * @returns {React.ReactElement|null} The rendered Alert component, or null if no message or children are provided.
 */
function Alert({ type, message, dismissible, onDismiss, className, children }) {
  const normalizedType = normalizeType(type);
  const alertClass = ALERT_CLASS_MAP[normalizedType] || 'hb-alert-info';
  const ariaLive = ARIA_LIVE_MAP[normalizedType] || 'polite';

  // Do not render if there is no message and no children
  if (!message && !children) {
    return null;
  }

  const combinedClassName = [alertClass, className].filter(Boolean).join(' ');

  /**
   * Handles the dismiss button click event.
   *
   * @returns {void}
   */
  function handleDismiss() {
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  }

  return (
    <div
      className={combinedClassName}
      role="alert"
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {message && <span>{message}</span>}
          {children}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 0 var(--spacing-sm, 0.5rem)',
              fontSize: 'var(--font-size-lg, 1.125rem)',
              lineHeight: 1,
              opacity: 0.7,
              color: 'inherit',
            }}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

Alert.propTypes = {
  type: PropTypes.oneOf(['error', 'warning', 'success', 'info', 'ERROR', 'WARNING', 'SUCCESS', 'INFO']),
  message: PropTypes.string,
  dismissible: PropTypes.bool,
  onDismiss: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

Alert.defaultProps = {
  type: 'info',
  message: undefined,
  dismissible: false,
  onDismiss: undefined,
  className: undefined,
  children: undefined,
};

export default Alert;