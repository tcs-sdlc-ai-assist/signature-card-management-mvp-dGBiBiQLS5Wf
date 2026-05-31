/**
 * Signer CRUD and staging service.
 * Provides signer retrieval, add, edit, remove, unlock, and resend invitation operations.
 * Manages staged changes (pending add/edit/remove) before final submission.
 * Enforces last-signer prevention rule.
 * All mutations are logged via auditLogService.
 *
 * @module signerService
 */

import { v4 as uuidv4 } from 'uuid';
import { SIGNER_STATUS, CHANGE_TYPES, AUDIT_EVENTS, STORAGE_KEYS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import { getMockSigners } from '../data/mockData.js';

/** @type {string} Storage key for staged changes */
const STAGED_CHANGES_KEY = 'staged_changes';

/** @type {string} localStorage key for mock signers */
const MOCK_SIGNERS_KEY = 'sig_mock_signers';

/**
 * Retrieves the currently authenticated user from storage.
 *
 * @returns {Object|null} The authenticated user profile, or null if not authenticated.
 */
function getAuthenticatedUser() {
  try {
    const token = storageService.getItem(STORAGE_KEYS.AUTH_TOKEN, null);
    const user = storageService.getItem(STORAGE_KEYS.USER, null);

    if (!token || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('signerService.getAuthenticatedUser failed:', error);
    return null;
  }
}

/**
 * Retrieves all staged changes from storage.
 *
 * @returns {Array<Object>} An array of staged change objects.
 */
export function getStagedChanges() {
  try {
    const changes = storageService.getItem(STAGED_CHANGES_KEY, []);
    return Array.isArray(changes) ? changes : [];
  } catch (error) {
    console.error('signerService.getStagedChanges failed:', error);
    return [];
  }
}

/**
 * Persists staged changes to storage.
 *
 * @param {Array<Object>} changes - The array of staged change objects to persist.
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
function saveStagedChanges(changes) {
  try {
    return storageService.setItem(STAGED_CHANGES_KEY, changes);
  } catch (error) {
    console.error('signerService.saveStagedChanges failed:', error);
    return false;
  }
}

/**
 * Retrieves all signers for a given account ID.
 * Returns the base signers from mock data with any staged changes applied.
 *
 * @param {string} accountId - The account ID to retrieve signers for.
 * @returns {Object} Result object with shape { success: boolean, signers?: Array<Object>, error?: string }.
 */
export function getSigners(accountId) {
  try {
    if (!accountId || typeof accountId !== 'string') {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to view signers.',
      };
    }

    const signers = getMockSigners(accountId);

    // Apply staged changes to the signers list
    const stagedChanges = getStagedChanges().filter(
      (change) => change.accountId === accountId
    );

    let resultSigners = [...signers];

    for (const change of stagedChanges) {
      if (change.type === CHANGE_TYPES.ADD) {
        // Add staged signer to the list
        resultSigners.push({
          ...change.signerData,
          _staged: true,
          _changeType: CHANGE_TYPES.ADD,
        });
      } else if (change.type === CHANGE_TYPES.EDIT) {
        // Apply edit to existing signer
        const index = resultSigners.findIndex((s) => s.id === change.signerId);
        if (index !== -1) {
          resultSigners[index] = {
            ...resultSigners[index],
            ...change.updates,
            _staged: true,
            _changeType: CHANGE_TYPES.EDIT,
          };
        }
      } else if (change.type === CHANGE_TYPES.REMOVE) {
        // Mark signer as staged for removal
        const index = resultSigners.findIndex((s) => s.id === change.signerId);
        if (index !== -1) {
          resultSigners[index] = {
            ...resultSigners[index],
            _staged: true,
            _changeType: CHANGE_TYPES.REMOVE,
          };
        }
      }
    }

    return {
      success: true,
      signers: resultSigners,
    };
  } catch (error) {
    console.error('signerService.getSigners failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving signers.',
    };
  }
}

/**
 * Stages a new signer to be added to an account.
 * The signer is not persisted to the mock data store until submission.
 *
 * @param {Object} signerData - The signer data to add.
 * @param {string} signerData.accountId - The account ID to add the signer to.
 * @param {string} signerData.firstName - The signer's first name.
 * @param {string} signerData.lastName - The signer's last name.
 * @param {string} [signerData.role] - The signer's role (e.g., 'Authorized Signer').
 * @param {string} [signerData.email] - The signer's email address.
 * @param {string} [signerData.phone] - The signer's phone number.
 * @param {string} [signerData.ssn] - The signer's masked SSN.
 * @returns {Object} Result object with shape { success: boolean, signer?: Object, error?: string }.
 */
export function addSigner(signerData) {
  try {
    if (!signerData || typeof signerData !== 'object') {
      return {
        success: false,
        error: 'Signer data is required.',
      };
    }

    const { accountId, firstName, lastName } = signerData;

    if (!accountId || typeof accountId !== 'string') {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      return {
        success: false,
        error: 'First name is required.',
      };
    }

    if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
      return {
        success: false,
        error: 'Last name is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to add a signer.',
      };
    }

    // Check for duplicate signer (same first + last name on the same account)
    const existingSigners = getMockSigners(accountId);
    const stagedChanges = getStagedChanges();
    const stagedAdds = stagedChanges.filter(
      (c) => c.type === CHANGE_TYPES.ADD && c.accountId === accountId
    );

    const isDuplicate = [...existingSigners, ...stagedAdds.map((c) => c.signerData)].some(
      (s) =>
        s.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
        s.lastName.toLowerCase() === lastName.trim().toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        error: 'This signer already exists on the account.',
      };
    }

    const newSigner = {
      id: `signer-${uuidv4()}`,
      accountId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: signerData.role || 'Authorized Signer',
      status: SIGNER_STATUS.PENDING,
      email: signerData.email || '',
      phone: signerData.phone || '',
      ssn: signerData.ssn || '',
    };

    const change = {
      id: `change-${uuidv4()}`,
      type: CHANGE_TYPES.ADD,
      accountId,
      signerId: newSigner.id,
      signerData: newSigner,
      timestamp: new Date().toISOString(),
      userId: user.id,
    };

    stagedChanges.push(change);
    saveStagedChanges(stagedChanges);

    auditLogService.logEvent(AUDIT_EVENTS.SIGNER_ADDED, {
      userId: user.id,
      after: newSigner,
      context: {
        accountId,
        signerId: newSigner.id,
        staged: true,
      },
    });

    return {
      success: true,
      signer: newSigner,
    };
  } catch (error) {
    console.error('signerService.addSigner failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while adding the signer.',
    };
  }
}

