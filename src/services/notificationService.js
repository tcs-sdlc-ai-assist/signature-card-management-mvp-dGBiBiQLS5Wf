/**
 * Mock notification/email service providing confirmation email delivery
 * and signer invitation sending. All notifications are mocked and logged
 * via auditLogService.
 *
 * @module notificationService
 */

import { v4 as uuidv4 } from 'uuid';
import { AUDIT_EVENTS, STORAGE_KEYS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';

/** @type {string} Storage key for notification history */
const NOTIFICATION_HISTORY_KEY = 'notification_history';

/**
 * Notification type values.
 * @enum {string}
 */
export const NOTIFICATION_TYPES = {
  CONFIRMATION_EMAIL: 'CONFIRMATION_EMAIL',
  SIGNER_INVITATION: 'SIGNER_INVITATION',
};

/**
 * Notification status values.
 * @enum {string}
 */
export const NOTIFICATION_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
};

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
    console.error('notificationService.getAuthenticatedUser failed:', error);
    return null;
  }
}

/**
 * Retrieves the notification history from storage.
 *
 * @returns {Array<Object>} An array of past notification records.
 */
export function getNotificationHistory() {
  try {
    const history = storageService.getItem(NOTIFICATION_HISTORY_KEY, []);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('notificationService.getNotificationHistory failed:', error);
    return [];
  }
}

/**
 * Persists the notification history to storage.
 *
 * @param {Array<Object>} history - The array of notification records to persist.
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
function saveNotificationHistory(history) {
  try {
    return storageService.setItem(NOTIFICATION_HISTORY_KEY, history);
  } catch (error) {
    console.error('notificationService.saveNotificationHistory failed:', error);
    return false;
  }
}

/**
 * Creates and persists a notification record to the notification history.
 *
 * @param {Object} notificationData - The notification data to record.
 * @param {string} notificationData.type - The notification type (from NOTIFICATION_TYPES).
 * @param {string} notificationData.recipient - The recipient identifier (email or name).
 * @param {string} notificationData.status - The notification status (from NOTIFICATION_STATUS).
 * @param {Object} [notificationData.details] - Additional details about the notification.
 * @returns {Object} The created notification record.
 */
function createNotificationRecord(notificationData) {
  const record = {
    id: `notif-${uuidv4()}`,
    type: notificationData.type,
    recipient: notificationData.recipient,
    status: notificationData.status,
    details: notificationData.details || null,
    timestamp: new Date().toISOString(),
  };

  try {
    const history = getNotificationHistory();
    history.push(record);
    saveNotificationHistory(history);
  } catch (error) {
    console.error('notificationService.createNotificationRecord failed:', error);
  }

  return record;
}

/**
 * Sends a mock confirmation email to the controlling party with submission details.
 * Stubs email delivery and logs the event via auditLogService.
 *
 * @param {Object} controllingParty - The controlling party user profile.
 * @param {string} controllingParty.id - The user ID.
 * @param {string} [controllingParty.email] - The user's email address.
 * @param {string} [controllingParty.firstName] - The user's first name.
 * @param {string} [controllingParty.lastName] - The user's last name.
 * @param {Object} confirmationDetails - The confirmation/submission details.
 * @param {string} [confirmationDetails.referenceId] - The submission reference ID.
 * @param {string} [confirmationDetails.accountId] - The account ID.
 * @param {Object} [confirmationDetails.summary] - The submission summary.
 * @param {string} [confirmationDetails.timestamp] - The submission timestamp.
 * @returns {Object} Result object with shape { success: boolean, message?: string, notificationId?: string, error?: string }.
 */
