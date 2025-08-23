// Supabase Database Types
// Auto-generated from Supabase CLI: supabase gen types typescript

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json
          page_path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          comment_count: number
          content: string
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          images: Json
          language: string
          like_count: number
          published_at: string | null
          reading_time: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          title: string
          translations: Json
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          comment_count?: number
          content: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          images?: Json
          language?: string
          like_count?: number
          published_at?: string | null
          reading_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title: string
          translations?: Json
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          category?: string | null
          comment_count?: number
          content?: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          images?: Json
          language?: string
          like_count?: number
          published_at?: string | null
          reading_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title?: string
          translations?: Json
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          author_email: string
          author_name: string
          author_website: string | null
          content: string
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json
          parent_id: string | null
          post_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          author_email: string
          author_name: string
          author_website?: string | null
          content: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          parent_id?: string | null
          post_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          author_email?: string
          author_name?: string
          author_website?: string | null
          content?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          parent_id?: string | null
          post_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          message: string
          metadata: Json
          name: string
          replied_at: string | null
          reply_content: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          message: string
          metadata?: Json
          name: string
          replied_at?: string | null
          reply_content?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          message?: string
          metadata?: Json
          name?: string
          replied_at?: string | null
          reply_content?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          duration: number | null
          file_path: string
          file_size: number
          filename: string
          height: number | null
          id: string
          is_public: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json
          mime_type: string
          original_name: string
          storage_provider: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          duration?: number | null
          file_path: string
          file_size: number
          filename: string
          height?: number | null
          id?: string
          is_public?: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          mime_type: string
          original_name: string
          storage_provider?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          duration?: number | null
          file_path?: string
          file_size?: number
          filename?: string
          height?: number | null
          id?: string
          is_public?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          mime_type?: string
          original_name?: string
          storage_provider?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      page_views_summary: {
        Row: {
          created_at: string
          id: string
          page_path: string
          unique_visitors: number
          updated_at: string
          view_count: number
          view_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          unique_visitors?: number
          updated_at?: string
          view_count?: number
          view_date: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          unique_visitors?: number
          updated_at?: string
          view_count?: number
          view_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          location: string | null
          metadata: Json
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          metadata?: Json
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          metadata?: Json
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      project_skills: {
        Row: {
          created_at: string
          importance_level: number
          proficiency_used: string | null
          project_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          importance_level?: number
          proficiency_used?: string | null
          project_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          importance_level?: number
          proficiency_used?: string | null
          project_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_skills_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skills_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      project_tags: {
        Row: {
          created_at: string
          project_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          category: string | null
          created_at: string
          demo_url: string | null
          description: string | null
          documentation_url: string | null
          end_date: string | null
          featured: boolean
          github_url: string | null
          highlights: string[]
          id: string
          images: Json
          long_description: string | null
          metrics: Json
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          technologies: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          documentation_url?: string | null
          end_date?: string | null
          featured?: boolean
          github_url?: string | null
          highlights?: string[]
          id?: string
          images?: Json
          long_description?: string | null
          metrics?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          technologies?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          documentation_url?: string | null
          end_date?: string | null
          featured?: boolean
          github_url?: string | null
          highlights?: string[]
          id?: string
          images?: Json
          long_description?: string | null
          metrics?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          technologies?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          color_hex: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_featured: boolean
          name: string
          proficiency_level: string | null
          sort_order: number
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          category: string
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_featured?: boolean
          name: string
          proficiency_level?: string | null
          sort_order?: number
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          category?: string
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_featured?: boolean
          name?: string
          proficiency_level?: string | null
          sort_order?: number
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          data_type: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          color_hex: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string | null
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string | null
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_view_count: {
        Args: {
          table_name: string
          record_id: string
        }
        Returns: undefined
      }
      search_content: {
        Args: {
          query: string
        }
        Returns: {
          content_type: string
          id: string
          title: string
          excerpt: string
          url_slug: string
          relevance: number
        }[]
      }
      update_tag_usage_count: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      upsert_page_view_summary: {
        Args: {
          page_path: string
        }
        Returns: undefined
      }
    }
    Enums: {
      content_status: "draft" | "published" | "archived"
      media_type: "image" | "video" | "audio" | "document" | "other"
      message_status: "unread" | "read" | "archived" | "spam"
      project_status: "planning" | "in_progress" | "completed" | "on_hold" | "cancelled"
      user_role: "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types
export type Profile = Tables<'profiles'>
export type Project = Tables<'projects'>
export type BlogPost = Tables<'blog_posts'>
export type Skill = Tables<'skills'>
export type Tag = Tables<'tags'>
export type ContactMessage = Tables<'contact_messages'>
export type MediaAsset = Tables<'media_assets'>
export type Comment = Tables<'comments'>
export type AnalyticsEvent = Tables<'analytics_events'>

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert']
export type SkillInsert = Database['public']['Tables']['skills']['Insert']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type ContactMessageInsert = Database['public']['Tables']['contact_messages']['Insert']
export type MediaAssetInsert = Database['public']['Tables']['media_assets']['Insert']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update']
export type SkillUpdate = Database['public']['Tables']['skills']['Update']
export type TagUpdate = Database['public']['Tables']['tags']['Update']
export type ContactMessageUpdate = Database['public']['Tables']['contact_messages']['Update']
export type MediaAssetUpdate = Database['public']['Tables']['media_assets']['Update']
export type CommentUpdate = Database['public']['Tables']['comments']['Update']

// Enum types
export type UserRole = Enums<'user_role'>
export type ContentStatus = Enums<'content_status'>
export type ProjectStatus = Enums<'project_status'>
export type MessageStatus = Enums<'message_status'>
export type MediaType = Enums<'media_type'>

// Function return types
export type SearchResult = Database['public']['Functions']['search_content']['Returns'][0]