/**
 * Stages an edit to an existing signer.
 * The edit is not persisted to the mock data store until submission.
 *
 * @param {string} signerId - The ID of the signer to edit.
 * @param {Object} updates - The fields to update on the signer.
 * @returns {Object} Result object with shape { success: boolean, signer?: Object, error?: string }.
 */
export function editSigner(signerId, updates) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return {
        success: false,
        error: 'At least one field to update is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to edit a signer.',
      };
    }

    // Find the signer in mock data
    const allSigners = getMockSigners();
    const existingSigner = allSigners.find((s) => s.id === signerId);

    // Also check staged adds
    const stagedChanges = getStagedChanges();
    const stagedAdd = stagedChanges.find(
      (c) => c.type === CHANGE_TYPES.ADD && c.signerId === signerId
    );

    if (!existingSigner && !stagedAdd) {
      return {
        success: false,
        error: 'Signer not found.',
      };
    }

    const currentSigner = existingSigner || stagedAdd.signerData;
    const accountId = currentSigner.accountId;

    // Sanitize updates — do not allow changing id or accountId
    const { id: _id, accountId: _accountId, ...safeUpdates } = updates;

    // If editing a staged add, update the staged add directly
    if (stagedAdd) {
      const changeIndex = stagedChanges.findIndex((c) => c.id === stagedAdd.id);
      if (changeIndex !== -1) {
        stagedChanges[changeIndex] = {
          ...stagedChanges[changeIndex],
          signerData: {
            ...stagedChanges[changeIndex].signerData,
            ...safeUpdates,
          },
          timestamp: new Date().toISOString(),
        };
        saveStagedChanges(stagedChanges);

        const updatedSigner = stagedChanges[changeIndex].signerData;

        auditLogService.logEvent(AUDIT_EVENTS.SIGNER_EDITED, {
          userId: user.id,
          before: currentSigner,
          after: updatedSigner,
          context: {
            accountId,
            signerId,
            staged: true,
          },
        });

        return {
          success: true,
          signer: updatedSigner,
        };
      }
    }

    // Check if there's already a staged edit for this signer
    const existingEditIndex = stagedChanges.findIndex(
      (c) => c.type === CHANGE_TYPES.EDIT && c.signerId === signerId
    );

    if (existingEditIndex !== -1) {
      // Merge updates with existing staged edit
      stagedChanges[existingEditIndex] = {
        ...stagedChanges[existingEditIndex],
        updates: {
          ...stagedChanges[existingEditIndex].updates,
          ...safeUpdates,
        },
        timestamp: new Date().toISOString(),
      };
    } else {
      // Create new staged edit
      const change = {
        id: `change-${uuidv4()}`,
        type: CHANGE_TYPES.EDIT,
        accountId,
        signerId,
        updates: safeUpdates,
        timestamp: new Date().toISOString(),
        userId: user.id,
      };
      stagedChanges.push(change);
    }

    saveStagedChanges(stagedChanges);

    const updatedSigner = { ...currentSigner, ...safeUpdates };

    auditLogService.logEvent(AUDIT_EVENTS.SIGNER_EDITED, {
      userId: user.id,
      before: currentSigner,
      after: updatedSigner,
      context: {
        accountId,
        signerId,
        staged: true,
      },
    });

    return {
      success: true,
      signer: updatedSigner,
    };
  } catch (error) {
    console.error('signerService.editSigner failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while editing the signer.',
    };
  }
}

