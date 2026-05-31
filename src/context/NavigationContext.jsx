/**
 * React Context provider for workflow navigation state management.
 * Tracks current step, completed steps, provides navigation methods,
 * enforces step sequence, and prevents forward navigation to unreached steps.
 *
 * @module NavigationContext
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { STEPS } from '../constants/constants.js';
import { CONFIRMATION_MESSAGES } from '../constants/messages.js';

/**
 * Ordered array of workflow steps defining the valid step sequence.
 * @type {Array<string>}
 */
const STEP_ORDER = [
  STEPS.SEARCH,
  STEPS.SELECT_ACCOUNT,
  STEPS.REVIEW_SIGNERS,
  STEPS.EDIT_SIGNERS,
  STEPS.REVIEW_CHANGES,
  STEPS.SUBMIT,
  STEPS.CONFIRMATION,
];

/**
 * @typedef {Object} NavigationContextValue
 * @property {string} currentStep - The current active workflow step.
 * @property {number} currentStepIndex - The zero-based index of the current step in the step sequence.
 * @property {Set<string>} completedSteps - The set of completed step identifiers.
 * @property {Array<string>} stepOrder - The ordered array of all workflow steps.
 * @property {function} goToStep - Navigates to a specific step if allowed. Signature: (step: string) => boolean.
 * @property {function} goToNextStep - Navigates to the next step in the sequence. Signature: () => boolean.
 * @property {function} goToPreviousStep - Navigates to the previous step in the sequence. Signature: () => boolean.
 * @property {function} canGoBack - Checks whether backward navigation is possible. Signature: () => boolean.
 * @property {function} canGoForward - Checks whether forward navigation is possible. Signature: () => boolean.
 * @property {function} completeStep - Marks a step as completed. Signature: (step: string) => void.
 * @property {function} showExitConfirmation - Shows a confirmation dialog before exiting the workflow. Signature: () => boolean.
 * @property {function} resetNavigation - Resets navigation state to the initial step. Signature: () => void.
 * @property {function} isStepReachable - Checks whether a step can be navigated to. Signature: (step: string) => boolean.
 * @property {function} isStepCompleted - Checks whether a step has been completed. Signature: (step: string) => boolean.
 * @property {boolean} hasUnsavedChanges - Whether there are unsaved changes in the workflow.
 * @property {function} setHasUnsavedChanges - Sets the unsaved changes flag. Signature: (value: boolean) => void.
 */

/** @type {React.Context<NavigationContextValue>} */
const NavigationContext = createContext(null);

/**
 * Custom hook to access the NavigationContext value.
 * Throws an error if used outside of a NavigationProvider.
 *
 * @returns {NavigationContextValue} The navigation context value.
 */
export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider.');
  }

  return context;
}

/**
 * Returns the zero-based index of a step in the step sequence.
 * Returns -1 if the step is not found.
 *
 * @param {string} step - The step identifier to look up.
 * @returns {number} The index of the step, or -1 if not found.
 */
function getStepIndex(step) {
  return STEP_ORDER.indexOf(step);
}

/**
 * NavigationProvider component that wraps the application and provides
 * workflow navigation state management to all child components via React Context.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render within the provider.
 * @param {string} [props.initialStep] - Optional initial step to start the workflow at (defaults to STEPS.SEARCH).
 * @returns {React.ReactElement} The NavigationProvider component.
 */
