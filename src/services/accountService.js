/**
 * Account data access service providing account retrieval, selection,
 * masking, and pagination for the authenticated controlling party.
 * All events are logged via auditLogService.
 *
 * @module accountService
 */

import { AUDIT_EVENTS, STORAGE_KEYS } from '../constants/constants.js';
import * as storageService from './storageService.js';
import * as auditLogService from './auditLogService.js';
import { getMockAccounts } from '../data/mockData.js';

/** @type {string} Storage key for the currently selected account */
const SELECTED_ACCOUNT_KEY = 'selected_account';

/** @type {number} Default page size for pagination */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Masks an account number to show only the last 4 digits.
 * Example: '82019384521' -> '****4521'
 *
 * @param {string} accountNumber - The full account number to mask.
 * @returns {string} The masked account number.
 */
export function maskAccountNumber(accountNumber) {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return '****';
  }

  const trimmed = accountNumber.trim();

  if (trimmed.length <= 4) {
    return `****${trimmed}`;
  }

  const lastFour = trimmed.slice(-4);
  return `****${lastFour}`;
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
    console.error('accountService.getAuthenticatedUser failed:', error);
    return null;
  }
}

/**
 * Retrieves all accounts for the currently authenticated controlling party.
 * Returns accounts with masked account numbers for display.
 *
 * @param {Object} [options={}] - Optional parameters for filtering and pagination.
 * @param {number} [options.page=1] - The page number (1-based).
 * @param {number} [options.pageSize=10] - The number of accounts per page.
 * @param {string} [options.accountType] - Optional account type filter (e.g., 'TRUST', 'BUSINESS', 'PERSONAL').
 * @param {string} [options.searchTerm] - Optional search term to filter by account name or number.
 * @returns {Object} Result object with shape { success: boolean, accounts?: Array<Object>, total?: number, page?: number, pageSize?: number, totalPages?: number, error?: string }.
 */
export function getAccounts(options = {}) {
  try {
    const user = getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to view accounts.',
      };
    }

    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      accountType,
      searchTerm,
    } = options;

    // Retrieve accounts for the authenticated user
    let accounts = getMockAccounts(user.id);

    // Apply account type filter
    if (accountType && typeof accountType === 'string') {
      accounts = accounts.filter(
        (account) => account.accountType.toUpperCase() === accountType.toUpperCase()
      );
    }

    // Apply search term filter
    if (searchTerm && typeof searchTerm === 'string') {
      const term = searchTerm.toLowerCase().trim();
      accounts = accounts.filter(
        (account) =>
          account.accountName.toLowerCase().includes(term) ||
          account.accountNumber.includes(term) ||
          account.fullAccountNumber.includes(term)
      );
    }

    // Ensure accounts have masked account numbers for display
    const maskedAccounts = accounts.map((account) => ({
      ...account,
      accountNumber: account.accountNumber.startsWith('****')
        ? account.accountNumber
        : maskAccountNumber(account.fullAccountNumber),
    }));

    const total = maskedAccounts.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const paginatedAccounts = maskedAccounts.slice(startIndex, endIndex);

    // Remove fullAccountNumber from response for security
    const safeAccounts = paginatedAccounts.map(({ fullAccountNumber, ...rest }) => rest);

    auditLogService.logEvent(AUDIT_EVENTS.ACCOUNT_SEARCHED, {
      userId: user.id,
      context: {
        totalResults: total,
        page: safePage,
        pageSize,
        accountType: accountType || null,
        searchTerm: searchTerm || null,
      },
    });

    return {
      success: true,
      accounts: safeAccounts,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('accountService.getAccounts failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving accounts.',
    };
  }
}

/**
 * Selects an account by its ID and persists the selection to storage.
 * Validates that the account belongs to the currently authenticated user.
 *
 * @param {string} accountId - The ID of the account to select.
 * @returns {Object} Result object with shape { success: boolean, account?: Object, error?: string }.
 */
export function selectAccount(accountId) {
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
        error: 'You must be logged in to select an account.',
      };
    }

    // Retrieve accounts for the authenticated user
    const accounts = getMockAccounts(user.id);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      return {
        success: false,
        error: 'Account not found or you do not have access to this account.',
      };
    }

    // Build safe account object with masked number
    const safeAccount = {
      ...account,
      accountNumber: account.accountNumber.startsWith('****')
        ? account.accountNumber
        : maskAccountNumber(account.fullAccountNumber),
    };

    // Remove fullAccountNumber for security
    const { fullAccountNumber, ...accountToStore } = safeAccount;

    // Persist selected account
    storageService.setItem(SELECTED_ACCOUNT_KEY, accountToStore);

    auditLogService.logEvent(AUDIT_EVENTS.ACCOUNT_SELECTED, {
      userId: user.id,
      context: {
        accountId: account.id,
        accountName: account.accountName,
        accountType: account.accountType,
      },
    });

    return {
      success: true,
      account: accountToStore,
    };
  } catch (error) {
    console.error('accountService.selectAccount failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while selecting the account.',
    };
  }
}

/**
 * Retrieves the currently selected account from storage.
 *
 * @returns {Object|null} The selected account object, or null if no account is selected.
 */
export function getSelectedAccount() {
  try {
    const user = getAuthenticatedUser();

    if (!user) {
      return null;
    }

    const selectedAccount = storageService.getItem(SELECTED_ACCOUNT_KEY, null);

    if (!selectedAccount) {
      return null;
    }

    // Verify the selected account still belongs to the authenticated user
    if (selectedAccount.userId !== user.id) {
      // Clear stale selection from a different user
      storageService.removeItem(SELECTED_ACCOUNT_KEY);
      return null;
    }

    return selectedAccount;
  } catch (error) {
    console.error('accountService.getSelectedAccount failed:', error);
    return null;
  }
}

/**
 * Clears the currently selected account from storage.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clearSelectedAccount() {
  try {
    storageService.removeItem(SELECTED_ACCOUNT_KEY);
    return true;
  } catch (error) {
    console.error('accountService.clearSelectedAccount failed:', error);
    return false;
  }
}

/**
 * Retrieves a single account by its ID for the authenticated user.
 * Returns the account with masked account number.
 *
 * @param {string} accountId - The ID of the account to retrieve.
 * @returns {Object} Result object with shape { success: boolean, account?: Object, error?: string }.
 */
export function getAccountById(accountId) {
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
        error: 'You must be logged in to view account details.',
      };
    }

    const accounts = getMockAccounts(user.id);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      return {
        success: false,
        error: 'Account not found or you do not have access to this account.',
      };
    }

    // Build safe account object
    const { fullAccountNumber, ...safeAccount } = {
      ...account,
      accountNumber: account.accountNumber.startsWith('****')
        ? account.accountNumber
        : maskAccountNumber(account.fullAccountNumber),
    };

    return {
      success: true,
      account: safeAccount,
    };
  } catch (error) {
    console.error('accountService.getAccountById failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving the account.',
    };
  }
}

const accountService = {
  getAccounts,
  selectAccount,
  getSelectedAccount,
  clearSelectedAccount,
  getAccountById,
  maskAccountNumber,
};

export default accountService;