/**
 * Stages a signer for removal from an account.
 * Enforces last-signer prevention — at least one active signer must remain.
 * The removal is not persisted to the mock data store until submission.
 *
 * @param {string} signerId - The ID of the signer to remove.
 * @returns {Object} Result object with shape { success: boolean, error?: string }.
 */
export function removeSigner(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to remove a signer.',
      };
    }

    // Check if this is a staged add — if so, just remove the staged change
    const stagedChanges = getStagedChanges();
    const stagedAddIndex = stagedChanges.findIndex(
      (c) => c.type === CHANGE_TYPES.ADD && c.signerId === signerId
    );

    if (stagedAddIndex !== -1) {
      const removedChange = stagedChanges[stagedAddIndex];
      stagedChanges.splice(stagedAddIndex, 1);
      saveStagedChanges(stagedChanges);

      auditLogService.logEvent(AUDIT_EVENTS.SIGNER_REMOVED, {
        userId: user.id,
        before: removedChange.signerData,
        context: {
          accountId: removedChange.accountId,
          signerId,
          staged: true,
          wasStagedAdd: true,
        },
      });

      return {
        success: true,
      };
    }

    // Find the signer in mock data
    const allSigners = getMockSigners();
    const signer = allSigners.find((s) => s.id === signerId);

    if (!signer) {
      return {
        success: false,
        error: 'Signer not found.',
      };
    }

    const accountId = signer.accountId;

    // Enforce last-signer prevention
    const accountSigners = getMockSigners(accountId);
    const stagedRemoves = stagedChanges.filter(
      (c) => c.type === CHANGE_TYPES.REMOVE && c.accountId === accountId
    );
    const stagedAdds = stagedChanges.filter(
      (c) => c.type === CHANGE_TYPES.ADD && c.accountId === accountId
    );

    // Count active signers that are not already staged for removal
    const activeSignerCount = accountSigners.filter(
      (s) =>
        s.status === SIGNER_STATUS.ACTIVE &&
        !stagedRemoves.some((r) => r.signerId === s.id)
    ).length;

    // Include staged adds as potential signers
    const totalAfterRemoval = activeSignerCount + stagedAdds.length - 1;

    if (totalAfterRemoval < 1) {
      return {
        success: false,
        error: 'Cannot remove the last signer. At least one active signer must remain on the account.',
      };
    }

    // Check if already staged for removal
    const alreadyStaged = stagedChanges.some(
      (c) => c.type === CHANGE_TYPES.REMOVE && c.signerId === signerId
    );

    if (alreadyStaged) {
      return {
        success: false,
        error: 'This signer is already staged for removal.',
      };
    }

    const change = {
      id: `change-${uuidv4()}`,
      type: CHANGE_TYPES.REMOVE,
      accountId,
      signerId,
      timestamp: new Date().toISOString(),
      userId: user.id,
    };

    stagedChanges.push(change);
    saveStagedChanges(stagedChanges);

    auditLogService.logEvent(AUDIT_EVENTS.SIGNER_REMOVED, {
      userId: user.id,
      before: signer,
      context: {
        accountId,
        signerId,
        staged: true,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('signerService.removeSigner failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while removing the signer.',
    };
  }
}

/**
 * Unlocks a locked signer by changing their status from LOCKED to ACTIVE.
 * This change is applied immediately to the mock data store (not staged).
 *
 * @param {string} signerId - The ID of the signer to unlock.
 * @returns {Object} Result object with shape { success: boolean, signer?: Object, error?: string }.
 */
export function unlockSigner(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to unlock a signer.',
      };
    }

    // Retrieve all signers from localStorage directly
    let allSigners;
    try {
      const data = localStorage.getItem(MOCK_SIGNERS_KEY);
      allSigners = data ? JSON.parse(data) : getMockSigners();
    } catch (parseError) {
      allSigners = getMockSigners();
    }

    const signerIndex = allSigners.findIndex((s) => s.id === signerId);

    if (signerIndex === -1) {
      return {
        success: false,
        error: 'Signer not found.',
      };
    }

    const signer = allSigners[signerIndex];

    if (signer.status !== SIGNER_STATUS.LOCKED) {
      return {
        success: false,
        error: 'This signer is not locked.',
      };
    }

    const previousStatus = signer.status;

    allSigners[signerIndex] = {
      ...signer,
      status: SIGNER_STATUS.ACTIVE,
    };

    // Persist updated signers to localStorage
    try {
      localStorage.setItem(MOCK_SIGNERS_KEY, JSON.stringify(allSigners));
    } catch (persistError) {
      console.error('signerService.unlockSigner: Failed to persist signer update:', persistError);
      return {
        success: false,
        error: 'Failed to persist signer unlock.',
      };
    }

    auditLogService.logEvent(AUDIT_EVENTS.SIGNER_EDITED, {
      userId: user.id,
      before: { status: previousStatus },
      after: { status: SIGNER_STATUS.ACTIVE },
      context: {
        accountId: signer.accountId,
        signerId,
        action: 'UNLOCK',
      },
    });

    return {
      success: true,
      signer: allSigners[signerIndex],
    };
  } catch (error) {
    console.error('signerService.unlockSigner failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while unlocking the signer.',
    };
  }
}

