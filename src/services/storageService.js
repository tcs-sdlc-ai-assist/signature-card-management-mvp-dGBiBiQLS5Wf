/**
 * localStorage abstraction layer providing get/set/remove/clear operations
 * with JSON serialization, error handling, and key namespacing.
 * Used by all services for data persistence.
 *
 * @module storageService
 */

/** @type {string} Namespace prefix for all storage keys */
const NAMESPACE = 'sig_';

/**
 * Applies the namespace prefix to a given key.
 * If the key already starts with the namespace prefix, it is returned as-is.
 *
 * @param {string} key - The storage key.
 * @returns {string} The namespaced key.
 */
function getNamespacedKey(key) {
  if (key.startsWith(NAMESPACE)) {
    return key;
  }
  return `${NAMESPACE}${key}`;
}

/**
 * Retrieves a value from localStorage by key, deserializing from JSON.
 * Returns the provided default value if the key does not exist or if an error occurs.
 *
 * @param {string} key - The storage key (will be namespaced automatically).
 * @param {*} [defaultValue=null] - The default value to return if the key is not found or on error.
 * @returns {*} The deserialized value, or the default value.
 */
export function getItem(key, defaultValue = null) {
  try {
    const namespacedKey = getNamespacedKey(key);
    const raw = localStorage.getItem(namespacedKey);

    if (raw === null) {
      return defaultValue;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(`storageService.getItem failed for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Stores a value in localStorage by key, serializing to JSON.
 *
 * @param {string} key - The storage key (will be namespaced automatically).
 * @param {*} value - The value to store (will be JSON-serialized).
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function setItem(key, value) {
  try {
    const namespacedKey = getNamespacedKey(key);
    const serialized = JSON.stringify(value);
    localStorage.setItem(namespacedKey, serialized);
    return true;
  } catch (error) {
    console.error(`storageService.setItem failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Removes a value from localStorage by key.
 *
 * @param {string} key - The storage key (will be namespaced automatically).
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function removeItem(key) {
  try {
    const namespacedKey = getNamespacedKey(key);
    localStorage.removeItem(namespacedKey);
    return true;
  } catch (error) {
    console.error(`storageService.removeItem failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Clears all namespaced items from localStorage.
 * Only removes keys that start with the application namespace prefix.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function clear() {
  try {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NAMESPACE)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    return true;
  } catch (error) {
    console.error('storageService.clear failed:', error);
    return false;
  }
}

/**
 * Checks whether a key exists in localStorage.
 *
 * @param {string} key - The storage key (will be namespaced automatically).
 * @returns {boolean} True if the key exists, false otherwise.
 */
export function hasItem(key) {
  try {
    const namespacedKey = getNamespacedKey(key);
    return localStorage.getItem(namespacedKey) !== null;
  } catch (error) {
    console.error(`storageService.hasItem failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Retrieves all namespaced keys currently stored in localStorage.
 *
 * @returns {Array<string>} An array of keys (without the namespace prefix).
 */
export function getKeys() {
  try {
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NAMESPACE)) {
        keys.push(key.slice(NAMESPACE.length));
      }
    }

    return keys;
  } catch (error) {
    console.error('storageService.getKeys failed:', error);
    return [];
  }
}

/**
 * Retrieves a raw (non-deserialized) string value from localStorage by key.
 * Useful when the stored value is not JSON-serialized.
 *
 * @param {string} key - The storage key (will be namespaced automatically).
 * @param {string|null} [defaultValue=null] - The default value to return if the key is not found.
 * @returns {string|null} The raw string value, or the default value.
 */
export function getRawItem(key, defaultValue = null) {
  try {
    const namespacedKey = getNamespacedKey(key);
    const raw = localStorage.getItem(namespacedKey);
    return raw !== null ? raw : defaultValue;
  } catch (error) {
    console.error(`storageService.getRawItem failed for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Stores a raw string value in localStorage by key without JSON serialization.
 *
 * @param {string} key - The storage key (will be namespaced automatically).
 * @param {string} value - The string value to store.
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export function setRawItem(key, value) {
  try {
    const namespacedKey = getNamespacedKey(key);
    localStorage.setItem(namespacedKey, value);
    return true;
  } catch (error) {
    console.error(`storageService.setRawItem failed for key "${key}":`, error);
    return false;
  }
}

const storageService = {
  getItem,
  setItem,
  removeItem,
  clear,
  hasItem,
  getKeys,
  getRawItem,
  setRawItem,
};

export default storageService;