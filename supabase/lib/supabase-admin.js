/**
 * Supabase Admin Client
 * Server-side client with service role key for admin operations
 * This file should only be used in server-side environments (Netlify Functions)
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables - support both naming conventions
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
}

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Database Operations Wrapper
 */
export class DatabaseOperations {
  constructor(tableName) {
    this.tableName = tableName;
    this.client = supabaseAdmin;
  }

  /**
   * Get all records with optional filters
   */
  async getAll(filters = {}, options = {}) {
    try {
      let query = this.client.from(this.tableName).select(options.select || '*');
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply sorting
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`Error fetching ${this.tableName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Get single record by ID
   */
  async getById(id, options = {}) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(options.select || '*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`Error fetching ${this.tableName} by ID:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Create new record
   */
  async create(data) {
    try {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Update record by ID
   */
  async update(id, data) {
    try {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id) {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: { id }, error: null };
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Batch operations
   */
  async batchInsert(records) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert(records)
        .select();

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`Error batch inserting ${this.tableName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }
}

/**
 * Storage Management Functions
 */
export class StorageOperations {
  constructor(bucketName) {
    this.bucketName = bucketName;
    this.client = supabaseAdmin;
  }

  /**
   * Upload file to storage
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
      console.error(`Error uploading file to ${this.bucketName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Delete file from storage
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
      console.error(`Error deleting file from ${this.bucketName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(filePath) {
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Create signed URL for private files
   */
  async createSignedUrl(filePath, expiresIn = 60) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`Error creating signed URL for ${this.bucketName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * List files in bucket
   */
  async listFiles(folderPath = '', options = {}) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(folderPath, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy || { column: 'name', order: 'asc' }
        });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`Error listing files in ${this.bucketName}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }
}

/**
 * Auth Admin Functions
 */
export class AuthOperations {
  constructor() {
    this.client = supabaseAdmin;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const { data, error } = await this.client.auth.admin.getUserById(userId);
      
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(page = 1, perPage = 50) {
    try {
      const { data, error } = await this.client.auth.admin.listUsers({
        page,
        perPage
      });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error listing users:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Create user
   */
  async createUser(userData) {
    try {
      const { data, error } = await this.client.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: userData.email_confirm || true,
        user_metadata: userData.user_metadata || {}
      });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updates) {
    try {
      const { data, error } = await this.client.auth.admin.updateUserById(userId, updates);

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const { data, error } = await this.client.auth.admin.deleteUser(userId);

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, data: null, error: error.message };
    }
  }
}

// Export convenience instances
export const createDatabaseOps = (tableName) => new DatabaseOperations(tableName);
export const createStorageOps = (bucketName) => new StorageOperations(bucketName);
export const authOps = new AuthOperations();

// Export commonly used database operations
export const blogOps = new DatabaseOperations('blog_posts');
export const projectOps = new DatabaseOperations('projects');
export const contactOps = new DatabaseOperations('contact_messages');

// Export commonly used storage operations
export const imagesStorage = new StorageOperations('images');
export const documentsStorage = new StorageOperations('documents');

export default supabaseAdmin;