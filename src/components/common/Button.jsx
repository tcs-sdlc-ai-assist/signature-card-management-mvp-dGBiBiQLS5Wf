/**
 * Reusable button component wrapping HB CSS framework button classes.
 * Supports variant (primary/secondary), disabled state, loading state with spinner,
 * onClick handler, type (button/submit), and ARIA attributes for accessibility.
 *
 * @module Button
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button variant values.
 * @enum {string}
 */
const VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
};

/**
 * Maps button variant values to their corresponding HB CSS framework class names.
 * @type {Object<string, string>}
 */
const VARIANT_CLASS_MAP = {
  [VARIANTS.PRIMARY]: 'hb-btn hb-btn-primary',
  [VARIANTS.SECONDARY]: 'hb-btn hb-btn-secondary',
};

/**
 * Normalizes the variant string to a valid variant value.
 * Accepts lowercase or uppercase variants (e.g., 'primary', 'PRIMARY').
 * Defaults to 'primary' if the variant is not recognized.
 *
 * @param {string} variant - The variant string to normalize.
 * @returns {string} A valid variant value.
 */
function normalizeVariant(variant) {
  if (!variant || typeof variant !== 'string') {
    return VARIANTS.PRIMARY;
  }

  const lower = variant.toLowerCase();

  if (lower === VARIANTS.PRIMARY || lower === VARIANTS.SECONDARY) {
    return lower;
  }

  return VARIANTS.PRIMARY;
}

/**
 * Button component for user interactions.
 * Uses HB CSS framework button classes for styling and includes
 * ARIA attributes for accessibility. Supports loading state with a spinner
 * and disabled state.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.variant='primary'] - The button variant ('primary' or 'secondary').
 * @param {string} [props.type='button'] - The HTML button type ('button' or 'submit').
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {boolean} [props.loading=false] - Whether the button is in a loading state.
 * @param {string} [props.loadingText='Loading...'] - Text to display when the button is in a loading state.
 * @param {function} [props.onClick] - Callback invoked when the button is clicked.
 * @param {string} [props.className] - Additional CSS class names to apply to the button.
 * @param {string} [props.ariaLabel] - Custom aria-label for the button.
 * @param {React.ReactNode} [props.children] - The button content.
 * @returns {React.ReactElement} The rendered Button component.
 */
function Button({
  variant,
  type,
  disabled,
  loading,
  loadingText,
  onClick,
  className,
  ariaLabel,
  children,
}) {
  const normalizedVariant = normalizeVariant(variant);
  const variantClass = VARIANT_CLASS_MAP[normalizedVariant] || VARIANT_CLASS_MAP[VARIANTS.PRIMARY];

  const isDisabled = disabled || loading;

  const combinedClassName = [variantClass, className].filter(Boolean).join(' ');

  /**
   * Handles the button click event.
   * Prevents click when the button is disabled or loading.
   *
   * @param {React.MouseEvent} event - The click event.
   * @returns {void}
   */
  function handleClick(event) {
    if (isDisabled) {
      event.preventDefault();
      return;
    }

    if (typeof onClick === 'function') {
      onClick(event);
    }
  }

  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      className={combinedClassName}
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={ariaLabel || undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-sm, 0.5rem)',
        padding: 'var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem)',
        borderRadius: 'var(--radius-md, 0.375rem)',
        border: normalizedVariant === VARIANTS.SECONDARY
          ? '1px solid var(--color-gray-400, #ced4da)'
          : 'none',
        backgroundColor: isDisabled
          ? 'var(--color-gray-400, #ced4da)'
          : normalizedVariant === VARIANTS.PRIMARY
            ? 'var(--color-primary, #00468b)'
            : 'var(--color-white, #ffffff)',
        color: normalizedVariant === VARIANTS.PRIMARY || isDisabled
          ? 'var(--color-white, #ffffff)'
          : 'var(--color-body, #292929)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: 'var(--font-size-base, 16px)',
        fontFamily: 'var(--font-family)',
        fontWeight: 500,
        lineHeight: 'var(--line-height-base, 1.5)',
        opacity: isDisabled ? 0.65 : 1,
        transition: 'background-color var(--transition-fast, 150ms ease-in-out), opacity var(--transition-fast, 150ms ease-in-out)',
      }}
    >
      {loading && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: 'var(--radius-full, 9999px)',
            animation: 'button-spinner 0.6s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      <span>{loading ? loadingText : children}</span>
      <style>{`
        @keyframes button-spinner {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'PRIMARY', 'SECONDARY']),
  type: PropTypes.oneOf(['button', 'submit']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  loadingText: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
  children: PropTypes.node,
};

Button.defaultProps = {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
  loadingText: 'Loading...',
  onClick: undefined,
  className: undefined,
  ariaLabel: undefined,
  children: undefined,
};

export default Button;