export function sendConfirmationEmail(controllingParty, confirmationDetails) {
  try {
    if (!controllingParty || typeof controllingParty !== 'object') {
      return {
        success: false,
        error: 'Controlling party information is required.',
      };
    }

    if (!controllingParty.id) {
      return {
        success: false,
        error: 'Controlling party ID is required.',
      };
    }

    if (!confirmationDetails || typeof confirmationDetails !== 'object') {
      return {
        success: false,
        error: 'Confirmation details are required.',
      };
    }

    const recipientEmail = controllingParty.email || 'unknown';
    const recipientName = [controllingParty.firstName, controllingParty.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown User';

    const referenceId = confirmationDetails.referenceId || 'N/A';
    const accountId = confirmationDetails.accountId || 'N/A';
    const summary = confirmationDetails.summary || {};

    // Mock email delivery — log to console
    console.info(
      `[DEV] Confirmation email sent to ${recipientName} (${recipientEmail}) ` +
      `for submission ${referenceId}. ` +
      `Account: ${accountId}. ` +
      `Changes: ${summary.totalChanges || 0} total ` +
      `(${summary.adds || 0} added, ${summary.edits || 0} edited, ${summary.removes || 0} removed).`
    );

    // Create notification record
    const record = createNotificationRecord({
      type: NOTIFICATION_TYPES.CONFIRMATION_EMAIL,
      recipient: recipientEmail,
      status: NOTIFICATION_STATUS.SENT,
      details: {
        recipientName,
        referenceId,
        accountId,
        summary,
        timestamp: confirmationDetails.timestamp || new Date().toISOString(),
      },
    });

    // Log the event via auditLogService
    auditLogService.logEvent(AUDIT_EVENTS.CHANGES_SUBMITTED, {
      userId: controllingParty.id,
      context: {
        action: 'CONFIRMATION_EMAIL_SENT',
        notificationId: record.id,
        referenceId,
        accountId,
        recipientEmail,
      },
    });

    return {
      success: true,
      message: `Confirmation email has been sent to ${recipientEmail}.`,
      notificationId: record.id,
    };
  } catch (error) {
    console.error('notificationService.sendConfirmationEmail failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while sending the confirmation email.',
    };
  }
}

/**
 * Sends a mock invitation to a signer for the resend invitation flow.
 * Stubs invitation delivery and logs the event via auditLogService.
 *
 * @param {Object} signer - The signer to send the invitation to.
 * @param {string} signer.id - The signer ID.
 * @param {string} signer.firstName - The signer's first name.
 * @param {string} signer.lastName - The signer's last name.
 * @param {string} [signer.email] - The signer's email address.
 * @param {string} [signer.phone] - The signer's phone number.
 * @param {string} [signer.accountId] - The account ID the signer belongs to.
 * @returns {Object} Result object with shape { success: boolean, message?: string, notificationId?: string, error?: string }.
 */
export function sendInvitation(signer) {
  try {
    if (!signer || typeof signer !== 'object') {
      return {
        success: false,
        error: 'Signer information is required.',
      };
    }

    if (!signer.id) {
      return {
        success: false,
        error: 'Signer ID is required.',
      };
    }

    if (!signer.firstName || !signer.lastName) {
      return {
        success: false,
        error: 'Signer first name and last name are required.',
      };
    }

    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to send an invitation.',
      };
    }

    const signerName = `${signer.firstName} ${signer.lastName}`;
    const signerEmail = signer.email || 'unknown';
    const signerPhone = signer.phone || 'unknown';
    const accountId = signer.accountId || 'N/A';

    // Mock invitation delivery — log to console
    console.info(
      `[DEV] Invitation sent to ${signerName} ` +
      `(email: ${signerEmail}, phone: ${signerPhone}) ` +
      `for account ${accountId}.`
    );

    // Create notification record
    const record = createNotificationRecord({
      type: NOTIFICATION_TYPES.SIGNER_INVITATION,
      recipient: signerEmail !== 'unknown' ? signerEmail : signerName,
      status: NOTIFICATION_STATUS.SENT,
      details: {
        signerId: signer.id,
        signerName,
        signerEmail,
        signerPhone,
        accountId,
        sentBy: user.id,
      },
    });

    // Log the event via auditLogService
    auditLogService.logEvent(AUDIT_EVENTS.SIGNER_EDITED, {
      userId: user.id,
      context: {
        action: 'INVITATION_SENT',
        notificationId: record.id,
        signerId: signer.id,
        signerName,
        accountId,
      },
    });

    return {
      success: true,
      message: `Invitation has been sent to ${signerName}.`,
      notificationId: record.id,
    };
  } catch (error) {
    console.error('notificationService.sendInvitation failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while sending the invitation.',
    };
  }
}

/**
 * Retrieves notifications filtered by type.
 *
 * @param {string} type - The notification type to filter by (from NOTIFICATION_TYPES).
 * @returns {Array<Object>} An array of matching notification records.
 */
export function getNotificationsByType(type) {
  try {
    if (!type || typeof type !== 'string') {
      return [];
    }

    const history = getNotificationHistory();
    return history.filter((record) => record.type === type);
  } catch (error) {
    console.error('notificationService.getNotificationsByType failed:', error);
    return [];
  }
}

/**
 * Retrieves a specific notification record by its ID.
 *
 * @param {string} notificationId - The unique ID of the notification.
 * @returns {Object} Result object with shape { success: boolean, notification?: Object, error?: string }.
 */
export function getNotificationById(notificationId) {
  try {
    if (!notificationId || typeof notificationId !== 'string') {
      return {
        success: false,
        error: 'Notification ID is required.',
      };
    }

    const history = getNotificationHistory();
    const notification = history.find((record) => record.id === notificationId);

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found.',
      };
    }

    return {
      success: true,
      notification,
    };
  } catch (error) {
    console.error('notificationService.getNotificationById failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving the notification.',
    };
  }
}

/**
 * Clears all notification history from storage.
 * Intended for development and testing purposes only.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clearNotificationHistory() {
  try {
    return storageService.setItem(NOTIFICATION_HISTORY_KEY, []);
  } catch (error) {
    console.error('notificationService.clearNotificationHistory failed:', error);
    return false;
  }
}

const notificationService = {
  sendConfirmationEmail,
  sendInvitation,
  getNotificationHistory,
  getNotificationsByType,
  getNotificationById,
  clearNotificationHistory,
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
};

export default notificationService;