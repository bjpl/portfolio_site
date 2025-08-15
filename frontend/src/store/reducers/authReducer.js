import { AUTH_ACTIONS } from '../actions/authActions';

const authReducer = (state = {}, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        user: action.payload.user,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
        loading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_REQUEST:
      return {
        ...state,
        loading: true
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        loading: false
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
        loading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload
        }
      };

    case AUTH_ACTIONS.VERIFY_EMAIL_SUCCESS:
      return {
        ...state,
        user: {
          ...state.user,
          emailVerified: true
        }
      };

    case AUTH_ACTIONS.RESET_PASSWORD_REQUEST:
      return {
        ...state,
        resetPasswordLoading: true,
        resetPasswordError: null
      };

    case AUTH_ACTIONS.RESET_PASSWORD_SUCCESS:
      return {
        ...state,
        resetPasswordLoading: false,
        resetPasswordSuccess: true
      };

    case AUTH_ACTIONS.RESET_PASSWORD_FAILURE:
      return {
        ...state,
        resetPasswordLoading: false,
        resetPasswordError: action.payload.error
      };

    case AUTH_ACTIONS.CLEAR_AUTH_ERROR:
      return {
        ...state,
        error: null,
        resetPasswordError: null
      };

    default:
      return state;
  }
};

export default authReducer;