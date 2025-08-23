/**
 * Supabase Frontend Client
 * Client-side library for authentication, data fetching, and real-time subscriptions
 * Uses public anon key - safe for browser environments
 */

import { createClient } from '@supabase/supabase-js';

// Public environment variables (safe for client-side)
const supabaseUrl = window.ENV?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = window.ENV?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_')) {
  console.warn('Supabase client not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Public client for frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Authentication Methods
 */
export class SupabaseAuth {
  constructor() {
    this.client = supabase;
    this.currentUser = null;
    this.authListeners = [];
    this.initialized = false;
    
    this.init();
  }

  async init() {
    if (this.initialized) return;
    
    // Get initial session
    const { data: { session } } = await this.client.auth.getSession();
    this.currentUser = session?.user || null;

    // Listen for auth changes
    this.client.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
      this.notifyListeners(event, session);
    });

    this.initialized = true;
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password, options = {}) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: options.metadata || {}
        }
      });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider) {
    try {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('OAuth sign in error:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email) {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user metadata
   */
  async updateUser(updates) {
    try {
      const { data, error } = await this.client.auth.updateUser(updates);

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('User update error:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Add auth state listener
   */
  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all auth listeners
   */
  notifyListeners(event, session) {
    this.authListeners.forEach(callback => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }
}

/**
 * Data Fetching Utilities
 */
export class SupabaseData {
  constructor() {
    this.client = supabase;
  }

  /**
   * Fetch data with filters and pagination
   */
  async fetchData(table, options = {}) {
    try {
      let query = this.client.from(table).select(options.select || '*');

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply text search
      if (options.search && options.searchColumn) {
        query = query.textSearch(options.searchColumn, options.search);
      }

      // Apply sorting
      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.ascending !== false 
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(
          options.offset, 
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { success: true, data, count, error: null };
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      return { success: false, data: null, count: null, error: error.message };
    }
  }

  /**
   * Fetch single record
   */
  async fetchOne(table, id, options = {}) {
    try {
      const { data, error } = await this.client
        .from(table)
        .select(options.select || '*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`Error fetching single ${table}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Insert data
   */
  async insert(table, data) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select();

      if (error) throw error;
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Update data
   */
  async update(table, id, data) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Delete data
   */
  async delete(table, id) {
    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Real-time Subscriptions
 */
export class SupabaseRealtime {
  constructor() {
    this.client = supabase;
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to table changes
   */
  subscribe(table, options = {}) {
    const subscriptionKey = `${table}_${Date.now()}`;
    
    let subscription = this.client
      .channel(`public:${table}`)
      .on('postgres_changes', {
        event: options.event || '*',
        schema: 'public',
        table: table,
        filter: options.filter
      }, (payload) => {
        if (options.callback) {
          options.callback(payload);
        }
      })
      .subscribe();

    this.subscriptions.set(subscriptionKey, subscription);
    
    return {
      unsubscribe: () => this.unsubscribe(subscriptionKey)
    };
  }

  /**
   * Unsubscribe from changes
   */
  unsubscribe(subscriptionKey) {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      this.client.removeChannel(subscription);
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all
   */
  unsubscribeAll() {
    this.subscriptions.forEach((subscription, key) => {
      this.client.removeChannel(subscription);
    });
    this.subscriptions.clear();
  }
}

/**
 * Storage Operations for Frontend
 */
export class SupabaseStorage {
  constructor(bucketName) {
    this.bucketName = bucketName;
    this.client = supabase;
  }

  /**
   * Upload file
   */
  async uploadFile(filePath, file, options = {}) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: options.upsert || false,
          ...options
        });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Get public URL
   */
  getPublicUrl(filePath) {
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Delete file
   */
  async deleteFile(filePaths) {
    try {
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .remove(paths);

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Delete error:', error);
      return { success: false, data: null, error: error.message };
    }
  }
}

// Export instances
export const auth = new SupabaseAuth();
export const data = new SupabaseData();
export const realtime = new SupabaseRealtime();

// Export storage helpers
export const createStorage = (bucketName) => new SupabaseStorage(bucketName);
export const imagesStorage = new SupabaseStorage('images');

// Initialize auth on load
if (typeof window !== 'undefined') {
  auth.init();
}

export default supabase;