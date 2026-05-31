/**
 * Reusable floating label input component following HB CSS form patterns.
 * Supports text/email/tel/password types, floating label animation,
 * show/hide toggle for password, inline validation error display (.invaliderr),
 * required indicator, and ARIA attributes for accessibility.
 *
 * @module FloatingLabelInput
 */

import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Allowed input type values.
 * @type {Array<string>}
 */
const ALLOWED_TYPES = ['text', 'email', 'tel', 'password'];

/**
 * FloatingLabelInput component for form fields with floating label animation.
 * Uses HB CSS framework form patterns for styling and includes
 * ARIA attributes for screen reader accessibility.
 *
 * @param {Object} props - Component props.
 * @param {string} props.id - The unique identifier for the input element.
 * @param {string} props.label - The label text displayed for the input.
 * @param {string} [props.type='text'] - The input type ('text', 'email', 'tel', 'password').
 * @param {string} [props.name] - The name attribute for the input element.
 * @param {string} [props.value=''] - The current value of the input.
 * @param {function} [props.onChange] - Callback invoked when the input value changes. Signature: (event: React.ChangeEvent) => void.
 * @param {function} [props.onBlur] - Callback invoked when the input loses focus. Signature: (event: React.FocusEvent) => void.
 * @param {function} [props.onFocus] - Callback invoked when the input gains focus. Signature: (event: React.FocusEvent) => void.
 * @param {boolean} [props.required=false] - Whether the input is required.
 * @param {boolean} [props.disabled=false] - Whether the input is disabled.
 * @param {boolean} [props.readOnly=false] - Whether the input is read-only.
 * @param {string} [props.error] - The inline validation error message to display.
 * @param {string} [props.placeholder] - The placeholder text (used for floating label positioning).
 * @param {string} [props.autoComplete] - The autocomplete attribute value.
 * @param {number} [props.maxLength] - The maximum number of characters allowed.
 * @param {string} [props.className] - Additional CSS class names to apply to the container.
 * @param {string} [props.ariaLabel] - Custom aria-label for the input.
 * @param {string} [props.ariaDescribedBy] - Custom aria-describedby for the input.
 * @param {string} [props.inputMode] - The inputMode attribute for mobile keyboards.
 * @param {string} [props.pattern] - The pattern attribute for native validation.
 * @returns {React.ReactElement} The rendered FloatingLabelInput component.
 */