/**
 * Resends an invitation to a pending signer.
 * Only applicable to signers with PENDING status.
 *
 * @param {string} signerId - The ID of the signer to resend the invitation to.
 * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string }.
 */
export function resendInvitation(signerId) {
  try {
    if (!signerId || typeof signerId !== 'string') {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to resend an invitation.',
      };
    }

    // Find the signer in mock data
    const allSigners = getMockSigners();
    const signer = allSigners.find((s) => s.id === signerId);

    // Also check staged adds
    const stagedChanges = getStagedChanges();
    const stagedAdd = stagedChanges.find(
      (c) => c.type === CHANGE_TYPES.ADD && c.signerId === signerId
    );

    const targetSigner = signer || (stagedAdd ? stagedAdd.signerData : null);

    if (!targetSigner) {
      return {
        success: false,
        error: 'Signer not found.',
      };
    }

    if (targetSigner.status !== SIGNER_STATUS.PENDING) {
      return {
        success: false,
        error: 'Invitations can only be resent to signers with pending status.',
      };
    }

    auditLogService.logEvent(AUDIT_EVENTS.SIGNER_EDITED, {
      userId: user.id,
      context: {
        accountId: targetSigner.accountId,
        signerId,
        action: 'RESEND_INVITATION',
        signerName: `${targetSigner.firstName} ${targetSigner.lastName}`,
      },
    });

    console.info(`[DEV] Invitation resent to signer ${targetSigner.firstName} ${targetSigner.lastName} (${signerId})`);

    return {
      success: true,
      message: `Invitation has been resent to ${targetSigner.firstName} ${targetSigner.lastName}.`,
    };
  } catch (error) {
    console.error('signerService.resendInvitation failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while resending the invitation.',
    };
  }
}

/**
 * Submits all staged changes for a given account, persisting them to the mock data store.
 * Clears staged changes for the account after successful submission.
 *
 * @param {string} accountId - The account ID to submit staged changes for.
 * @returns {Object} Result object with shape { success: boolean, message?: string, changes?: Array<Object>, error?: string }.
 */
