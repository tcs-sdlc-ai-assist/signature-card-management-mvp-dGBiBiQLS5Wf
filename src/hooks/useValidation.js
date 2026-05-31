/**
 * Custom React hook for form validation.
 * Validates required fields, email format, phone format, name patterns.
 * Returns validation state, field-level errors, validateField(), validateForm(),
 * and resetValidation(). Supports real-time inline validation on blur and change events.
 *
 * @module useValidation
 */

import { useState, useCallback, useRef } from 'react';
import { VALIDATION_PATTERNS } from '../constants/constants.js';
import { VALIDATION_MESSAGES } from '../constants/messages.js';

/**
 * Validation rule type definitions.
 * @typedef {Object} ValidationRule
 * @property {boolean} [required] - Whether the field is required.
 * @property {string} [type] - The validation type ('email', 'phone', 'name', 'accountNumber', 'otp', 'ssn', 'zipCode', 'alphanumeric').
 * @property {number} [minLength] - Minimum character length.
 * @property {number} [maxLength] - Maximum character length.
 * @property {RegExp} [pattern] - Custom regex pattern to validate against.
 * @property {string} [patternMessage] - Custom error message for pattern validation failure.
 * @property {string} [matchField] - Name of another field whose value must match this field.
 * @property {string} [matchFieldLabel] - Display label for the matched field (used in error message).
 * @property {function} [custom] - Custom validation function. Receives (value, allValues). Return string error or null/undefined.
 */

/**
 * Validates a single value against a single validation rule.
 *
 * @param {string} value - The field value to validate.
 * @param {ValidationRule} rule - The validation rule to apply.
 * @param {Object} [allValues={}] - All current form values (for cross-field validation).
 * @returns {string|null} An error message string if validation fails, or null if valid.
 */
function validateValue(value, rule, allValues = {}) {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';

  // Required check
  if (rule.required && trimmedValue.length === 0) {
    return VALIDATION_MESSAGES.REQUIRED_FIELD;
  }

  // If value is empty and not required, skip remaining validations
  if (trimmedValue.length === 0) {
    return null;
  }

  // Min length check
  if (typeof rule.minLength === 'number' && trimmedValue.length < rule.minLength) {
    return VALIDATION_MESSAGES.MIN_LENGTH(rule.minLength);
  }

  // Max length check
  if (typeof rule.maxLength === 'number' && trimmedValue.length > rule.maxLength) {
    return VALIDATION_MESSAGES.MAX_LENGTH(rule.maxLength);
  }

  // Type-based validation
  if (rule.type) {
    switch (rule.type) {
      case 'email':
        if (!VALIDATION_PATTERNS.EMAIL.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_EMAIL;
        }
        break;
      case 'phone':
        if (!VALIDATION_PATTERNS.PHONE.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_PHONE;
        }
        break;
      case 'name':
        if (!VALIDATION_PATTERNS.NAME.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_NAME;
        }
        break;
      case 'accountNumber':
        if (!VALIDATION_PATTERNS.ACCOUNT_NUMBER.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_ACCOUNT_NUMBER;
        }
        break;
      case 'otp':
        if (!VALIDATION_PATTERNS.OTP_CODE.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_OTP_CODE;
        }
        break;
      case 'ssn':
        if (!VALIDATION_PATTERNS.SSN.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_SSN;
        }
        break;
      case 'zipCode':
        if (!VALIDATION_PATTERNS.ZIP_CODE.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_ZIP_CODE;
        }
        break;
      case 'alphanumeric':
        if (!VALIDATION_PATTERNS.ALPHANUMERIC.test(trimmedValue)) {
          return VALIDATION_MESSAGES.INVALID_ALPHANUMERIC;
        }
        break;
      default:
        break;
    }
  }

  // Custom pattern check
  if (rule.pattern && rule.pattern instanceof RegExp) {
    if (!rule.pattern.test(trimmedValue)) {
      return rule.patternMessage || 'Invalid format.';
    }
  }

  // Match field check (e.g., confirm password)
  if (rule.matchField && typeof rule.matchField === 'string') {
    const matchValue = allValues[rule.matchField];
    if (typeof matchValue === 'string' && trimmedValue !== matchValue.trim()) {
      const label = rule.matchFieldLabel || rule.matchField;
      return VALIDATION_MESSAGES.FIELD_MISMATCH(label);
    }
  }

  // Custom validation function
  if (typeof rule.custom === 'function') {
    const customError = rule.custom(trimmedValue, allValues);
    if (customError && typeof customError === 'string') {
      return customError;
    }
  }

  return null;
}

