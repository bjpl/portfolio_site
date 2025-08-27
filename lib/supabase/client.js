import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common database operations
export const db = {
  // Profile operations
  profiles: {
    async get(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async update(userId, updates) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  },
  
  // Blog post operations
  blogPosts: {
    async getAll({ status = 'published', limit = 10, offset = 0 } = {}) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, profiles!user_id(username, full_name, avatar_url)')
        .eq('status', status)
        .eq('visibility', 'public')
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    },
    
    async getBySlug(slug) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, profiles!user_id(username, full_name, avatar_url)')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async create(post) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated to create posts');
      
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({ ...post, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async update(id, updates) {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async delete(id) {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  },
  
  // Project operations
  projects: {
    async getAll({ status = 'published', featured = null, limit = 10, offset = 0 } = {}) {
      let query = supabase
        .from('projects')
        .select('*, profiles!user_id(username, full_name, avatar_url)')
        .eq('status', status)
        .eq('visibility', 'public')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (featured !== null) {
        query = query.eq('featured', featured);
      }
      
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    },
    
    async getBySlug(slug) {
      const { data, error } = await supabase
        .from('projects')
        .select('*, profiles!user_id(username, full_name, avatar_url)')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async create(project) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated to create projects');
      
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...project, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async update(id, updates) {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async delete(id) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  }
};