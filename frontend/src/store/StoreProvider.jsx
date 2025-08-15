import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { rootReducer, initialState } from './reducers';
import * as actions from './actions';
import { loadState, saveState } from './localStorage';
import { createMiddleware } from './middleware';

// Create Store Context
const StoreContext = createContext(null);
const DispatchContext = createContext(null);

/**
 * Store Provider Component
 * Provides global state management with Redux-like patterns
 */
export const StoreProvider = ({ 
  children, 
  persistKey = 'app_state',
  middlewares = [],
  initialStateOverride = {}
}) => {
  // Load persisted state
  const persistedState = loadState(persistKey);
  
  // Merge initial state with persisted and override
  const mergedInitialState = {
    ...initialState,
    ...persistedState,
    ...initialStateOverride
  };

  // Create reducer with middleware
  const enhancedReducer = createMiddleware(rootReducer, middlewares);
  
  // Initialize state and dispatch
  const [state, dispatch] = useReducer(enhancedReducer, mergedInitialState);

  // Create enhanced dispatch with action creators
  const enhancedDispatch = useMemo(() => {
    const dispatchWithActions = (action) => {
      // Allow dispatching by action name
      if (typeof action === 'string') {
        const actionCreator = actions[action];
        if (actionCreator) {
          return dispatch(actionCreator());
        }
      }
      return dispatch(action);
    };

    // Attach action creators to dispatch
    Object.keys(actions).forEach(actionName => {
      dispatchWithActions[actionName] = (...args) => {
        dispatch(actions[actionName](...args));
      };
    });

    return dispatchWithActions;
  }, [dispatch]);

  // Persist state changes
  useEffect(() => {
    const stateToPersist = {
      auth: state.auth,
      user: state.user,
      preferences: state.preferences,
      // Don't persist temporary UI state
    };
    saveState(persistKey, stateToPersist);
  }, [state, persistKey]);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('State updated:', state);
    }
  }, [state]);

  return (
    <StoreContext.Provider value={state}>
      <DispatchContext.Provider value={enhancedDispatch}>
        {children}
      </DispatchContext.Provider>
    </StoreContext.Provider>
  );
};

/**
 * Custom hooks for accessing store
 */
export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === null) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
};

export const useDispatch = () => {
  const context = useContext(DispatchContext);
  if (context === null) {
    throw new Error('useDispatch must be used within StoreProvider');
  }
  return context;
};

export const useSelector = (selector) => {
  const state = useStore();
  return useMemo(() => selector(state), [state, selector]);
};

// Convenience hook that returns both state and dispatch
export const useStoreContext = () => {
  return [useStore(), useDispatch()];
};