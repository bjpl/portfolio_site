// Core admin types
export type ContentStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type ContentType = 'page' | 'post' | 'project' | 'media';
export type MediaType = 'image' | 'video' | 'audio' | 'document';
export type UserRole = 'admin' | 'editor' | 'viewer';

// Content Management Types
export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  type: ContentType;
  status: ContentStatus;
  author_id: string;
  author?: UserProfile;
  featured_image?: string;
  tags?: string[];
  categories?: string[];
  seo_metadata?: SEOMetadata;
  publish_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  og_image?: string;
  canonical_url?: string;
  robots?: string;
  structured_data?: Record<string, any>;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  title: string;
  content: string;
  status: ContentStatus;
  created_by: string;
  created_at: string;
  comment?: string;
}

// Media Management Types
export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  size: number;
  mime_type: string;
  url: string;
  path: string;
  folder_id?: string | null;
  folder?: MediaFolder;
  alt_text?: string;
  description?: string;
  uploaded_by: string;
  uploader?: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parent_id?: string | null;
  parent?: MediaFolder;
  created_by: string;
  creator?: UserProfile;
  created_at: string;
  updated_at: string;
}

// User Management Types
export interface UserProfile {
  id: string;
  user_id: string; // Auth0 user ID
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  permissions?: string[];
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Admin Dashboard Types
export interface AdminStats {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  mediaFiles: number;
  pageViews: number;
  activeUsers: number;
  storageUsed: number;
  storageLimit: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user?: UserProfile;
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
  resource_type: 'content' | 'media' | 'user' | 'settings';
  resource_id: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Form and UI Types
export interface ContentFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  type: ContentType;
  status: ContentStatus;
  featured_image?: string;
  tags: string[];
  categories: string[];
  seo_metadata: SEOMetadata;
  publish_date?: string | null;
}

export interface MediaUploadOptions {
  folder?: string;
  allowedTypes?: MediaType[];
  maxSize?: number;
  onProgress?: (progress: number) => void;
}

export interface SearchFilters {
  query?: string;
  type?: ContentType | 'all';
  status?: ContentStatus | 'all';
  author?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  categories?: string[];
}

// API Response Types
export interface APIResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Supabase Realtime Types
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  errors?: string[];
}

// Editor Configuration Types
export interface EditorConfig {
  autosave: boolean;
  autosaveInterval: number;
  spellcheck: boolean;
  toolbar: string[];
  plugins: string[];
  theme: 'light' | 'dark';
}

export interface WYSIWYGOptions {
  placeholder?: string;
  maxLength?: number;
  toolbar?: 'minimal' | 'basic' | 'full';
  uploadHandler?: (file: File) => Promise<string>;
  mentionHandler?: (query: string) => Promise<any[]>;
}

// Permission and Security Types
export interface Permission {
  action: 'create' | 'read' | 'update' | 'delete';
  resource: 'content' | 'media' | 'users' | 'settings';
  conditions?: Record<string, any>;
}

export interface AccessControl {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

// Workflow and Publishing Types
export interface PublishingWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  auto_approve?: boolean;
  notify_users?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'action';
  required: boolean;
  assignee?: string;
  conditions?: Record<string, any>;
}

export interface ContentApproval {
  id: string;
  content_id: string;
  workflow_id: string;
  current_step: number;
  status: 'pending' | 'approved' | 'rejected';
  approver?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

// Analytics and Reporting Types
export interface ContentAnalytics {
  content_id: string;
  views: number;
  unique_views: number;
  engagement_time: number;
  bounce_rate: number;
  social_shares: number;
  comments: number;
  date: string;
}

export interface AdminReport {
  id: string;
  name: string;
  type: 'content' | 'media' | 'users' | 'analytics';
  parameters: Record<string, any>;
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  created_by: string;
  created_at: string;
}

// Import/Export Types
export interface ImportOptions {
  format: 'json' | 'csv' | 'markdown' | 'wordpress' | 'contentful';
  preserveIds: boolean;
  updateExisting: boolean;
  createMissing: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'markdown' | 'zip';
  includeMedia: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: SearchFilters;
}

// Theme and Customization Types
export interface AdminTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
  };
  spacing: Record<string, string>;
  borderRadius: string;
}

// Webhook and Integration Types
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  headers?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'plugin';
  config: Record<string, any>;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Error and Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface AdminError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

// Backup and Recovery Types
export interface BackupRecord {
  id: string;
  type: 'full' | 'incremental';
  size: number;
  file_path: string;
  created_by: string;
  created_at: string;
  restored_at?: string;
}

export default {
  ContentItem,
  MediaFile,
  UserProfile,
  AdminStats,
  ContentFormData,
  APIResponse,
  Permission,
  AccessControl,
};