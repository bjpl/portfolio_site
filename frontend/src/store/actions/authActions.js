export const AUTH_ACTIONS = {
  LOGIN_REQUEST: 'AUTH/LOGIN_REQUEST',
  LOGIN_SUCCESS: 'AUTH/LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH/LOGIN_FAILURE',
  LOGOUT: 'AUTH/LOGOUT',
  REFRESH_TOKEN_REQUEST: 'AUTH/REFRESH_TOKEN_REQUEST',
  REFRESH_TOKEN_SUCCESS: 'AUTH/REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE: 'AUTH/REFRESH_TOKEN_FAILURE',
  UPDATE_USER: 'AUTH/UPDATE_USER',
  VERIFY_EMAIL_REQUEST: 'AUTH/VERIFY_EMAIL_REQUEST',
  VERIFY_EMAIL_SUCCESS: 'AUTH/VERIFY_EMAIL_SUCCESS',
  VERIFY_EMAIL_FAILURE: 'AUTH/VERIFY_EMAIL_FAILURE',
  RESET_PASSWORD_REQUEST: 'AUTH/RESET_PASSWORD_REQUEST',
  RESET_PASSWORD_SUCCESS: 'AUTH/RESET_PASSWORD_SUCCESS',
  RESET_PASSWORD_FAILURE: 'AUTH/RESET_PASSWORD_FAILURE',
  CLEAR_AUTH_ERROR: 'AUTH/CLEAR_AUTH_ERROR'
};

// Action Creators
export const loginRequest = (credentials) => ({
  type: AUTH_ACTIONS.LOGIN_REQUEST,
  payload: credentials
});

export const loginSuccess = (data) => ({
  type: AUTH_ACTIONS.LOGIN_SUCCESS,
  payload: data
});

export const loginFailure = (error) => ({
  type: AUTH_ACTIONS.LOGIN_FAILURE,
  payload: { error }
});

export const logout = () => ({
  type: AUTH_ACTIONS.LOGOUT
});

export const refreshTokenRequest = () => ({
  type: AUTH_ACTIONS.REFRESH_TOKEN_REQUEST
});

export const refreshTokenSuccess = (token) => ({
  type: AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS,
  payload: { token }
});

export const refreshTokenFailure = (error) => ({
  type: AUTH_ACTIONS.REFRESH_TOKEN_FAILURE,
  payload: { error }
});

export const updateUser = (userData) => ({
  type: AUTH_ACTIONS.UPDATE_USER,
  payload: userData
});

export const verifyEmailRequest = (token) => ({
  type: AUTH_ACTIONS.VERIFY_EMAIL_REQUEST,
  payload: { token }
});

export const verifyEmailSuccess = () => ({
  type: AUTH_ACTIONS.VERIFY_EMAIL_SUCCESS
});

export const verifyEmailFailure = (error) => ({
  type: AUTH_ACTIONS.VERIFY_EMAIL_FAILURE,
  payload: { error }
});

export const resetPasswordRequest = (email) => ({
  type: AUTH_ACTIONS.RESET_PASSWORD_REQUEST,
  payload: { email }
});

export const resetPasswordSuccess = () => ({
  type: AUTH_ACTIONS.RESET_PASSWORD_SUCCESS
});

export const resetPasswordFailure = (error) => ({
  type: AUTH_ACTIONS.RESET_PASSWORD_FAILURE,
  payload: { error }
});

export const clearAuthError = () => ({
  type: AUTH_ACTIONS.CLEAR_AUTH_ERROR
});

// Async Action Creators (Thunks)
export const login = (credentials) => async (dispatch) => {
  dispatch(loginRequest(credentials));
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store tokens in localStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('refresh_token', data.refreshToken);
    
    dispatch(loginSuccess(data));
    return data;
  } catch (error) {
    dispatch(loginFailure(error.message));
    throw error;
  }
};

export const logoutUser = () => async (dispatch, getState) => {
  const { auth } = getState();
  
  try {
    // Call logout endpoint
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear tokens from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    // Dispatch logout action
    dispatch(logout());
  }
};

export const refreshToken = () => async (dispatch, getState) => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    dispatch(refreshTokenFailure('No refresh token available'));
    return;
  }

  dispatch(refreshTokenRequest());
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Update token in localStorage
    localStorage.setItem('auth_token', data.token);
    
    dispatch(refreshTokenSuccess(data.token));
    return data.token;
  } catch (error) {
    dispatch(refreshTokenFailure(error.message));
    dispatch(logout());
    throw error;
  }
};

export const verifyEmail = (token) => async (dispatch) => {
  dispatch(verifyEmailRequest(token));
  
  try {
    const response = await fetch(`/api/auth/verify/${token}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Email verification failed');
    }

    dispatch(verifyEmailSuccess());
    return true;
  } catch (error) {
    dispatch(verifyEmailFailure(error.message));
    throw error;
  }
};

export const requestPasswordReset = (email) => async (dispatch) => {
  dispatch(resetPasswordRequest(email));
  
  try {
    const response = await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Password reset request failed');
    }

    dispatch(resetPasswordSuccess());
    return true;
  } catch (error) {
    dispatch(resetPasswordFailure(error.message));
    throw error;
  }
};