export function submitStagedChanges(accountId) {
  try {
    if (!accountId || typeof accountId !== 'string') {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to submit changes.',
      };
    }

    const allStagedChanges = getStagedChanges();
    const accountChanges = allStagedChanges.filter(
      (c) => c.accountId === accountId
    );

    if (accountChanges.length === 0) {
      return {
        success: false,
        error: 'No staged changes to submit.',
      };
    }

    // Retrieve all signers from localStorage directly
    let allSigners;
    try {
      const data = localStorage.getItem(MOCK_SIGNERS_KEY);
      allSigners = data ? JSON.parse(data) : getMockSigners();
    } catch (parseError) {
      allSigners = getMockSigners();
    }

    // Apply each change
    for (const change of accountChanges) {
      if (change.type === CHANGE_TYPES.ADD) {
        allSigners.push(change.signerData);
      } else if (change.type === CHANGE_TYPES.EDIT) {
        const index = allSigners.findIndex((s) => s.id === change.signerId);
        if (index !== -1) {
          allSigners[index] = {
            ...allSigners[index],
            ...change.updates,
          };
        }
      } else if (change.type === CHANGE_TYPES.REMOVE) {
        const index = allSigners.findIndex((s) => s.id === change.signerId);
        if (index !== -1) {
          allSigners.splice(index, 1);
        }
      }
    }

    // Persist updated signers to localStorage
    try {
      localStorage.setItem(MOCK_SIGNERS_KEY, JSON.stringify(allSigners));
    } catch (persistError) {
      console.error('signerService.submitStagedChanges: Failed to persist changes:', persistError);
      return {
        success: false,
        error: 'Failed to persist signer changes.',
      };
    }

    // Remove submitted changes from staged changes
    const remainingChanges = allStagedChanges.filter(
      (c) => c.accountId !== accountId
    );
    saveStagedChanges(remainingChanges);

    auditLogService.logEvent(AUDIT_EVENTS.CHANGES_SUBMITTED, {
      userId: user.id,
      context: {
        accountId,
        changeCount: accountChanges.length,
        changes: accountChanges.map((c) => ({
          type: c.type,
          signerId: c.signerId,
        })),
      },
    });

    return {
      success: true,
      message: 'Your changes have been submitted successfully.',
      changes: accountChanges,
    };
  } catch (error) {
    console.error('signerService.submitStagedChanges failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while submitting changes.',
    };
  }
}

/**
 * Cancels all staged changes for a given account.
 *
 * @param {string} accountId - The account ID to cancel staged changes for.
 * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string }.
 */
export function cancelStagedChanges(accountId) {
  try {
    if (!accountId || typeof accountId !== 'string') {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to cancel changes.',
      };
    }

    const allStagedChanges = getStagedChanges();
    const accountChanges = allStagedChanges.filter(
      (c) => c.accountId === accountId
    );

    if (accountChanges.length === 0) {
      return {
        success: true,
        message: 'No staged changes to cancel.',
      };
    }

    const remainingChanges = allStagedChanges.filter(
      (c) => c.accountId !== accountId
    );
    saveStagedChanges(remainingChanges);

    auditLogService.logEvent(AUDIT_EVENTS.CHANGES_CANCELLED, {
      userId: user.id,
      context: {
        accountId,
        cancelledChangeCount: accountChanges.length,
      },
    });

    return {
      success: true,
      message: 'All staged changes have been cancelled.',
    };
  } catch (error) {
    console.error('signerService.cancelStagedChanges failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while cancelling changes.',
    };
  }
}

/**
 * Removes a specific staged change by its change ID.
 *
 * @param {string} changeId - The ID of the staged change to remove.
 * @returns {Object} Result object with shape { success: boolean, error?: string }.
 */
export function removeStagedChange(changeId) {
  try {
    if (!changeId || typeof changeId !== 'string') {
      return {
        success: false,
        error: 'Change ID is required.',
      };
    }

    const stagedChanges = getStagedChanges();
    const changeIndex = stagedChanges.findIndex((c) => c.id === changeId);

    if (changeIndex === -1) {
      return {
        success: false,
        error: 'Staged change not found.',
      };
    }

    stagedChanges.splice(changeIndex, 1);
    saveStagedChanges(stagedChanges);

    return {
      success: true,
    };
  } catch (error) {
    console.error('signerService.removeStagedChange failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while removing the staged change.',
    };
  }
}

/**
 * Clears all staged changes from storage.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clearAllStagedChanges() {
  try {
    return saveStagedChanges([]);
  } catch (error) {
    console.error('signerService.clearAllStagedChanges failed:', error);
    return false;
  }
}

const signerService = {
  getSigners,
  addSigner,
  editSigner,
  removeSigner,
  unlockSigner,
  resendInvitation,
  getStagedChanges,
  submitStagedChanges,
  cancelStagedChanges,
  removeStagedChange,
  clearAllStagedChanges,
};

export default signerService;