export function NavigationProvider({ children, initialStep }) {
  const startStep = initialStep && STEP_ORDER.includes(initialStep)
    ? initialStep
    : STEPS.SEARCH;

  const [currentStep, setCurrentStep] = useState(startStep);
  const [completedSteps, setCompletedSteps] = useState(() => new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * Returns the zero-based index of the current step.
   * @type {number}
   */
  const currentStepIndex = useMemo(() => getStepIndex(currentStep), [currentStep]);

  /**
   * Checks whether a given step is reachable from the current navigation state.
   * A step is reachable if it is the current step, a previously completed step,
   * or the next step immediately after the last completed step.
   *
   * @param {string} step - The step identifier to check.
   * @returns {boolean} True if the step is reachable, false otherwise.
   */
  const isStepReachable = useCallback((step) => {
    if (!step || typeof step !== 'string') {
      return false;
    }

    const targetIndex = getStepIndex(step);

    if (targetIndex === -1) {
      return false;
    }

    // The first step is always reachable
    if (targetIndex === 0) {
      return true;
    }

    // Current step is always reachable
    if (step === currentStep) {
      return true;
    }

    // Going backward to a completed step is always allowed
    if (completedSteps.has(step)) {
      return true;
    }

    // Going backward to any step before the current step is allowed
    if (targetIndex < currentStepIndex) {
      return true;
    }

    // Going forward is only allowed if all preceding steps are completed
    for (let i = 0; i < targetIndex; i++) {
      if (!completedSteps.has(STEP_ORDER[i])) {
        return false;
      }
    }

    return true;
  }, [currentStep, currentStepIndex, completedSteps]);

  /**
   * Checks whether a step has been completed.
   *
   * @param {string} step - The step identifier to check.
   * @returns {boolean} True if the step has been completed, false otherwise.
   */
  const isStepCompleted = useCallback((step) => {
    if (!step || typeof step !== 'string') {
      return false;
    }

    return completedSteps.has(step);
  }, [completedSteps]);

  /**
   * Checks whether backward navigation is possible from the current step.
   *
   * @returns {boolean} True if the user can navigate to the previous step, false otherwise.
   */
  const canGoBack = useCallback(() => {
    return currentStepIndex > 0;
  }, [currentStepIndex]);

  /**
   * Checks whether forward navigation is possible from the current step.
   * Forward navigation requires the current step to be completed.
   *
   * @returns {boolean} True if the user can navigate to the next step, false otherwise.
   */
  const canGoForward = useCallback(() => {
    if (currentStepIndex >= STEP_ORDER.length - 1) {
      return false;
    }

    return completedSteps.has(currentStep);
  }, [currentStepIndex, currentStep, completedSteps]);

  /**
   * Marks a step as completed.
   *
   * @param {string} step - The step identifier to mark as completed.
   * @returns {void}
   */
  const completeStep = useCallback((step) => {
    if (!step || typeof step !== 'string') {
      return;
    }

    const stepIndex = getStepIndex(step);

    if (stepIndex === -1) {
      return;
    }

    setCompletedSteps((prev) => {
      if (prev.has(step)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  /**
   * Navigates to a specific step if the step is reachable.
   *
   * @param {string} step - The step identifier to navigate to.
   * @returns {boolean} True if navigation succeeded, false otherwise.
   */
  const goToStep = useCallback((step) => {
    if (!step || typeof step !== 'string') {
      return false;
    }

    const targetIndex = getStepIndex(step);

    if (targetIndex === -1) {
      return false;
    }

    if (!isStepReachable(step)) {
      return false;
    }

    setCurrentStep(step);
    return true;
  }, [isStepReachable]);

  /**
   * Navigates to the next step in the sequence.
   * Requires the current step to be completed.
   *
   * @returns {boolean} True if navigation succeeded, false otherwise.
   */
  const goToNextStep = useCallback(() => {
    if (!canGoForward()) {
      return false;
    }

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= STEP_ORDER.length) {
      return false;
    }

    const nextStep = STEP_ORDER[nextIndex];
    setCurrentStep(nextStep);
    return true;
  }, [currentStepIndex, canGoForward]);

  /**
   * Navigates to the previous step in the sequence.
   *
   * @returns {boolean} True if navigation succeeded, false otherwise.
   */
  const goToPreviousStep = useCallback(() => {
    if (!canGoBack()) {
      return false;
    }

    const prevIndex = currentStepIndex - 1;

    if (prevIndex < 0) {
      return false;
    }

    const prevStep = STEP_ORDER[prevIndex];
    setCurrentStep(prevStep);
    return true;
  }, [currentStepIndex, canGoBack]);

  /**
   * Shows a confirmation dialog before exiting the workflow.
   * Uses the browser's native confirm dialog.
   *
   * @returns {boolean} True if the user confirmed exit, false otherwise.
   */
  const showExitConfirmation = useCallback(() => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm(CONFIRMATION_MESSAGES.CANCEL_CHANGES);
  }, [hasUnsavedChanges]);

  /**
   * Resets navigation state to the initial step.
   * Clears all completed steps and unsaved changes.
   *
   * @returns {void}
   */
  const resetNavigation = useCallback(() => {
    setCurrentStep(startStep);
    setCompletedSteps(new Set());
    setHasUnsavedChanges(false);
  }, [startStep]);

  const contextValue = useMemo(() => ({
    currentStep,
    currentStepIndex,
    completedSteps,
    stepOrder: STEP_ORDER,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    canGoBack,
    canGoForward,
    completeStep,
    showExitConfirmation,
    resetNavigation,
    isStepReachable,
    isStepCompleted,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  }), [
    currentStep,
    currentStepIndex,
    completedSteps,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    canGoBack,
    canGoForward,
    completeStep,
    showExitConfirmation,
    resetNavigation,
    isStepReachable,
    isStepCompleted,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

NavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialStep: PropTypes.string,
};

NavigationProvider.defaultProps = {
  initialStep: undefined,
};

export default NavigationContext;