/**
 * Custom React hook for form validation.
 * Provides field-level and form-level validation with real-time inline support.
 *
 * @param {Object<string, ValidationRule>} validationRules - A map of field names to their validation rules.
 * @param {Object} [initialValues={}] - Optional initial form values.
 * @returns {Object} Validation state and methods.
 * @returns {Object<string, string|null>} return.errors - A map of field names to error messages (null if valid).
 * @returns {boolean} return.isValid - Whether the entire form is currently valid (no errors).
 * @returns {Object<string, boolean>} return.touched - A map of field names to whether they have been touched (blurred).
 * @returns {function} return.validateField - Validates a single field by name. Signature: (fieldName: string, value: string, allValues?: Object) => string|null.
 * @returns {function} return.validateForm - Validates all fields. Signature: (values: Object) => { isValid: boolean, errors: Object }.
 * @returns {function} return.resetValidation - Resets all validation state (errors, touched).
 * @returns {function} return.setFieldError - Manually sets an error for a field. Signature: (fieldName: string, error: string|null) => void.
 * @returns {function} return.setFieldTouched - Manually marks a field as touched. Signature: (fieldName: string, isTouched?: boolean) => void.
 * @returns {function} return.getFieldError - Returns the error for a field only if it has been touched. Signature: (fieldName: string) => string|null.
 * @returns {function} return.handleBlur - Event handler for blur events that validates the field. Signature: (fieldName: string, value: string, allValues?: Object) => void.
 * @returns {function} return.handleChange - Event handler for change events that re-validates touched fields. Signature: (fieldName: string, value: string, allValues?: Object) => void.
 */
export function useValidation(validationRules = {}, initialValues = {}) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const rulesRef = useRef(validationRules);
  rulesRef.current = validationRules;

  /**
   * Validates a single field by name.
   *
   * @param {string} fieldName - The name of the field to validate.
   * @param {string} value - The current value of the field.
   * @param {Object} [allValues={}] - All current form values (for cross-field validation).
   * @returns {string|null} The error message, or null if valid.
   */
  const validateField = useCallback((fieldName, value, allValues = {}) => {
    const rule = rulesRef.current[fieldName];

    if (!rule) {
      return null;
    }

    const error = validateValue(value, rule, allValues);

    setErrors((prev) => {
      if (prev[fieldName] === error) {
        return prev;
      }
      return {
        ...prev,
        [fieldName]: error,
      };
    });

    return error;
  }, []);

  /**
   * Validates all fields in the form.
   *
   * @param {Object} values - A map of field names to their current values.
   * @returns {Object} Result with shape { isValid: boolean, errors: Object<string, string|null> }.
   */
  const validateForm = useCallback((values = {}) => {
    const rules = rulesRef.current;
    const newErrors = {};
    let formIsValid = true;

    const allFieldNames = new Set([
      ...Object.keys(rules),
      ...Object.keys(values),
    ]);

    for (const fieldName of allFieldNames) {
      const rule = rules[fieldName];

      if (!rule) {
        continue;
      }

      const value = values[fieldName] !== undefined ? values[fieldName] : '';
      const error = validateValue(value, rule, values);

      newErrors[fieldName] = error;

      if (error) {
        formIsValid = false;
      }
    }

    // Mark all fields as touched
    const newTouched = {};
    for (const fieldName of Object.keys(rules)) {
      newTouched[fieldName] = true;
    }

    setErrors(newErrors);
    setTouched(newTouched);

    return {
      isValid: formIsValid,
      errors: newErrors,
    };
  }, []);

  /**
   * Resets all validation state (errors and touched).
   *
   * @returns {void}
   */
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Manually sets an error for a specific field.
   *
   * @param {string} fieldName - The name of the field.
   * @param {string|null} error - The error message, or null to clear.
   * @returns {void}
   */
  const setFieldError = useCallback((fieldName, error) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  }, []);

  /**
   * Manually marks a field as touched or untouched.
   *
   * @param {string} fieldName - The name of the field.
   * @param {boolean} [isTouched=true] - Whether the field is touched.
   * @returns {void}
   */
  const setFieldTouched = useCallback((fieldName, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: isTouched,
    }));
  }, []);

  /**
   * Returns the error for a field only if it has been touched.
   *
   * @param {string} fieldName - The name of the field.
   * @returns {string|null} The error message if the field is touched and has an error, otherwise null.
   */
  const getFieldError = useCallback((fieldName) => {
    if (!touched[fieldName]) {
      return null;
    }
    return errors[fieldName] || null;
  }, [errors, touched]);

  /**
   * Event handler for blur events. Marks the field as touched and validates it.
   *
   * @param {string} fieldName - The name of the field.
   * @param {string} value - The current value of the field.
   * @param {Object} [allValues={}] - All current form values.
   * @returns {void}
   */
  const handleBlur = useCallback((fieldName, value, allValues = {}) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    validateField(fieldName, value, allValues);
  }, [validateField]);

  /**
   * Event handler for change events. Re-validates the field only if it has been touched.
   *
   * @param {string} fieldName - The name of the field.
   * @param {string} value - The current value of the field.
   * @param {Object} [allValues={}] - All current form values.
   * @returns {void}
   */
  const handleChange = useCallback((fieldName, value, allValues = {}) => {
    setTouched((prev) => {
      if (prev[fieldName]) {
        // Already touched — validate inline
        validateField(fieldName, value, allValues);
      }
      return prev;
    });
  }, [validateField]);

  // Compute isValid: true if no field has a non-null error
  const hasErrors = Object.values(errors).some((error) => error !== null && error !== undefined);
  const isValid = !hasErrors;

  return {
    errors,
    isValid,
    touched,
    validateField,
    validateForm,
    resetValidation,
    setFieldError,
    setFieldTouched,
    getFieldError,
    handleBlur,
    handleChange,
  };
}

export default useValidation;