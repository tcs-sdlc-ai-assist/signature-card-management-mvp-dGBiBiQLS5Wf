/**
 * Reusable modal dialog component using HB CSS framework classes.
 * Supports title, body content, confirm/cancel buttons, focus trapping,
 * ESC key close, and ARIA attributes for accessibility compliance.
 * Used for confirmation dialogs, session timeout warning, and exit confirmation.
 *
 * @module Modal
 */

import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Array of CSS selectors for focusable elements within the modal.
 * Used for focus trapping to keep keyboard navigation within the modal.
 * @type {string}
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Modal component for displaying dialog overlays.
 * Uses HB CSS framework modal classes for styling and includes
 * ARIA attributes, focus trapping, and ESC key handling for accessibility.
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.isOpen - Whether the modal is currently visible.
 * @param {function} props.onClose - Callback invoked when the modal is closed (via ESC, overlay click, or cancel button).
 * @param {string} [props.title] - The modal title text displayed in the header.
 * @param {React.ReactNode} [props.children] - The modal body content.
 * @param {string} [props.confirmLabel='Confirm'] - The label for the confirm/primary action button.
 * @param {string} [props.cancelLabel='Cancel'] - The label for the cancel/secondary action button.
 * @param {function} [props.onConfirm] - Callback invoked when the confirm button is clicked.
 * @param {boolean} [props.showConfirm=true] - Whether to show the confirm button.
 * @param {boolean} [props.showCancel=true] - Whether to show the cancel button.
 * @param {boolean} [props.closeOnOverlayClick=true] - Whether clicking the overlay backdrop closes the modal.
 * @param {boolean} [props.closeOnEsc=true] - Whether pressing the ESC key closes the modal.
 * @param {string} [props.className] - Additional CSS class names to apply to the modal dialog.
 * @param {string} [props.size] - Optional modal size modifier ('sm', 'lg').
 * @param {string} [props.ariaLabel] - Custom aria-label for the modal dialog (defaults to title).
 * @param {boolean} [props.confirmDisabled=false] - Whether the confirm button is disabled.
 * @returns {React.ReactElement|null} The rendered Modal component, or null if not open.
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  showConfirm,
  showCancel,
  closeOnOverlayClick,
  closeOnEsc,
  className,
  size,
  ariaLabel,
  confirmDisabled,
}) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  /**
   * Returns all focusable elements within the modal.
   *
   * @returns {Array<HTMLElement>} An array of focusable elements.
   */
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) {
      return [];
    }

    const elements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
    return Array.from(elements);
  }, []);

  /**
   * Handles keydown events for ESC key close and focus trapping.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   * @returns {void}
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && closeOnEsc) {
      event.stopPropagation();
      if (typeof onClose === 'function') {
        onClose();
      }
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [closeOnEsc, onClose, getFocusableElements]);

  /**
   * Handles overlay backdrop click events.
   *
   * @param {React.MouseEvent} event - The click event.
   * @returns {void}
   */
  function handleOverlayClick(event) {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      if (typeof onClose === 'function') {
        onClose();
      }
    }
  }

  /**
   * Handles the confirm button click event.
   *
   * @returns {void}
   */
  function handleConfirm() {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  }

  /**
   * Handles the cancel button click event.
   *
   * @returns {void}
   */
  function handleCancel() {
    if (typeof onClose === 'function') {
      onClose();
    }
  }

  // Manage focus when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore later
      previousActiveElementRef.current = document.activeElement;

      // Prevent body scrolling while modal is open
      document.body.style.overflow = 'hidden';

      // Focus the first focusable element in the modal after render
      const timeoutId = setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 0);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // Restore body scrolling
      document.body.style.overflow = '';

      // Restore focus to the previously focused element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [isOpen, getFocusableElements]);

  // Attach keydown listener when modal is open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const dialogClassNames = [
    'hb-modal-dialog-centered',
    size === 'sm' ? 'hb-modal-sm' : null,
    size === 'lg' ? 'hb-modal-lg' : null,
    className,
  ].filter(Boolean).join(' ');

  const effectiveAriaLabel = ariaLabel || title || 'Dialog';

  return (
    <div
      className="hb-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
      }}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={dialogClassNames}
        role="dialog"
        aria-modal="true"
        aria-label={effectiveAriaLabel}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--color-white, #ffffff)',
          borderRadius: 'var(--radius-lg, 0.5rem)',
          boxShadow: 'var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1))',
          maxWidth: size === 'sm' ? '400px' : size === 'lg' ? '800px' : '600px',
          width: '90%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem)',
              borderBottom: '1px solid var(--color-gray-300, #dee2e6)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--font-size-xl, 1.25rem)',
                fontWeight: 500,
                color: 'var(--color-body, #292929)',
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--spacing-xs, 0.25rem)',
                fontSize: 'var(--font-size-2xl, 1.5rem)',
                lineHeight: 1,
                opacity: 0.7,
                color: 'var(--color-body, #292929)',
              }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div
          style={{
            padding: 'var(--spacing-lg, 1.5rem)',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {(showConfirm || showCancel) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 'var(--spacing-sm, 0.5rem)',
              padding: 'var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem)',
              borderTop: '1px solid var(--color-gray-300, #dee2e6)',
            }}
          >
            {showCancel && (
              <button
                type="button"
                className="hb-btn hb-btn-secondary"
                onClick={handleCancel}
                style={{
                  padding: 'var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem)',
                  borderRadius: 'var(--radius-md, 0.375rem)',
                  border: '1px solid var(--color-gray-400, #ced4da)',
                  backgroundColor: 'var(--color-white, #ffffff)',
                  color: 'var(--color-body, #292929)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-base, 16px)',
                }}
              >
                {cancelLabel}
              </button>
            )}
            {showConfirm && (
              <button
                type="button"
                className="hb-btn hb-btn-primary"
                onClick={handleConfirm}
                disabled={confirmDisabled}
                style={{
                  padding: 'var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem)',
                  borderRadius: 'var(--radius-md, 0.375rem)',
                  border: 'none',
                  backgroundColor: confirmDisabled
                    ? 'var(--color-gray-400, #ced4da)'
                    : 'var(--color-primary, #00468b)',
                  color: 'var(--color-white, #ffffff)',
                  cursor: confirmDisabled ? 'not-allowed' : 'pointer',
                  fontSize: 'var(--font-size-base, 16px)',
                  opacity: confirmDisabled ? 0.65 : 1,
                }}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func,
  showConfirm: PropTypes.bool,
  showCancel: PropTypes.bool,
  closeOnOverlayClick: PropTypes.bool,
  closeOnEsc: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'lg']),
  ariaLabel: PropTypes.string,
  confirmDisabled: PropTypes.bool,
};

Modal.defaultProps = {
  title: undefined,
  children: undefined,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  onConfirm: undefined,
  showConfirm: true,
  showCancel: true,
  closeOnOverlayClick: true,
  closeOnEsc: true,
  className: undefined,
  size: undefined,
  ariaLabel: undefined,
  confirmDisabled: false,
};

export default Modal;