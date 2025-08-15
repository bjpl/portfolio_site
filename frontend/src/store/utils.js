/**
 * Utility functions for state management
 */

/**
 * Combine multiple reducers into a single reducer function
 */
export const combineReducers = (reducers) => {
  return (state = {}, action) => {
    return Object.keys(reducers).reduce((nextState, key) => {
      nextState[key] = reducers[key](state[key], action);
      return nextState;
    }, {});
  };
};

/**
 * Create async action types
 */
export const createAsyncActionTypes = (base) => ({
  REQUEST: `${base}_REQUEST`,
  SUCCESS: `${base}_SUCCESS`,
  FAILURE: `${base}_FAILURE`
});

/**
 * Create reducer for handling async actions
 */
export const createAsyncReducer = (actionType, initialState = {}) => {
  const types = createAsyncActionTypes(actionType);
  
  return (state = initialState, action) => {
    switch (action.type) {
      case types.REQUEST:
        return {
          ...state,
          loading: true,
          error: null
        };
      case types.SUCCESS:
        return {
          ...state,
          loading: false,
          data: action.payload,
          error: null
        };
      case types.FAILURE:
        return {
          ...state,
          loading: false,
          error: action.payload
        };
      default:
        return state;
    }
  };
};

/**
 * Create a simple action creator
 */
export const createAction = (type) => (payload) => ({
  type,
  payload
});

/**
 * Create async action creators
 */
export const createAsyncActions = (actionType) => {
  const types = createAsyncActionTypes(actionType);
  
  return {
    request: createAction(types.REQUEST),
    success: createAction(types.SUCCESS),
    failure: createAction(types.FAILURE)
  };
};

/**
 * Normalize array data by ID
 */
export const normalizeData = (data, idKey = 'id') => {
  return data.reduce((acc, item) => {
    acc.byId[item[idKey]] = item;
    acc.allIds.push(item[idKey]);
    return acc;
  }, { byId: {}, allIds: [] });
};

/**
 * Denormalize data from normalized state
 */
export const denormalizeData = (normalizedData) => {
  const { byId, allIds } = normalizedData;
  return allIds.map(id => byId[id]);
};

/**
 * Update item in normalized state
 */
export const updateNormalizedItem = (state, id, updates) => {
  return {
    ...state,
    byId: {
      ...state.byId,
      [id]: {
        ...state.byId[id],
        ...updates
      }
    }
  };
};

/**
 * Remove item from normalized state
 */
export const removeNormalizedItem = (state, id) => {
  const { [id]: removed, ...byId } = state.byId;
  return {
    byId,
    allIds: state.allIds.filter(itemId => itemId !== id)
  };
};

/**
 * Add item to normalized state
 */
export const addNormalizedItem = (state, item, idKey = 'id') => {
  const id = item[idKey];
  return {
    byId: {
      ...state.byId,
      [id]: item
    },
    allIds: [...state.allIds, id]
  };
};

/**
 * Create selector for normalized data
 */
export const createSelector = (...funcs) => {
  const resultFunc = funcs.pop();
  const dependencies = funcs;
  
  let lastDependencies = [];
  let lastResult;
  
  return (state) => {
    const currentDependencies = dependencies.map(dep => dep(state));
    
    const dependenciesChanged = currentDependencies.some(
      (dep, index) => dep !== lastDependencies[index]
    );
    
    if (dependenciesChanged) {
      lastDependencies = currentDependencies;
      lastResult = resultFunc(...currentDependencies);
    }
    
    return lastResult;
  };
};

/**
 * Batch actions
 */
export const batchActions = (actions) => ({
  type: 'BATCH_ACTIONS',
  payload: actions
});

/**
 * Create batch reducer
 */
export const enableBatching = (reducer) => {
  return (state, action) => {
    if (action.type === 'BATCH_ACTIONS') {
      return action.payload.reduce(reducer, state);
    }
    return reducer(state, action);
  };
};

/**
 * Deep merge objects
 */
export const deepMerge = (target, source) => {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
};

/**
 * Check if value is an object
 */
const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};