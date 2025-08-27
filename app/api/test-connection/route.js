import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test database connection by counting tables
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('blog_posts')
      .select('count', { count: 'exact', head: true });
    
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('count', { count: 'exact', head: true });
    
    if (profilesError || postsError || projectsError) {
      throw new Error('Database query failed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables: {
        profiles: profiles,
        blog_posts: posts,
        projects: projects
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    }, { status: 500 });
  }
}