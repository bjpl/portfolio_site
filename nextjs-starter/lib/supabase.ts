import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're using Auth0 for authentication
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

// Admin client for server-side operations
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
)

// Helper to sync Auth0 user with Supabase
export async function syncUserWithSupabase(auth0User: any) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      auth0_id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name,
      picture: auth0User.picture,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error syncing user with Supabase:', error)
    return null
  }

  return data
}

// Content operations
export const contentService = {
  async getPublicContent() {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    return { data, error }
  },

  async getAllContent() {
    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  },

  async createContent(content: any) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .insert(content)
      .select()
      .single()

    return { data, error }
  },

  async updateContent(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  async deleteContent(id: string) {
    const { error } = await supabaseAdmin
      .from('content')
      .delete()
      .eq('id', id)

    return { error }
  }
}