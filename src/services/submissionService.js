/**
 * Submission processing and confirmation service.
 * Processes staged add/edit/remove operations, generates unique reference IDs,
 * creates timestamps, checks for duplicate submissions (idempotency),
 * and sends mock confirmation notifications.
 * All events are logged via auditLogService.
 *
 * @module submissionService
 */

import { v4 as uuidv4 } from 'uuid';
import { AUDIT_EVENTS, STORAGE_KEYS, CHANGE_TYPES } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import * as signerService from './signerService.js';

/** @type {string} Storage key for submission history */
const SUBMISSION_HISTORY_KEY = 'submission_history';

/** @type {string} Storage key for the last submission hash (idempotency) */
const LAST_SUBMISSION_HASH_KEY = 'last_submission_hash';

/**
 * Generates a simple hash string from staged changes for idempotency checking.
 * Combines change types, signer IDs, and account IDs into a deterministic string.
 *
 * @param {Array<Object>} stagedChanges - The array of staged change objects.
 * @returns {string} A hash string representing the staged changes.
 */
function generateSubmissionHash(stagedChanges) {
  if (!Array.isArray(stagedChanges) || stagedChanges.length === 0) {
    return '';
  }

  const sortedChanges = [...stagedChanges].sort((a, b) => {
    const aKey = `${a.accountId}-${a.signerId}-${a.type}`;
    const bKey = `${b.accountId}-${b.signerId}-${b.type}`;
    return aKey.localeCompare(bKey);
  });

  const parts = sortedChanges.map((change) => {
    const base = `${change.type}:${change.accountId}:${change.signerId}`;
    if (change.type === CHANGE_TYPES.ADD && change.signerData) {
      return `${base}:${change.signerData.firstName}:${change.signerData.lastName}`;
    }
    if (change.type === CHANGE_TYPES.EDIT && change.updates) {
      const updateKeys = Object.keys(change.updates).sort().join(',');
      return `${base}:${updateKeys}`;
    }
    return base;
  });

  return parts.join('|');
}

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
    console.error('submissionService.getAuthenticatedUser failed:', error);
    return null;
  }
}

/**
 * Retrieves the submission history from storage.
 *
 * @returns {Array<Object>} An array of past submission records.
 */
export function getSubmissionHistory() {
  try {
    const history = storageService.getItem(SUBMISSION_HISTORY_KEY, []);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('submissionService.getSubmissionHistory failed:', error);
    return [];
  }
}

/**
 * Persists the submission history to storage.
 *
 * @param {Array<Object>} history - The array of submission records to persist.
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
function saveSubmissionHistory(history) {
  try {
    return storageService.setItem(SUBMISSION_HISTORY_KEY, history);
  } catch (error) {
    console.error('submissionService.saveSubmissionHistory failed:', error);
    return false;
  }
}

/**
 * Checks whether a submission with the same staged changes has already been processed.
 * Provides idempotency protection against duplicate submissions.
 *
 * @param {Array<Object>} stagedChanges - The array of staged change objects to check.
 * @returns {Object} Result object with shape { isDuplicate: boolean, existingSubmission?: Object }.
 */
export function checkDuplicateSubmission(stagedChanges) {
  try {
    if (!Array.isArray(stagedChanges) || stagedChanges.length === 0) {
      return {
        isDuplicate: false,
      };
    }

    const hash = generateSubmissionHash(stagedChanges);

    if (!hash) {
      return {
        isDuplicate: false,
      };
    }

    const lastHash = storageService.getItem(LAST_SUBMISSION_HASH_KEY, null);

    if (lastHash && lastHash === hash) {
      // Check submission history for the matching record
      const history = getSubmissionHistory();
      const existingSubmission = history.length > 0 ? history[history.length - 1] : null;

      return {
        isDuplicate: true,
        existingSubmission,
      };
    }

    return {
      isDuplicate: false,
    };
  } catch (error) {
    console.error('submissionService.checkDuplicateSubmission failed:', error);
    return {
      isDuplicate: false,
    };
  }
}

/**
 * Sends a mock confirmation notification for a completed submission.
 * In a real application, this would send an email or push notification.
 *
 * @param {Object} user - The user profile object.
 * @param {Object} submissionRecord - The submission record containing details.
 * @returns {Object} Result object with shape { success: boolean, message?: string, error?: string }.
 */
function sendConfirmationNotification(user, submissionRecord) {
  try {
    if (!user || !submissionRecord) {
      return {
        success: false,
        error: 'User and submission record are required to send confirmation.',
      };
    }

    console.info(
      `[DEV] Confirmation notification sent to ${user.email || 'unknown'} for submission ${submissionRecord.referenceId}. ` +
      `Changes: ${submissionRecord.summary.totalChanges} total ` +
      `(${submissionRecord.summary.adds} added, ${submissionRecord.summary.edits} edited, ${submissionRecord.summary.removes} removed).`
    );

    return {
      success: true,
      message: `Confirmation sent to ${user.email || 'registered contact'}.`,
    };
  } catch (error) {
    console.error('submissionService.sendConfirmationNotification failed:', error);
    return {
      success: false,
      error: 'Failed to send confirmation notification.',
    };
  }
}

