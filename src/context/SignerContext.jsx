/**
 * React Context provider for signer management state.
 * Provides signers list, staged changes (adds/edits/removes), selected account,
 * and methods for staging/unstaging changes. Centralizes signer state for use
 * across management, confirmation, review, and submission screens.
 *
 * @module SignerContext
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as signerService from '../services/signerService.js';
import * as accountService from '../services/accountService.js';
import * as submissionService from '../services/submissionService.js';
import { useAuditLog } from '../hooks/useAuditLog.js';
import { CHANGE_TYPES, AUDIT_EVENTS } from '../constants/constants.js';
import { SIGNER_MESSAGES, CONFIRMATION_MESSAGES } from '../constants/messages.js';

/**
 * @typedef {Object} SignerContextValue
 * @property {Array<Object>} signers - The current list of signers (with staged changes applied).
 * @property {Array<Object>} stagedChanges - The list of staged change objects for the selected account.
 * @property {Object|null} selectedAccount - The currently selected account, or null.
 * @property {boolean} isLoading - Whether a signer operation is in progress.
 * @property {string|null} error - The most recent error message, or null.
 * @property {boolean} hasStagedChanges - Whether there are any staged changes for the selected account.
 * @property {Object} changeSummary - Summary of staged changes with counts by type.
 * @property {function} loadSigners - Loads signers for the selected account. Signature: (accountId?: string) => void.
 * @property {function} selectAccount - Selects an account and loads its signers. Signature: (accountId: string) => Object.
 * @property {function} addSigner - Stages a new signer to be added. Signature: (signerData: Object) => Object.
 * @property {function} editSigner - Stages an edit to an existing signer. Signature: (signerId: string, updates: Object) => Object.
 * @property {function} removeSigner - Stages a signer for removal. Signature: (signerId: string) => Object.
 * @property {function} unlockSigner - Unlocks a locked signer immediately. Signature: (signerId: string) => Object.
 * @property {function} resendInvitation - Resends an invitation to a pending signer. Signature: (signerId: string) => Object.
 * @property {function} undoStagedChange - Removes a specific staged change by its change ID. Signature: (changeId: string) => Object.
 * @property {function} cancelAllChanges - Cancels all staged changes for the selected account. Signature: () => Object.
 * @property {function} submitChanges - Submits all staged changes for the selected account. Signature: () => Object.
 * @property {function} clearError - Clears the current error message. Signature: () => void.
 * @property {function} refreshSigners - Refreshes the signers list from the data store. Signature: () => void.
 * @property {function} clearSelectedAccount - Clears the selected account and signers. Signature: () => void.
 */

/** @type {React.Context<SignerContextValue>} */
const SignerContext = createContext(null);

/**
 * Custom hook to access the SignerContext value.
 * Throws an error if used outside of a SignerProvider.
 *
 * @returns {SignerContextValue} The signer context value.
 */
export function useSigner() {
  const context = useContext(SignerContext);

  if (!context) {
    throw new Error('useSigner must be used within a SignerProvider.');
  }

  return context;
}

/**
 * SignerProvider component that wraps the application and provides
 * signer management state to all child components via React Context.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render within the provider.
 * @returns {React.ReactElement} The SignerProvider component.
 */
