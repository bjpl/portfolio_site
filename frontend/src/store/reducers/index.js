import { combineReducers } from '../utils';
import authReducer from './authReducer';
import userReducer from './userReducer';
import portfolioReducer from './portfolioReducer';
import contentReducer from './contentReducer';
import uiReducer from './uiReducer';
import notificationReducer from './notificationReducer';
import preferencesReducer from './preferencesReducer';

// Initial state for the entire application
export const initialState = {
  auth: {
    isAuthenticated: false,
    token: null,
    refreshToken: null,
    user: null,
    loading: false,
    error: null
  },
  user: {
    profile: null,
    permissions: [],
    settings: {},
    loading: false,
    error: null
  },
  portfolio: {
    projects: [],
    skills: [],
    experiences: [],
    testimonials: [],
    selectedProject: null,
    filters: {
      category: 'all',
      technology: 'all',
      sortBy: 'date'
    },
    loading: false,
    error: null
  },
  content: {
    posts: [],
    categories: [],
    tags: [],
    selectedPost: null,
    drafts: [],
    searchQuery: '',
    searchResults: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0
    },
    loading: false,
    error: null
  },
  ui: {
    theme: 'light',
    sidebarOpen: false,
    modalOpen: false,
    modalContent: null,
    breadcrumbs: [],
    activeSection: 'home',
    scrollPosition: 0,
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  },
  notifications: {
    items: [],
    unreadCount: 0
  },
  preferences: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    animations: true,
    reducedMotion: false,
    autoSave: true,
    notifications: {
      email: true,
      push: false,
      sound: true
    }
  }
};

// Combine all reducers
export const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  portfolio: portfolioReducer,
  content: contentReducer,
  ui: uiReducer,
  notifications: notificationReducer,
  preferences: preferencesReducer
});