import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    
    // Remove 'functions/v1/portfolio-api' from segments
    const apiSegments = segments.slice(3)
    const resource = apiSegments[0]
    const id = apiSegments[1]

    switch (resource) {
      case 'projects':
        return await handleProjects(req, supabase, id, url.searchParams)
      
      case 'blog':
        return await handleBlog(req, supabase, id, url.searchParams)
      
      case 'skills':
        return await handleSkills(req, supabase, id, url.searchParams)
      
      case 'contact':
        return await handleContact(req, supabase)
      
      case 'search':
        return await handleSearch(req, supabase, url.searchParams)
      
      case 'analytics':
        return await handleAnalytics(req, supabase)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Resource not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }
  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleProjects(req: Request, supabase: any, id?: string, searchParams?: URLSearchParams) {
  if (req.method === 'GET') {
    let query = supabase
      .from('projects')
      .select(`
        *,
        project_skills!inner(
          skills(*)
        ),
        project_tags!inner(
          tags(*)
        )
      `)

    if (id) {
      query = query.eq('id', id).single()
      
      // Increment view count for individual project
      await supabase.rpc('increment_view_count', {
        table_name: 'projects',
        record_id: id
      })
    } else {
      // Apply filters
      const category = searchParams?.get('category')
      const status = searchParams?.get('status') || 'completed,in_progress'
      const featured = searchParams?.get('featured')
      const limit = parseInt(searchParams?.get('limit') || '10')
      const offset = parseInt(searchParams?.get('offset') || '0')

      if (category) {
        query = query.eq('category', category)
      }
      
      if (status) {
        const statuses = status.split(',')
        query = query.in('status', statuses)
      }
      
      if (featured === 'true') {
        query = query.eq('featured', true)
      }

      query = query
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    }

    const { data, error } = await query

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  )
}

async function handleBlog(req: Request, supabase: any, id?: string, searchParams?: URLSearchParams) {
  if (req.method === 'GET') {
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        profiles!inner(username, full_name, avatar_url),
        blog_post_tags!inner(
          tags(*)
        )
      `)

    if (id) {
      // Try to find by ID first, then by slug
      const { data: byId } = await query.eq('id', id).eq('status', 'published').single()
      
      if (!byId) {
        const { data: bySlug } = await query.eq('slug', id).eq('status', 'published').single()
        
        if (bySlug) {
          // Increment view count
          await supabase.rpc('increment_view_count', {
            table_name: 'blog_posts',
            record_id: bySlug.id
          })
          
          return new Response(
            JSON.stringify(bySlug),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          )
        } else {
          return new Response(
            JSON.stringify({ error: 'Post not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          )
        }
      } else {
        await supabase.rpc('increment_view_count', {
          table_name: 'blog_posts',
          record_id: byId.id
        })
        
        return new Response(
          JSON.stringify(byId),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }
    } else {
      // List posts with filters
      const category = searchParams?.get('category')
      const featured = searchParams?.get('featured')
      const tag = searchParams?.get('tag')
      const limit = parseInt(searchParams?.get('limit') || '10')
      const offset = parseInt(searchParams?.get('offset') || '0')

      query = query.eq('status', 'published')

      if (category) {
        query = query.eq('category', category)
      }
      
      if (featured === 'true') {
        query = query.eq('featured', true)
      }

      if (tag) {
        query = query.contains('tags', [tag])
      }

      query = query
        .order('featured', { ascending: false })
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  )
}

async function handleSkills(req: Request, supabase: any, id?: string, searchParams?: URLSearchParams) {
  if (req.method === 'GET') {
    let query = supabase.from('skills').select('*')

    if (id) {
      query = query.eq('id', id).single()
    } else {
      const category = searchParams?.get('category')
      const featured = searchParams?.get('featured')

      if (category) {
        query = query.eq('category', category)
      }
      
      if (featured === 'true') {
        query = query.eq('is_featured', true)
      }

      query = query
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  )
}

async function handleContact(req: Request, supabase: any) {
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const { name, email, subject, message } = body

      // Validate required fields
      if (!name || !email || !message) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      // Get client info
      const ip = req.headers.get('cf-connecting-ip') || 
                req.headers.get('x-forwarded-for') || 
                '127.0.0.1'
      const userAgent = req.headers.get('user-agent') || ''

      // Insert contact message
      const { data, error } = await supabase
        .from('contact_messages')
        .insert({
          name: name.trim(),
          email: email.trim(),
          subject: subject?.trim() || null,
          message: message.trim(),
          ip_address: ip,
          user_agent: userAgent,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'portfolio_contact_form'
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Contact form error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to submit message' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      // Log analytics event
      await supabase
        .from('analytics_events')
        .insert({
          event_type: 'contact_form_submit',
          page_path: '/contact',
          ip_address: ip,
          user_agent: userAgent,
          metadata: {
            success: true,
            message_id: data.id
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Thank you for your message! We\'ll get back to you soon.',
          id: data.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    } catch (error) {
      console.error('Contact form processing error:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  )
}

async function handleSearch(req: Request, supabase: any, searchParams: URLSearchParams) {
  if (req.method === 'GET') {
    const query = searchParams.get('q')
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    const { data, error } = await supabase.rpc('search_content', {
      query: query.trim()
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    return new Response(
      JSON.stringify({
        query,
        results: data || [],
        total: data?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  )
}

async function handleAnalytics(req: Request, supabase: any) {
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const { event_type, page_path, referrer, metadata } = body

      if (!event_type) {
        return new Response(
          JSON.stringify({ error: 'Missing event_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      const ip = req.headers.get('cf-connecting-ip') || 
                req.headers.get('x-forwarded-for') || 
                '127.0.0.1'
      const userAgent = req.headers.get('user-agent') || ''

      // Insert analytics event
      await supabase
        .from('analytics_events')
        .insert({
          event_type,
          page_path,
          referrer,
          ip_address: ip,
          user_agent: userAgent,
          metadata: metadata || {}
        })

      // Update page view summary if it's a page view
      if (event_type === 'page_view' && page_path) {
        await supabase.rpc('upsert_page_view_summary', {
          page_path
        })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    } catch (error) {
      console.error('Analytics error:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  )
}