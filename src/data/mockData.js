/**
 * Mock data fixtures for MVP development and testing.
 * Provides controlling party credentials, user profiles, accounts,
 * authorized signers, eSign tokens, and OTP codes.
 *
 * Initializes localStorage with fixture data on first load.
 *
 * @module mockData
 */

import { v4 as uuidv4 } from 'uuid';
import { SIGNER_STATUS, STORAGE_KEYS } from '../constants/constants.js';

/**
 * Mock controlling party user credentials.
 * @type {Array<Object>}
 */
export const MOCK_USERS = [
  {
    id: 'user-001',
    username: 'jsmith',
    password: 'Password1!',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '555-123-4567',
    role: 'CONTROLLING_PARTY',
    locked: false,
  },
  {
    id: 'user-002',
    username: 'mjohnson',
    password: 'Password2!',
    firstName: 'Maria',
    lastName: 'Johnson',
    email: 'maria.johnson@example.com',
    phone: '555-987-6543',
    role: 'CONTROLLING_PARTY',
    locked: false,
  },
];

/**
 * Mock user profiles (safe for client-side, no passwords).
 * @type {Array<Object>}
 */
export const MOCK_USER_PROFILES = MOCK_USERS.map(({ password, ...profile }) => profile);

/**
 * Mock accounts associated with controlling parties.
 * @type {Array<Object>}
 */
export const MOCK_ACCOUNTS = [
  {
    id: 'acct-001',
    userId: 'user-001',
    accountNumber: '****4521',
    fullAccountNumber: '82019384521',
    accountName: 'Smith Family Trust',
    accountType: 'TRUST',
    signerCount: 3,
    status: 'ACTIVE',
  },
  {
    id: 'acct-002',
    userId: 'user-001',
    accountNumber: '****7890',
    fullAccountNumber: '65028917890',
    accountName: 'Smith Holdings LLC',
    accountType: 'BUSINESS',
    signerCount: 2,
    status: 'ACTIVE',
  },
  {
    id: 'acct-003',
    userId: 'user-001',
    accountNumber: '****3344',
    fullAccountNumber: '90173553344',
    accountName: 'Smith Personal Checking',
    accountType: 'PERSONAL',
    signerCount: 1,
    status: 'ACTIVE',
  },
  {
    id: 'acct-004',
    userId: 'user-002',
    accountNumber: '****6677',
    fullAccountNumber: '44028916677',
    accountName: 'Johnson Enterprises',
    accountType: 'BUSINESS',
    signerCount: 4,
    status: 'ACTIVE',
  },
  {
    id: 'acct-005',
    userId: 'user-002',
    accountNumber: '****1122',
    fullAccountNumber: '77053891122',
    accountName: 'Johnson Family Trust',
    accountType: 'TRUST',
    signerCount: 2,
    status: 'ACTIVE',
  },
];

/**
 * Mock authorized signers per account.
 * @type {Array<Object>}
 */
export const MOCK_SIGNERS = [
  // Signers for acct-001 (Smith Family Trust)
  {
    id: 'signer-001',
    accountId: 'acct-001',
    firstName: 'John',
    lastName: 'Smith',
    role: 'Primary Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'john.smith@example.com',
    phone: '555-123-4567',
    ssn: '***-**-1234',
  },
  {
    id: 'signer-002',
    accountId: 'acct-001',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'Co-Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'jane.smith@example.com',
    phone: '555-123-8901',
    ssn: '***-**-5678',
  },
  {
    id: 'signer-003',
    accountId: 'acct-001',
    firstName: 'Robert',
    lastName: 'Smith',
    role: 'Authorized Signer',
    status: SIGNER_STATUS.PENDING,
    email: 'robert.smith@example.com',
    phone: '555-234-5678',
    ssn: '***-**-9012',
  },

  // Signers for acct-002 (Smith Holdings LLC)
  {
    id: 'signer-004',
    accountId: 'acct-002',
    firstName: 'John',
    lastName: 'Smith',
    role: 'Primary Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'john.smith@example.com',
    phone: '555-123-4567',
    ssn: '***-**-1234',
  },
  {
    id: 'signer-005',
    accountId: 'acct-002',
    firstName: 'Patricia',
    lastName: 'Williams',
    role: 'Authorized Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'patricia.williams@example.com',
    phone: '555-345-6789',
    ssn: '***-**-3456',
  },

  // Signers for acct-003 (Smith Personal Checking)
  {
    id: 'signer-006',
    accountId: 'acct-003',
    firstName: 'John',
    lastName: 'Smith',
    role: 'Primary Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'john.smith@example.com',
    phone: '555-123-4567',
    ssn: '***-**-1234',
  },

  // Signers for acct-004 (Johnson Enterprises)
  {
    id: 'signer-007',
    accountId: 'acct-004',
    firstName: 'Maria',
    lastName: 'Johnson',
    role: 'Primary Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'maria.johnson@example.com',
    phone: '555-987-6543',
    ssn: '***-**-7890',
  },
  {
    id: 'signer-008',
    accountId: 'acct-004',
    firstName: 'Carlos',
    lastName: 'Johnson',
    role: 'Co-Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'carlos.johnson@example.com',
    phone: '555-876-5432',
    ssn: '***-**-2345',
  },
  {
    id: 'signer-009',
    accountId: 'acct-004',
    firstName: 'Linda',
    lastName: 'Garcia',
    role: 'Authorized Signer',
    status: SIGNER_STATUS.LOCKED,
    email: 'linda.garcia@example.com',
    phone: '555-765-4321',
    ssn: '***-**-6789',
  },
  {
    id: 'signer-010',
    accountId: 'acct-004',
    firstName: 'David',
    lastName: 'Martinez',
    role: 'Authorized Signer',
    status: SIGNER_STATUS.PENDING,
    email: 'david.martinez@example.com',
    phone: '555-654-3210',
    ssn: '***-**-0123',
  },

  // Signers for acct-005 (Johnson Family Trust)
  {
    id: 'signer-011',
    accountId: 'acct-005',
    firstName: 'Maria',
    lastName: 'Johnson',
    role: 'Primary Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'maria.johnson@example.com',
    phone: '555-987-6543',
    ssn: '***-**-7890',
  },
  {
    id: 'signer-012',
    accountId: 'acct-005',
    firstName: 'Carlos',
    lastName: 'Johnson',
    role: 'Co-Signer',
    status: SIGNER_STATUS.ACTIVE,
    email: 'carlos.johnson@example.com',
    phone: '555-876-5432',
    ssn: '***-**-2345',
  },
];