/**
 * Processes all staged add/edit/remove operations for a given account.
 * Generates a unique reference ID (UUID), creates a timestamp, checks for
 * duplicate submissions (idempotency), delegates persistence to signerService,
 * and sends a mock confirmation notification.
 *
 * @param {string} accountId - The account ID to submit staged changes for.
 * @returns {Object} Result object with shape { success: boolean, referenceId?: string, timestamp?: string, summary?: Object, confirmation?: Object, error?: string }.
 */
export function submitChanges(accountId) {
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

    // Retrieve staged changes for the account
    const allStagedChanges = signerService.getStagedChanges();
    const accountChanges = allStagedChanges.filter(
      (c) => c.accountId === accountId
    );

    if (accountChanges.length === 0) {
      return {
        success: false,
        error: 'No staged changes to submit.',
      };
    }

    // Check for duplicate submission (idempotency)
    const duplicateCheck = checkDuplicateSubmission(accountChanges);

    if (duplicateCheck.isDuplicate) {
      return {
        success: false,
        error: 'This submission has already been processed.',
        referenceId: duplicateCheck.existingSubmission
          ? duplicateCheck.existingSubmission.referenceId
          : null,
        duplicate: true,
      };
    }

    // Generate unique reference ID and timestamp
    const referenceId = uuidv4();
    const timestamp = new Date().toISOString();

    // Build summary of changes
    const adds = accountChanges.filter((c) => c.type === CHANGE_TYPES.ADD);
    const edits = accountChanges.filter((c) => c.type === CHANGE_TYPES.EDIT);
    const removes = accountChanges.filter((c) => c.type === CHANGE_TYPES.REMOVE);

    const summary = {
      totalChanges: accountChanges.length,
      adds: adds.length,
      edits: edits.length,
      removes: removes.length,
      changes: accountChanges.map((c) => ({
        type: c.type,
        signerId: c.signerId,
        signerName: c.signerData
          ? `${c.signerData.firstName} ${c.signerData.lastName}`
          : null,
      })),
    };

    // Delegate persistence to signerService
    const submitResult = signerService.submitStagedChanges(accountId);

    if (!submitResult.success) {
      return {
        success: false,
        error: submitResult.error || 'Failed to persist staged changes.',
      };
    }

    // Store submission hash for idempotency
    const hash = generateSubmissionHash(accountChanges);
    storageService.setItem(LAST_SUBMISSION_HASH_KEY, hash);

    // Create submission record
    const submissionRecord = {
      referenceId,
      timestamp,
      accountId,
      userId: user.id,
      summary,
      status: 'COMPLETED',
    };

    // Persist to submission history
    const history = getSubmissionHistory();
    history.push(submissionRecord);
    saveSubmissionHistory(history);

    // Send mock confirmation notification
    const notificationResult = sendConfirmationNotification(user, submissionRecord);

    // Log the submission event
    auditLogService.logEvent(AUDIT_EVENTS.CHANGES_SUBMITTED, {
      userId: user.id,
      context: {
        referenceId,
        accountId,
        totalChanges: summary.totalChanges,
        adds: summary.adds,
        edits: summary.edits,
        removes: summary.removes,
      },
    });

    return {
      success: true,
      referenceId,
      timestamp,
      summary,
      confirmation: {
        notificationSent: notificationResult.success,
        message: notificationResult.message || null,
      },
    };
  } catch (error) {
    console.error('submissionService.submitChanges failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while submitting changes.',
    };
  }
}

/**
 * Retrieves a specific submission record by its reference ID.
 *
 * @param {string} referenceId - The unique reference ID of the submission.
 * @returns {Object} Result object with shape { success: boolean, submission?: Object, error?: string }.
 */
export function getSubmissionByReferenceId(referenceId) {
  try {
    if (!referenceId || typeof referenceId !== 'string') {
      return {
        success: false,
        error: 'Reference ID is required.',
      };
    }

    const history = getSubmissionHistory();
    const submission = history.find((s) => s.referenceId === referenceId);

    if (!submission) {
      return {
        success: false,
        error: 'Submission not found.',
      };
    }

    return {
      success: true,
      submission,
    };
  } catch (error) {
    console.error('submissionService.getSubmissionByReferenceId failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving the submission.',
    };
  }
}

/**
 * Retrieves all submissions for a given account ID.
 *
 * @param {string} accountId - The account ID to retrieve submissions for.
 * @returns {Object} Result object with shape { success: boolean, submissions?: Array<Object>, error?: string }.
 */
export function getSubmissionsByAccountId(accountId) {
  try {
    if (!accountId || typeof accountId !== 'string') {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    const history = getSubmissionHistory();
    const submissions = history.filter((s) => s.accountId === accountId);

    return {
      success: true,
      submissions,
    };
  } catch (error) {
    console.error('submissionService.getSubmissionsByAccountId failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving submissions.',
    };
  }
}

/**
 * Clears the submission history from storage.
 * Intended for development and testing purposes only.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clearSubmissionHistory() {
  try {
    storageService.setItem(SUBMISSION_HISTORY_KEY, []);
    storageService.removeItem(LAST_SUBMISSION_HASH_KEY);
    return true;
  } catch (error) {
    console.error('submissionService.clearSubmissionHistory failed:', error);
    return false;
  }
}

const submissionService = {
  submitChanges,
  getSubmissionHistory,
  getSubmissionByReferenceId,
  getSubmissionsByAccountId,
  checkDuplicateSubmission,
  clearSubmissionHistory,
};

export default submissionService;