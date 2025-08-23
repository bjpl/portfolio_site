/**
 * TypeScript type definitions for Supabase integration
 * Auto-generated and manually maintained type definitions
 */

import { SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';

// Database schema types
export interface Database {
  public: {
    Tables: {
      blog_posts: {
        Row: BlogPost;
        Insert: BlogPostInsert;
        Update: BlogPostUpdate;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      contact_messages: {
        Row: ContactMessage;
        Insert: ContactMessageInsert;
        Update: ContactMessageUpdate;
      };
      users: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      post_status: 'draft' | 'published' | 'archived';
      project_status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
      message_status: 'new' | 'read' | 'replied' | 'archived';
    };
  };
}

// Table row types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: Database['public']['Enums']['post_status'];
  tags: string[];
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  like_count: number;
  meta_description?: string;
  meta_keywords?: string;
}

export interface BlogPostInsert {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status?: Database['public']['Enums']['post_status'];
  tags?: string[];
  author_id: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  like_count?: number;
  meta_description?: string;
  meta_keywords?: string;
}

export interface BlogPostUpdate {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  status?: Database['public']['Enums']['post_status'];
  tags?: string[];
  published_at?: string;
  updated_at?: string;
  view_count?: number;
  like_count?: number;
  meta_description?: string;
  meta_keywords?: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  long_description?: string;
  featured_image?: string;
  gallery: string[];
  technologies: string[];
  github_url?: string;
  demo_url?: string;
  status: Database['public']['Enums']['project_status'];
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  featured: boolean;
  view_count: number;
  like_count: number;
}

export interface ProjectInsert {
  id?: string;
  title: string;
  slug: string;
  description: string;
  long_description?: string;
  featured_image?: string;
  gallery?: string[];
  technologies: string[];
  github_url?: string;
  demo_url?: string;
  status?: Database['public']['Enums']['project_status'];
  start_date: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  featured?: boolean;
  view_count?: number;
  like_count?: number;
}

export interface ProjectUpdate {
  title?: string;
  slug?: string;
  description?: string;
  long_description?: string;
  featured_image?: string;
  gallery?: string[];
  technologies?: string[];
  github_url?: string;
  demo_url?: string;
  status?: Database['public']['Enums']['project_status'];
  start_date?: string;
  end_date?: string;
  updated_at?: string;
  featured?: boolean;
  view_count?: number;
  like_count?: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  company?: string;
  status: Database['public']['Enums']['message_status'];
  created_at: string;
  updated_at: string;
  replied_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ContactMessageInsert {
  id?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  company?: string;
  status?: Database['public']['Enums']['message_status'];
  created_at?: string;
  updated_at?: string;
  replied_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ContactMessageUpdate {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  phone?: string;
  company?: string;
  status?: Database['public']['Enums']['message_status'];
  updated_at?: string;
  replied_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  bio?: string;
  location?: string;
  social_links: Record<string, string>;
  role: 'admin' | 'editor' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserProfileInsert {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  bio?: string;
  location?: string;
  social_links?: Record<string, string>;
  role?: 'admin' | 'editor' | 'user';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface UserProfileUpdate {
  email?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  bio?: string;
  location?: string;
  social_links?: Record<string, string>;
  role?: 'admin' | 'editor' | 'user';
  is_active?: boolean;
  updated_at?: string;
  last_login?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

export interface BulkResponse<T = any> extends ApiResponse {
  data: {
    successful: T[];
    failed: any[];
    total: number;
    successCount: number;
    failureCount: number;
  };
}

// Filter types
export interface FilterOperator {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
  value: any;
}

export interface QueryOptions {
  filters?: Record<string, any | FilterOperator>;
  search?: string;
  searchColumns?: string[];
  page?: number;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  select?: string;
}

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
}

// Supabase client types
export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export interface AuthMethods {
  signUp: (email: string, password: string, options?: any) => Promise<ApiResponse>;
  signIn: (email: string, password: string) => Promise<ApiResponse>;
  signInWithProvider: (provider: string) => Promise<ApiResponse>;
  signOut: () => Promise<ApiResponse>;
  resetPassword: (email: string) => Promise<ApiResponse>;
  updatePassword: (newPassword: string) => Promise<ApiResponse>;
  updateUser: (updates: any) => Promise<ApiResponse>;
  getCurrentUser: () => User | null;
  isAuthenticated: () => boolean;
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => () => void;
}

// Real-time subscription types
export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface RealtimeOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: any) => void;
}

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
  schema: string;
  table: string;
  commit_timestamp: string;
  errors: any[] | null;
}

// Storage types
export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

export interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
  duplex?: string;
}

export interface StorageMethods {
  uploadFile: (filePath: string, file: File | Blob, options?: UploadOptions) => Promise<ApiResponse>;
  deleteFile: (filePaths: string | string[]) => Promise<ApiResponse>;
  getPublicUrl: (filePath: string) => string;
  createSignedUrl?: (filePath: string, expiresIn?: number) => Promise<ApiResponse>;
  listFiles?: (folderPath?: string, options?: any) => Promise<ApiResponse<StorageFile[]>>;
}

// Utility types
export type TableName = keyof Database['public']['Tables'];
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// Function signatures for the main classes
export interface DatabaseOperationsInterface<T = any> {
  getAll: (filters?: Record<string, any>, options?: QueryOptions) => Promise<ApiResponse<T[]>>;
  getById: (id: string, options?: { select?: string }) => Promise<ApiResponse<T>>;
  create: (data: any) => Promise<ApiResponse<T>>;
  update: (id: string, data: any) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<{ id: string }>>;
  batchInsert: (records: any[]) => Promise<ApiResponse<T[]>>;
}

export interface CrudHelperInterface<T = any> extends DatabaseOperationsInterface<T> {
  bulkCreate: (records: any[], options?: any) => Promise<BulkResponse<T>>;
  bulkUpdate: (updates: any[], options?: any) => Promise<BulkResponse<T>>;
  bulkDelete: (ids: string[], options?: any) => Promise<BulkResponse<T>>;
}

// Export the main client type
export type TypedSupabaseClient = SupabaseClient<Database>;

// Default export for convenience
export default Database;