/**
 * Mock eSign tokens for document signing verification.
 * @type {Array<Object>}
 */
export const MOCK_ESIGN_TOKENS = [
  {
    id: 'esign-001',
    userId: 'user-001',
    token: 'esign-token-abc123',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    used: false,
  },
  {
    id: 'esign-002',
    userId: 'user-002',
    token: 'esign-token-def456',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    used: false,
  },
];

/**
 * Mock OTP codes for two-factor authentication.
 * @type {Array<Object>}
 */
export const MOCK_OTP_CODES = [
  {
    id: 'otp-001',
    userId: 'user-001',
    code: '123456',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    verified: false,
  },
  {
    id: 'otp-002',
    userId: 'user-002',
    code: '654321',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    verified: false,
  },
];

/** @type {string} localStorage key for mock data initialization flag */
const MOCK_DATA_INITIALIZED_KEY = 'sig_mock_data_initialized';

/** @type {string} localStorage key for mock users */
const MOCK_USERS_KEY = 'sig_mock_users';

/** @type {string} localStorage key for mock accounts */
const MOCK_ACCOUNTS_KEY = 'sig_mock_accounts';

/** @type {string} localStorage key for mock signers */
const MOCK_SIGNERS_KEY = 'sig_mock_signers';

/** @type {string} localStorage key for mock eSign tokens */
const MOCK_ESIGN_TOKENS_KEY = 'sig_mock_esign_tokens';

/** @type {string} localStorage key for mock OTP codes */
const MOCK_OTP_CODES_KEY = 'sig_mock_otp_codes';

/**
 * Initializes localStorage with mock fixture data on first load.
 * Checks for an initialization flag to avoid overwriting data on subsequent loads.
 *
 * @returns {void}
 */
export function initializeMockData() {
  try {
    const isInitialized = localStorage.getItem(MOCK_DATA_INITIALIZED_KEY);

    if (isInitialized) {
      return;
    }

    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(MOCK_USERS));
    localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(MOCK_ACCOUNTS));
    localStorage.setItem(MOCK_SIGNERS_KEY, JSON.stringify(MOCK_SIGNERS));
    localStorage.setItem(MOCK_ESIGN_TOKENS_KEY, JSON.stringify(MOCK_ESIGN_TOKENS));
    localStorage.setItem(MOCK_OTP_CODES_KEY, JSON.stringify(MOCK_OTP_CODES));

    localStorage.setItem(MOCK_DATA_INITIALIZED_KEY, 'true');
  } catch (error) {
    console.error('Failed to initialize mock data in localStorage:', error);
  }
}

/**
 * Retrieves mock users from localStorage.
 * Falls back to in-memory fixtures if localStorage read fails.
 *
 * @returns {Array<Object>} The list of mock users.
 */
export function getMockUsers() {
  try {
    const data = localStorage.getItem(MOCK_USERS_KEY);
    return data ? JSON.parse(data) : MOCK_USERS;
  } catch (error) {
    console.error('Failed to read mock users from localStorage:', error);
    return MOCK_USERS;
  }
}

/**
 * Retrieves mock accounts from localStorage, optionally filtered by user ID.
 * Falls back to in-memory fixtures if localStorage read fails.
 *
 * @param {string} [userId] - Optional user ID to filter accounts.
 * @returns {Array<Object>} The list of mock accounts.
 */