export function SignerProvider({ children }) {
  const [signers, setSigners] = useState([]);
  const [stagedChanges, setStagedChanges] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { logEvent } = useAuditLog();

  /**
   * Loads the currently selected account from accountService on mount.
   */
  useEffect(() => {
    try {
      const account = accountService.getSelectedAccount();

      if (account) {
        setSelectedAccount(account);
      }
    } catch (err) {
      console.error('SignerContext: Failed to load selected account on mount:', err);
    }
  }, []);

  /**
   * Loads signers for the selected account whenever the selected account changes.
   */
  useEffect(() => {
    if (selectedAccount && selectedAccount.id) {
      loadSignersInternal(selectedAccount.id);
    }
  }, [selectedAccount]);

  /**
   * Internal function to load signers and staged changes for a given account ID.
   *
   * @param {string} accountId - The account ID to load signers for.
   * @returns {void}
   */
  function loadSignersInternal(accountId) {
    try {
      setIsLoading(true);
      setError(null);

      const result = signerService.getSigners(accountId);

      if (result.success) {
        setSigners(result.signers || []);
      } else {
        setError(result.error || 'Failed to load signers.');
        setSigners([]);
      }

      // Load staged changes for this account
      const allStagedChanges = signerService.getStagedChanges();
      const accountStagedChanges = allStagedChanges.filter(
        (change) => change.accountId === accountId
      );
      setStagedChanges(accountStagedChanges);
    } catch (err) {
      console.error('SignerContext.loadSignersInternal failed:', err);
      setError('An unexpected error occurred while loading signers.');
      setSigners([]);
      setStagedChanges([]);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Loads signers for the selected account or a specified account ID.
   *
   * @param {string} [accountId] - Optional account ID. Uses selected account if not provided.
   * @returns {void}
   */
  const loadSigners = useCallback((accountId) => {
    const targetAccountId = accountId || (selectedAccount ? selectedAccount.id : null);

    if (!targetAccountId) {
      setError('No account selected. Please select an account first.');
      return;
    }

    loadSignersInternal(targetAccountId);
  }, [selectedAccount]);

  /**
   * Refreshes the signers list from the data store for the currently selected account.
   *
   * @returns {void}
   */
  const refreshSigners = useCallback(() => {
    if (!selectedAccount || !selectedAccount.id) {
      return;
    }

    loadSignersInternal(selectedAccount.id);
  }, [selectedAccount]);

  /**
   * Selects an account and loads its signers.
   *
   * @param {string} accountId - The ID of the account to select.
   * @returns {Object} Result object with shape { success: boolean, account?: Object, error?: string }.
   */
  const selectAccount = useCallback((accountId) => {
    try {
      if (!accountId || typeof accountId !== 'string') {
        return {
          success: false,
          error: 'Account ID is required.',
        };
      }

      setIsLoading(true);
      setError(null);

      const result = accountService.selectAccount(accountId);

      if (result.success) {
        setSelectedAccount(result.account);

        return {
          success: true,
          account: result.account,
        };
      }

      setError(result.error || 'Failed to select account.');

      return {
        success: false,
        error: result.error || 'Failed to select account.',
      };
    } catch (err) {
      console.error('SignerContext.selectAccount failed:', err);
      const errorMessage = 'An unexpected error occurred while selecting the account.';
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
   * Stages a new signer to be added to the selected account.
   *
   * @param {Object} signerData - The signer data to add.
   * @returns {Object} Result object with shape { success: boolean, signer?: Object, error?: string }.
   */
  const addSigner = useCallback((signerData) => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected. Please select an account first.',
        };
      }

      setError(null);

      const dataWithAccount = {
        ...signerData,
        accountId: selectedAccount.id,
      };

      const result = signerService.addSigner(dataWithAccount);

      if (result.success) {
        // Refresh signers and staged changes
        loadSignersInternal(selectedAccount.id);

        return {
          success: true,
          signer: result.signer,
        };
      }

      setError(result.error || 'Failed to add signer.');

      return {
        success: false,
        error: result.error || 'Failed to add signer.',
      };
    } catch (err) {
      console.error('SignerContext.addSigner failed:', err);
      const errorMessage = 'An unexpected error occurred while adding the signer.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount]);

  /**
   * Stages an edit to an existing signer.
   *
   * @param {string} signerId - The ID of the signer to edit.
   * @param {Object} updates - The fields to update on the signer.
   * @returns {Object} Result object with shape { success: boolean, signer?: Object, error?: string }.
   */
  const editSigner = useCallback((signerId, updates) => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected. Please select an account first.',
        };
      }

      setError(null);

      const result = signerService.editSigner(signerId, updates);

      if (result.success) {
        // Refresh signers and staged changes
        loadSignersInternal(selectedAccount.id);

        return {
          success: true,
          signer: result.signer,
        };
      }

      setError(result.error || 'Failed to edit signer.');

      return {
        success: false,
        error: result.error || 'Failed to edit signer.',
      };
    } catch (err) {
      console.error('SignerContext.editSigner failed:', err);
      const errorMessage = 'An unexpected error occurred while editing the signer.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount]);

  /**
   * Stages a signer for removal from the selected account.
   *
   * @param {string} signerId - The ID of the signer to remove.
   * @returns {Object} Result object with shape { success: boolean, error?: string }.
   */
  const removeSigner = useCallback((signerId) => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected. Please select an account first.',
        };
      }

      setError(null);

      const result = signerService.removeSigner(signerId);

      if (result.success) {
        // Refresh signers and staged changes
        loadSignersInternal(selectedAccount.id);

        return {
          success: true,
        };
      }

      setError(result.error || 'Failed to remove signer.');

      return {
        success: false,
        error: result.error || 'Failed to remove signer.',
      };
    } catch (err) {
      console.error('SignerContext.removeSigner failed:', err);
      const errorMessage = 'An unexpected error occurred while removing the signer.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount]);

  /**
   * Unlocks a locked signer immediately (not staged).
   *
   * @param {string} signerId - The ID of the signer to unlock.
   * @returns {Object} Result object with shape { success: boolean, signer?: Object, error?: string }.
   */
  const unlockSigner = useCallback((signerId) => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected. Please select an account first.',
        };
      }

      setError(null);

      const result = signerService.unlockSigner(signerId);

      if (result.success) {
        // Refresh signers list
        loadSignersInternal(selectedAccount.id);

        return {
          success: true,
          signer: result.signer,
        };
      }

      setError(result.error || 'Failed to unlock signer.');

      return {
        success: false,
        error: result.error || 'Failed to unlock signer.',
      };
    } catch (err) {
      console.error('SignerContext.unlockSigner failed:', err);
      const errorMessage = 'An unexpected error occurred while unlocking the signer.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount]);

  /**
   * Resends an invitation to a pending signer.
   *
   * @param {string} signerId - The ID of the signer to resend the invitation to.
   * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string }.
   */
  const resendInvitation = useCallback((signerId) => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected. Please select an account first.',
        };
      }

      setError(null);

      const result = signerService.resendInvitation(signerId);

      if (result.success) {
        return {
          success: true,
          message: result.message,
        };
      }

      setError(result.error || 'Failed to resend invitation.');

      return {
        success: false,
        error: result.error || 'Failed to resend invitation.',
      };
    } catch (err) {
      console.error('SignerContext.resendInvitation failed:', err);
      const errorMessage = 'An unexpected error occurred while resending the invitation.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount]);

  /**
   * Removes a specific staged change by its change ID.
   *
   * @param {string} changeId - The ID of the staged change to remove.
   * @returns {Object} Result object with shape { success: boolean, error?: string }.
   */
  const undoStagedChange = useCallback((changeId) => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected.',
        };
      }

      setError(null);

      const result = signerService.removeStagedChange(changeId);

      if (result.success) {
        // Refresh signers and staged changes
        loadSignersInternal(selectedAccount.id);

        return {
          success: true,
        };
      }

      setError(result.error || 'Failed to undo staged change.');

      return {
        success: false,
        error: result.error || 'Failed to undo staged change.',
      };
    } catch (err) {
      console.error('SignerContext.undoStagedChange failed:', err);
      const errorMessage = 'An unexpected error occurred while undoing the staged change.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount]);

  /**
   * Cancels all staged changes for the selected account.
   *
   * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string }.
   */
  const cancelAllChanges = useCallback(() => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected.',
        };
      }

      setError(null);

      const result = signerService.cancelStagedChanges(selectedAccount.id);

      if (result.success) {
        // Refresh signers and staged changes
        loadSignersInternal(selectedAccount.id);

        logEvent(AUDIT_EVENTS.CHANGES_CANCELLED, {
          context: {
            accountId: selectedAccount.id,
            accountName: selectedAccount.accountName,
          },
        });

        return {
          success: true,
          message: result.message || CONFIRMATION_MESSAGES.NO_CHANGES,
        };
      }

      setError(result.error || 'Failed to cancel changes.');

      return {
        success: false,
        error: result.error || 'Failed to cancel changes.',
      };
    } catch (err) {
      console.error('SignerContext.cancelAllChanges failed:', err);
      const errorMessage = 'An unexpected error occurred while cancelling changes.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [selectedAccount, logEvent]);

  /**
   * Submits all staged changes for the selected account.
   *
   * @returns {Object} Result object with shape { success: boolean, referenceId?: string, timestamp?: string, summary?: Object, confirmation?: Object, error?: string }.
   */
  const submitChanges = useCallback(() => {
    try {
      if (!selectedAccount || !selectedAccount.id) {
        return {
          success: false,
          error: 'No account selected.',
        };
      }

      if (stagedChanges.length === 0) {
        return {
          success: false,
          error: CONFIRMATION_MESSAGES.NO_CHANGES,
        };
      }

      setIsLoading(true);
      setError(null);

      const result = submissionService.submitChanges(selectedAccount.id);

      if (result.success) {
        // Refresh signers and staged changes after submission
        loadSignersInternal(selectedAccount.id);

        return {
          success: true,
          referenceId: result.referenceId,
          timestamp: result.timestamp,
          summary: result.summary,
          confirmation: result.confirmation,
        };
      }

      setError(result.error || 'Failed to submit changes.');

      return {
        success: false,
        error: result.error || 'Failed to submit changes.',
        duplicate: result.duplicate || false,
        referenceId: result.referenceId || null,
      };
    } catch (err) {
      console.error('SignerContext.submitChanges failed:', err);
      const errorMessage = 'An unexpected error occurred while submitting changes.';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount, stagedChanges]);

  /**
   * Clears the current error message.
   *
   * @returns {void}
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clears the selected account, signers, and staged changes.
   *
   * @returns {void}
   */
  const clearSelectedAccount = useCallback(() => {
    accountService.clearSelectedAccount();
    setSelectedAccount(null);
    setSigners([]);
    setStagedChanges([]);
    setError(null);
  }, []);

  /**
   * Whether there are any staged changes for the selected account.
   * @type {boolean}
   */
  const hasStagedChanges = useMemo(() => {
    return stagedChanges.length > 0;
  }, [stagedChanges]);

  /**
   * Summary of staged changes with counts by type.
   * @type {Object}
   */
  const changeSummary = useMemo(() => {
    const adds = stagedChanges.filter((c) => c.type === CHANGE_TYPES.ADD);
    const edits = stagedChanges.filter((c) => c.type === CHANGE_TYPES.EDIT);
    const removes = stagedChanges.filter((c) => c.type === CHANGE_TYPES.REMOVE);

    return {
      totalChanges: stagedChanges.length,
      adds: adds.length,
      edits: edits.length,
      removes: removes.length,
      changes: stagedChanges,
    };
  }, [stagedChanges]);

  const contextValue = useMemo(() => ({
    signers,
    stagedChanges,
    selectedAccount,
    isLoading,
    error,
    hasStagedChanges,
    changeSummary,
    loadSigners,
    selectAccount,
    addSigner,
    editSigner,
    removeSigner,
    unlockSigner,
    resendInvitation,
    undoStagedChange,
    cancelAllChanges,
    submitChanges,
    clearError,
    refreshSigners,
    clearSelectedAccount,
  }), [
    signers,
    stagedChanges,
    selectedAccount,
    isLoading,
    error,
    hasStagedChanges,
    changeSummary,
    loadSigners,
    selectAccount,
    addSigner,
    editSigner,
    removeSigner,
    unlockSigner,
    resendInvitation,
    undoStagedChange,
    cancelAllChanges,
    submitChanges,
    clearError,
    refreshSigners,
    clearSelectedAccount,
  ]);

  return (
    <SignerContext.Provider value={contextValue}>
      {children}
    </SignerContext.Provider>
  );
}

SignerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SignerContext;