function FloatingLabelInput({
  id,
  label,
  type,
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  required,
  disabled,
  readOnly,
  error,
  placeholder,
  autoComplete,
  maxLength,
  className,
  ariaLabel,
  ariaDescribedBy,
  inputMode,
  pattern,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  const normalizedType = ALLOWED_TYPES.includes(type) ? type : 'text';
  const isPassword = normalizedType === 'password';
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const isFloating = isFocused || hasValue;
  const hasError = !!error;
  const errorId = hasError ? `${id}-error` : undefined;

  /**
   * Computes the effective aria-describedby value.
   * Combines the custom ariaDescribedBy with the error ID if present.
   *
   * @returns {string|undefined} The combined aria-describedby value.
   */
  function getAriaDescribedBy() {
    const parts = [];
    if (ariaDescribedBy) {
      parts.push(ariaDescribedBy);
    }
    if (errorId) {
      parts.push(errorId);
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  /**
   * Handles the input focus event.
   *
   * @param {React.FocusEvent} event - The focus event.
   * @returns {void}
   */
  const handleFocus = useCallback((event) => {
    setIsFocused(true);
    if (typeof onFocus === 'function') {
      onFocus(event);
    }
  }, [onFocus]);

  /**
   * Handles the input blur event.
   *
   * @param {React.FocusEvent} event - The blur event.
   * @returns {void}
   */
  const handleBlur = useCallback((event) => {
    setIsFocused(false);
    if (typeof onBlur === 'function') {
      onBlur(event);
    }
  }, [onBlur]);

  /**
   * Handles the input change event.
   *
   * @param {React.ChangeEvent} event - The change event.
   * @returns {void}
   */
  const handleChange = useCallback((event) => {
    if (typeof onChange === 'function') {
      onChange(event);
    }
  }, [onChange]);

  /**
   * Toggles the password visibility.
   *
   * @returns {void}
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
    // Refocus the input after toggling
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Determines the effective input type.
   * If the input is a password field and showPassword is true, returns 'text'.
   *
   * @returns {string} The effective input type.
   */
  function getEffectiveType() {
    if (isPassword && showPassword) {
      return 'text';
    }
    return normalizedType;
  }

  const containerClassName = [
    'hb-form-group',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClassName}
      style={{
        position: 'relative',
        marginBottom: 'var(--spacing-md, 1rem)',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          id={id}
          name={name || id}
          type={getEffectiveType()}
          value={value !== undefined && value !== null ? value : ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={isFloating ? (placeholder || ' ') : ' '}
          autoComplete={autoComplete}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          aria-label={ariaLabel || undefined}
          aria-describedby={getAriaDescribedBy()}
          aria-invalid={hasError ? 'true' : undefined}
          aria-required={required ? 'true' : undefined}
          className={hasError ? 'hb-form-control invaliderr' : 'hb-form-control'}
          style={{
            width: '100%',
            padding: isFloating
              ? 'var(--spacing-lg, 1.5rem) var(--spacing-md, 1rem) var(--spacing-xs, 0.25rem)'
              : 'var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem)',
            paddingRight: isPassword ? '3rem' : 'var(--spacing-md, 1rem)',
            fontSize: 'var(--font-size-base, 16px)',
            fontFamily: 'var(--font-family)',
            lineHeight: 'var(--line-height-base, 1.5)',
            color: disabled ? 'var(--color-gray-500, #adb5bd)' : 'var(--color-body, #292929)',
            backgroundColor: disabled ? 'var(--color-gray-100, #f8f9fa)' : 'var(--color-white, #ffffff)',
            border: hasError
              ? '1px solid var(--color-danger, #dc3545)'
              : isFocused
                ? '1px solid var(--color-primary, #00468b)'
                : '1px solid var(--color-gray-400, #ced4da)',
            borderRadius: 'var(--radius-md, 0.375rem)',
            outline: 'none',
            boxShadow: isFocused && !hasError
              ? '0 0 0 2px rgba(0, 70, 139, 0.15)'
              : isFocused && hasError
                ? '0 0 0 2px rgba(220, 53, 69, 0.15)'
                : 'none',
            transition: 'border-color var(--transition-fast, 150ms ease-in-out), box-shadow var(--transition-fast, 150ms ease-in-out), padding var(--transition-fast, 150ms ease-in-out)',
            cursor: disabled ? 'not-allowed' : 'text',
            boxSizing: 'border-box',
          }}
        />
        <label
          htmlFor={id}
          style={{
            position: 'absolute',
            left: 'var(--spacing-md, 1rem)',
            top: isFloating ? '0.35rem' : '50%',
            transform: isFloating ? 'none' : 'translateY(-50%)',
            fontSize: isFloating ? 'var(--font-size-sm, 0.875rem)' : 'var(--font-size-base, 16px)',
            color: hasError
              ? 'var(--color-danger, #dc3545)'
              : isFocused
                ? 'var(--color-primary, #00468b)'
                : 'var(--color-gray-600, #6c757d)',
            pointerEvents: 'none',
            transition: 'all var(--transition-fast, 150ms ease-in-out)',
            lineHeight: 1,
            fontFamily: 'var(--font-family)',
            fontWeight: isFloating ? 500 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: isPassword ? 'calc(100% - 4rem)' : 'calc(100% - 2rem)',
          }}
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              style={{
                color: 'var(--color-danger, #dc3545)',
                marginLeft: '0.15rem',
              }}
            >
              *
            </span>
          )}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
            style={{
              position: 'absolute',
              right: 'var(--spacing-sm, 0.5rem)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: 'var(--spacing-xs, 0.25rem)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              color: 'var(--color-gray-600, #6c757d)',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.5 : 1,
            }}
            disabled={disabled}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hasError && (
        <div
          id={errorId}
          className="invaliderr"
          role="alert"
          aria-live="polite"
          style={{
            color: 'var(--color-danger, #dc3545)',
            fontSize: 'var(--font-size-sm, 0.875rem)',
            marginTop: 'var(--spacing-xs, 0.25rem)',
            lineHeight: 'var(--line-height-base, 1.5)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

FloatingLabelInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['text', 'email', 'tel', 'password']),
  name: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string,
  maxLength: PropTypes.number,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
  ariaDescribedBy: PropTypes.string,
  inputMode: PropTypes.string,
  pattern: PropTypes.string,
};

FloatingLabelInput.defaultProps = {
  type: 'text',
  name: undefined,
  value: '',
  onChange: undefined,
  onBlur: undefined,
  onFocus: undefined,
  required: false,
  disabled: false,
  readOnly: false,
  error: undefined,
  placeholder: undefined,
  autoComplete: undefined,
  maxLength: undefined,
  className: undefined,
  ariaLabel: undefined,
  ariaDescribedBy: undefined,
  inputMode: undefined,
  pattern: undefined,
};

export default FloatingLabelInput;