export function getMockAccounts(userId) {
  try {
    const data = localStorage.getItem(MOCK_ACCOUNTS_KEY);
    const accounts = data ? JSON.parse(data) : MOCK_ACCOUNTS;

    if (userId) {
      return accounts.filter((account) => account.userId === userId);
    }

    return accounts;
  } catch (error) {
    console.error('Failed to read mock accounts from localStorage:', error);
    const accounts = MOCK_ACCOUNTS;

    if (userId) {
      return accounts.filter((account) => account.userId === userId);
    }

    return accounts;
  }
}

/**
 * Retrieves mock signers from localStorage, optionally filtered by account ID.
 * Falls back to in-memory fixtures if localStorage read fails.
 *
 * @param {string} [accountId] - Optional account ID to filter signers.
 * @returns {Array<Object>} The list of mock signers.
 */
export function getMockSigners(accountId) {
  try {
    const data = localStorage.getItem(MOCK_SIGNERS_KEY);
    const signers = data ? JSON.parse(data) : MOCK_SIGNERS;

    if (accountId) {
      return signers.filter((signer) => signer.accountId === accountId);
    }

    return signers;
  } catch (error) {
    console.error('Failed to read mock signers from localStorage:', error);
    const signers = MOCK_SIGNERS;

    if (accountId) {
      return signers.filter((signer) => signer.accountId === accountId);
    }

    return signers;
  }
}

/**
 * Retrieves mock eSign tokens from localStorage, optionally filtered by user ID.
 * Falls back to in-memory fixtures if localStorage read fails.
 *
 * @param {string} [userId] - Optional user ID to filter tokens.
 * @returns {Array<Object>} The list of mock eSign tokens.
 */
export function getMockESignTokens(userId) {
  try {
    const data = localStorage.getItem(MOCK_ESIGN_TOKENS_KEY);
    const tokens = data ? JSON.parse(data) : MOCK_ESIGN_TOKENS;

    if (userId) {
      return tokens.filter((token) => token.userId === userId);
    }

    return tokens;
  } catch (error) {
    console.error('Failed to read mock eSign tokens from localStorage:', error);
    const tokens = MOCK_ESIGN_TOKENS;

    if (userId) {
      return tokens.filter((token) => token.userId === userId);
    }

    return tokens;
  }
}

/**
 * Retrieves mock OTP codes from localStorage, optionally filtered by user ID.
 * Falls back to in-memory fixtures if localStorage read fails.
 *
 * @param {string} [userId] - Optional user ID to filter OTP codes.
 * @returns {Array<Object>} The list of mock OTP codes.
 */
export function getMockOtpCodes(userId) {
  try {
    const data = localStorage.getItem(MOCK_OTP_CODES_KEY);
    const codes = data ? JSON.parse(data) : MOCK_OTP_CODES;

    if (userId) {
      return codes.filter((code) => code.userId === userId);
    }

    return codes;
  } catch (error) {
    console.error('Failed to read mock OTP codes from localStorage:', error);
    const codes = MOCK_OTP_CODES;

    if (userId) {
      return codes.filter((code) => code.userId === userId);
    }

    return codes;
  }
}

/**
 * Generates a new mock OTP code for a given user and persists it to localStorage.
 *
 * @param {string} userId - The user ID to generate an OTP for.
 * @returns {Object} The newly generated OTP code object.
 */
export function generateMockOtp(userId) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const newOtp = {
    id: `otp-${uuidv4()}`,
    userId,
    code,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    verified: false,
  };

  try {
    const existingCodes = getMockOtpCodes();
    existingCodes.push(newOtp);
    localStorage.setItem(MOCK_OTP_CODES_KEY, JSON.stringify(existingCodes));
  } catch (error) {
    console.error('Failed to persist new OTP code to localStorage:', error);
  }

  return newOtp;
}

/**
 * Generates a new mock eSign token for a given user and persists it to localStorage.
 *
 * @param {string} userId - The user ID to generate an eSign token for.
 * @returns {Object} The newly generated eSign token object.
 */
export function generateMockESignToken(userId) {
  const now = new Date();
  const newToken = {
    id: `esign-${uuidv4()}`,
    userId,
    token: `esign-token-${uuidv4()}`,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    used: false,
  };

  try {
    const existingTokens = getMockESignTokens();
    existingTokens.push(newToken);
    localStorage.setItem(MOCK_ESIGN_TOKENS_KEY, JSON.stringify(existingTokens));
  } catch (error) {
    console.error('Failed to persist new eSign token to localStorage:', error);
  }

  return newToken;
}

/**
 * Resets all mock data in localStorage by clearing the initialization flag
 * and re-initializing with fresh fixture data.
 *
 * @returns {void}
 */
export function resetMockData() {
  try {
    localStorage.removeItem(MOCK_DATA_INITIALIZED_KEY);
    localStorage.removeItem(MOCK_USERS_KEY);
    localStorage.removeItem(MOCK_ACCOUNTS_KEY);
    localStorage.removeItem(MOCK_SIGNERS_KEY);
    localStorage.removeItem(MOCK_ESIGN_TOKENS_KEY);
    localStorage.removeItem(MOCK_OTP_CODES_KEY);
    initializeMockData();
  } catch (error) {
    console.error('Failed to reset mock data:', error);
  }
}