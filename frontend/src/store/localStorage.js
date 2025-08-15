/**
 * Local Storage utilities for persisting state
 */

/**
 * Load state from localStorage
 */
export const loadState = (key = 'app_state') => {
  try {
    const serializedState = localStorage.getItem(key);
    
    if (serializedState === null) {
      return undefined;
    }
    
    const state = JSON.parse(serializedState);
    
    // Validate and migrate state if needed
    return validateAndMigrateState(state);
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return undefined;
  }
};

/**
 * Save state to localStorage
 */
export const saveState = (key = 'app_state', state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      // Clear old data or notify user
      clearOldLocalStorageData();
    }
  }
};

/**
 * Clear state from localStorage
 */
export const clearState = (key = 'app_state') => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error);
  }
};

/**
 * Validate and migrate state structure
 */
const validateAndMigrateState = (state) => {
  // Check if state has expected structure
  if (!state || typeof state !== 'object') {
    return undefined;
  }
  
  // Migrate old state structure to new one
  let migratedState = { ...state };
  
  // Example migration: rename old field names
  if (state.user && state.user.fullName && !state.user.name) {
    migratedState.user = {
      ...state.user,
      name: state.user.fullName,
      fullName: undefined
    };
  }
  
  // Remove expired data
  if (state.auth && state.auth.tokenExpiry) {
    const now = Date.now();
    const expiry = new Date(state.auth.tokenExpiry).getTime();
    
    if (expiry < now) {
      // Token expired, clear auth state
      migratedState.auth = {
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null
      };
    }
  }
  
  return migratedState;
};

/**
 * Clear old localStorage data when quota is exceeded
 */
const clearOldLocalStorageData = () => {
  const keysToPreserve = ['app_state', 'user_preferences', 'auth_token'];
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (!keysToPreserve.includes(key)) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove ${key} from localStorage:`, error);
      }
    }
  });
};

/**
 * Get localStorage size in bytes
 */
export const getLocalStorageSize = () => {
  let size = 0;
  
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      size += localStorage[key].length + key.length;
    }
  }
  
  return size;
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = () => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Create a localStorage wrapper with fallback to memory
 */
class StorageWrapper {
  constructor() {
    this.isLocalStorageAvailable = isLocalStorageAvailable();
    this.memoryStorage = {};
  }
  
  getItem(key) {
    if (this.isLocalStorageAvailable) {
      return localStorage.getItem(key);
    }
    return this.memoryStorage[key] || null;
  }
  
  setItem(key, value) {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // Fallback to memory
        this.memoryStorage[key] = value;
      }
    } else {
      this.memoryStorage[key] = value;
    }
  }
  
  removeItem(key) {
    if (this.isLocalStorageAvailable) {
      localStorage.removeItem(key);
    }
    delete this.memoryStorage[key];
  }
  
  clear() {
    if (this.isLocalStorageAvailable) {
      localStorage.clear();
    }
    this.memoryStorage = {};
  }
}

// Export storage wrapper instance
export const storage = new StorageWrapper();

// Export utility for syncing state with localStorage
export const createStorageSync = (config = {}) => {
  const {
    key = 'app_state',
    whitelist = [],
    blacklist = [],
    throttle = 1000,
    migrate
  } = config;
  
  let timeoutId;
  
  return {
    save: (state) => {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Throttle saves
      timeoutId = setTimeout(() => {
        let stateToSave = state;
        
        // Apply whitelist
        if (whitelist.length > 0) {
          stateToSave = {};
          whitelist.forEach(key => {
            if (state[key] !== undefined) {
              stateToSave[key] = state[key];
            }
          });
        }
        
        // Apply blacklist
        if (blacklist.length > 0) {
          stateToSave = { ...stateToSave };
          blacklist.forEach(key => {
            delete stateToSave[key];
          });
        }
        
        saveState(key, stateToSave);
      }, throttle);
    },
    
    load: () => {
      let state = loadState(key);
      
      // Apply migration if provided
      if (migrate && state) {
        state = migrate(state);
      }
      
      return state;
    },
    
    clear: () => {
      clearState(key);
    }
  };
};