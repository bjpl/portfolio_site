/**
 * Redux-like middleware system for the store
 */

/**
 * Logger middleware - logs all actions and state changes
 */
export const loggerMiddleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(action.type);
    console.log('Previous State:', store.getState());
    console.log('Action:', action);
    
    const result = next(action);
    
    console.log('Next State:', store.getState());
    console.groupEnd();
    
    return result;
  }
  
  return next(action);
};

/**
 * Thunk middleware - allows dispatching functions
 */
export const thunkMiddleware = (store) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  
  return next(action);
};

/**
 * Promise middleware - handles promise-based actions
 */
export const promiseMiddleware = (store) => (next) => (action) => {
  if (!action.payload || !action.payload.then) {
    return next(action);
  }
  
  const { type, payload, meta } = action;
  
  // Dispatch request action
  next({
    type: `${type}_REQUEST`,
    meta
  });
  
  return payload
    .then(result => {
      // Dispatch success action
      next({
        type: `${type}_SUCCESS`,
        payload: result,
        meta
      });
      return result;
    })
    .catch(error => {
      // Dispatch failure action
      next({
        type: `${type}_FAILURE`,
        payload: error,
        error: true,
        meta
      });
      throw error;
    });
};

/**
 * Error middleware - catches and handles errors
 */
export const errorMiddleware = (store) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Error in reducer:', error);
    
    // Dispatch error action
    next({
      type: 'ERROR_OCCURRED',
      payload: {
        error: error.message,
        action: action.type,
        timestamp: new Date().toISOString()
      }
    });
    
    throw error;
  }
};

/**
 * Analytics middleware - tracks actions for analytics
 */
export const analyticsMiddleware = (store) => (next) => (action) => {
  // Track specific actions
  const trackedActions = [
    'AUTH/LOGIN_SUCCESS',
    'AUTH/LOGOUT',
    'PORTFOLIO/PROJECT_VIEWED',
    'CONTENT/POST_VIEWED',
    'CONTACT/FORM_SUBMITTED'
  ];
  
  if (trackedActions.includes(action.type)) {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', action.type, {
        category: 'User Action',
        label: action.payload?.id || 'N/A'
      });
    }
  }
  
  return next(action);
};

/**
 * Local storage middleware - syncs specific state to localStorage
 */
export const localStorageMiddleware = (config = {}) => {
  const { key = 'app_state', whitelist = [] } = config;
  
  return (store) => (next) => (action) => {
    const result = next(action);
    
    // Save whitelisted state to localStorage
    if (whitelist.length > 0) {
      const state = store.getState();
      const stateToSave = {};
      
      whitelist.forEach(key => {
        if (state[key]) {
          stateToSave[key] = state[key];
        }
      });
      
      try {
        localStorage.setItem(key, JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
      }
    }
    
    return result;
  };
};

/**
 * API middleware - handles API calls
 */
export const apiMiddleware = (store) => (next) => (action) => {
  if (!action.api) {
    return next(action);
  }
  
  const { api, type, ...rest } = action;
  const { url, method = 'GET', body, headers = {} } = api;
  
  // Get auth token from state
  const state = store.getState();
  const token = state.auth?.token;
  
  // Add auth header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add content type for JSON
  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Dispatch request action
  next({
    type: `${type}_REQUEST`,
    ...rest
  });
  
  // Make API call
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(error.message || 'API request failed');
        });
      }
      return response.json();
    })
    .then(data => {
      // Dispatch success action
      next({
        type: `${type}_SUCCESS`,
        payload: data,
        ...rest
      });
      return data;
    })
    .catch(error => {
      // Dispatch failure action
      next({
        type: `${type}_FAILURE`,
        payload: error.message,
        error: true,
        ...rest
      });
      throw error;
    });
};

/**
 * Debounce middleware - debounces specific actions
 */
export const debounceMiddleware = (config = {}) => {
  const timers = {};
  
  return (store) => (next) => (action) => {
    const { debounce } = action.meta || {};
    
    if (!debounce) {
      return next(action);
    }
    
    const { key, delay = 500 } = debounce;
    const timerKey = key || action.type;
    
    // Clear existing timer
    if (timers[timerKey]) {
      clearTimeout(timers[timerKey]);
    }
    
    // Set new timer
    timers[timerKey] = setTimeout(() => {
      delete timers[timerKey];
      next(action);
    }, delay);
  };
};

/**
 * Create middleware enhancer
 */
export const createMiddleware = (reducer, middlewares = []) => {
  // Default middlewares
  const defaultMiddlewares = [
    thunkMiddleware,
    promiseMiddleware,
    errorMiddleware
  ];
  
  // Combine all middlewares
  const allMiddlewares = [...defaultMiddlewares, ...middlewares];
  
  // Create fake store for middleware
  let state;
  const store = {
    getState: () => state,
    dispatch: (action) => {
      state = enhancedReducer(state, action);
      return action;
    }
  };
  
  // Apply middlewares
  let dispatch = store.dispatch;
  const chain = allMiddlewares.map(middleware => middleware(store));
  dispatch = chain.reduceRight((next, middleware) => middleware(next), dispatch);
  
  // Create enhanced reducer
  const enhancedReducer = (currentState, action) => {
    state = currentState;
    dispatch(action);
    return state;
  };
  
  return reducer;
};

// Export all middlewares
export default {
  loggerMiddleware,
  thunkMiddleware,
  promiseMiddleware,
  errorMiddleware,
  analyticsMiddleware,
  localStorageMiddleware,
  apiMiddleware,
  debounceMiddleware
};