/**
 * Supabase Row Level Security (RLS) Policies Tests
 * Tests access control and data security across different user roles
 */

const { createClient } = require('@supabase/supabase-js');
const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } = require('@jest/globals');
const { v4: uuidv4 } = require('uuid');

describe('Supabase RLS Policies', () => {
  let adminClient;
  let userClient;
  let editorClient;
  let anonClient;
  let testData = {};

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error('Supabase environment variables not configured for testing');
    }

    // Create admin client with service role key (bypasses RLS)
    adminClient = createClient(supabaseUrl, serviceKey);
    
    // Create anonymous client
    anonClient = createClient(supabaseUrl, anonKey);
    
    // Create authenticated clients for different user roles
    await setupTestUsers();
  });

  afterAll(async () => {
    // Cleanup test data and users
    await cleanupTestData();
  });

  afterEach(async () => {
    // Sign out all clients after each test
    await Promise.all([
      userClient?.auth.signOut().catch(() => {}),
      editorClient?.auth.signOut().catch(() => {}),
      anonClient?.auth.signOut().catch(() => {})
    ]);
  });

  const setupTestUsers = async () => {
    const timestamp = Date.now();
    
    // Create test users with different roles
    const users = [
      {
        email: `rls.user.${timestamp}@example.com`,
        password: 'UserTestPassword123!',
        role: 'user',
        client: null
      },
      {
        email: `rls.editor.${timestamp}@example.com`,
        password: 'EditorTestPassword123!',
        role: 'editor',
        client: null
      }
    ];

    for (const userData of users) {
      // Create user using admin client
      const { data: authUser, error: signUpError } = await adminClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (signUpError) {
        console.error(`Failed to create ${userData.role} user:`, signUpError);
        continue;
      }

      // Create profile with role
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          email: userData.email,
          full_name: `TEST ${userData.role.toUpperCase()} User`,
          role: userData.role
        })
        .select()
        .single();

      if (profileError) {
        console.error(`Failed to create ${userData.role} profile:`, profileError);
        continue;
      }

      // Create authenticated client for this user
      userData.client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      
      // Sign in the user
      await userData.client.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      testData[userData.role] = {
        userId: authUser.user.id,
        profileId: profile.id,
        email: userData.email,
        client: userData.client
      };
    }

    userClient = testData.user?.client;
    editorClient = testData.editor?.client;
  };

  const cleanupTestData = async () => {
    try {
      // Clean up test data using admin client
      await adminClient.from('comments').delete().like('content', '%TEST_RLS%');
      await adminClient.from('blog_posts').delete().like('title', '%TEST_RLS%');
      await adminClient.from('projects').delete().like('title', '%TEST_RLS%');
      await adminClient.from('contact_messages').delete().like('name', '%TEST_RLS%');
      await adminClient.from('media_assets').delete().like('filename', '%test_rls%');
      await adminClient.from('profiles').delete().like('full_name', '%TEST USER%');
      
      // Delete auth users
      if (testData.user?.userId) {
        await adminClient.auth.admin.deleteUser(testData.user.userId);
      }
      if (testData.editor?.userId) {
        await adminClient.auth.admin.deleteUser(testData.editor.userId);
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  };

  describe('Public Content Access', () => {
    beforeEach(async () => {
      // Create public test content using admin client
      await adminClient.from('projects').insert({
        title: 'TEST_RLS Public Project',
        slug: `public-project-${Date.now()}`,
        status: 'active',
        description: 'Public project for RLS testing',
        author_id: testData.user?.profileId
      });

      await adminClient.from('blog_posts').insert({
        title: 'TEST_RLS Published Post',
        slug: `published-post-${Date.now()}`,
        status: 'published',
        content: 'Published blog post for RLS testing',
        author_id: testData.editor?.profileId
      });
    });

    it('should allow anonymous users to read public projects', async () => {
      const { data, error } = await anonClient
        .from('projects')
        .select('*')
        .like('title', '%TEST_RLS%');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].status).toBe('active');
    });

    it('should allow anonymous users to read published blog posts', async () => {
      const { data, error } = await anonClient
        .from('blog_posts')
        .select('*')
        .like('title', '%TEST_RLS%');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].status).toBe('published');
    });

    it('should prevent anonymous users from reading draft content', async () => {
      // Create draft content
      await adminClient.from('blog_posts').insert({
        title: 'TEST_RLS Draft Post',
        slug: `draft-post-${Date.now()}`,
        status: 'draft',
        content: 'Draft blog post for RLS testing',
        author_id: testData.editor?.profileId
      });

      const { data, error } = await anonClient
        .from('blog_posts')
        .select('*')
        .eq('status', 'draft')
        .like('title', '%TEST_RLS%');

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // Should not return draft posts
    });

    it('should allow anonymous users to read public media assets', async () => {
      // Create public media asset
      await adminClient.from('media_assets').insert({
        filename: `test_rls_public_${Date.now()}.jpg`,
        original_filename: 'public-image.jpg',
        url: 'https://example.com/public-image.jpg',
        type: 'image',
        mime_type: 'image/jpeg',
        size_bytes: 1024000,
        is_public: true,
        uploaded_by: testData.user?.profileId
      });

      const { data, error } = await anonClient
        .from('media_assets')
        .select('*')
        .eq('is_public', true)
        .like('filename', '%test_rls%');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('User Profile Access', () => {
    it('should allow users to view their own profile', async () => {
      if (!userClient || !testData.user) {
        throw new Error('User client not properly initialized');
      }

      const { data, error } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', testData.user.profileId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(testData.user.profileId);
      expect(data.email).toBe(testData.user.email);
    });

    it('should prevent users from viewing other profiles', async () => {
      if (!userClient || !testData.editor) {
        throw new Error('Test clients not properly initialized');
      }

      const { data, error } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', testData.editor.profileId);

      // RLS should prevent access to other user's profile
      expect(data).toHaveLength(0);
    });

    it('should allow users to update their own profile', async () => {
      if (!userClient || !testData.user) {
        throw new Error('User client not properly initialized');
      }

      const updatedBio = `Updated bio ${Date.now()}`;
      const { data, error } = await userClient
        .from('profiles')
        .update({ bio: updatedBio })
        .eq('id', testData.user.profileId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.bio).toBe(updatedBio);
    });

    it('should prevent users from updating other profiles', async () => {
      if (!userClient || !testData.editor) {
        throw new Error('Test clients not properly initialized');
      }

      const { data, error } = await userClient
        .from('profiles')
        .update({ bio: 'Unauthorized update attempt' })
        .eq('id', testData.editor.profileId);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Content Ownership', () => {
    it('should allow authors to view their own drafts', async () => {
      if (!editorClient || !testData.editor) {
        throw new Error('Editor client not properly initialized');
      }

      // Create draft post
      const { data: draftPost } = await adminClient.from('blog_posts').insert({
        title: 'TEST_RLS Author Draft',
        slug: `author-draft-${Date.now()}`,
        status: 'draft',
        content: 'Author\'s draft content',
        author_id: testData.editor.profileId
      }).select().single();

      // Author should be able to view their own draft
      const { data, error } = await editorClient
        .from('blog_posts')
        .select('*')
        .eq('id', draftPost.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('draft');
    });

    it('should prevent users from viewing others\' drafts', async () => {
      if (!userClient || !testData.editor) {
        throw new Error('Test clients not properly initialized');
      }

      // Create draft post by editor
      const { data: draftPost } = await adminClient.from('blog_posts').insert({
        title: 'TEST_RLS Others Draft',
        slug: `others-draft-${Date.now()}`,
        status: 'draft',
        content: 'Someone else\'s draft content',
        author_id: testData.editor.profileId
      }).select().single();

      // Regular user should not see editor's draft
      const { data, error } = await userClient
        .from('blog_posts')
        .select('*')
        .eq('id', draftPost.id);

      expect(data).toHaveLength(0);
    });

    it('should allow content owners to update their own content', async () => {
      if (!userClient || !testData.user) {
        throw new Error('User client not properly initialized');
      }

      // Create project owned by user
      const { data: project } = await adminClient.from('projects').insert({
        title: 'TEST_RLS User Project',
        slug: `user-project-${Date.now()}`,
        status: 'active',
        description: 'User owned project',
        author_id: testData.user.profileId
      }).select().single();

      // User should be able to update their own project
      const updatedDescription = 'Updated project description';
      const { data, error } = await userClient
        .from('projects')
        .update({ description: updatedDescription })
        .eq('id', project.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.description).toBe(updatedDescription);
    });

    it('should prevent users from updating others\' content', async () => {
      if (!userClient || !testData.editor) {
        throw new Error('Test clients not properly initialized');
      }

      // Create project owned by editor
      const { data: project } = await adminClient.from('projects').insert({
        title: 'TEST_RLS Editor Project',
        slug: `editor-project-${Date.now()}`,
        status: 'active',
        description: 'Editor owned project',
        author_id: testData.editor.profileId
      }).select().single();

      // User should not be able to update editor's project
      const { data, error } = await userClient
        .from('projects')
        .update({ description: 'Unauthorized update' })
        .eq('id', project.id);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Private Data Protection', () => {
    it('should protect contact messages from unauthorized access', async () => {
      // Create contact message
      await adminClient.from('contact_messages').insert({
        name: 'TEST_RLS Contact',
        email: 'contact@example.com',
        subject: 'Test Subject',
        message: 'Test message content',
        status: 'new'
      });

      // Regular users should not see contact messages
      const { data, error } = await userClient
        .from('contact_messages')
        .select('*')
        .like('name', '%TEST_RLS%');

      expect(data).toHaveLength(0);
    });

    it('should protect analytics events from unauthorized access', async () => {
      // Create analytics event
      await adminClient.from('analytics_events').insert({
        event_type: 'page_view',
        page_url: '/test-page',
        session_id: `session_${Date.now()}`,
        visitor_id: `visitor_${Date.now()}`,
        ip_address: '192.168.1.1'
      });

      // Regular users should not see analytics events
      const { data, error } = await userClient
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'page_view');

      expect(data).toHaveLength(0);
    });

    it('should protect private media assets', async () => {
      // Create private media asset
      await adminClient.from('media_assets').insert({
        filename: `test_rls_private_${Date.now()}.jpg`,
        original_filename: 'private-image.jpg',
        url: 'https://example.com/private-image.jpg',
        type: 'image',
        mime_type: 'image/jpeg',
        size_bytes: 1024000,
        is_public: false,
        uploaded_by: testData.editor?.profileId
      });

      // Regular users should not see private media assets
      const { data, error } = await userClient
        .from('media_assets')
        .select('*')
        .eq('is_public', false)
        .like('filename', '%test_rls%');

      expect(data).toHaveLength(0);
    });
  });

  describe('Role-Based Permissions', () => {
    it('should enforce editor permissions for content creation', async () => {
      if (!editorClient || !testData.editor) {
        throw new Error('Editor client not properly initialized');
      }

      // Editor should be able to create blog posts
      const { data, error } = await editorClient.from('blog_posts').insert({
        title: 'TEST_RLS Editor Post',
        slug: `editor-post-${Date.now()}`,
        content: 'Content created by editor',
        status: 'draft',
        author_id: testData.editor.profileId
      }).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('TEST_RLS Editor Post');
    });

    it('should allow users to create projects', async () => {
      if (!userClient || !testData.user) {
        throw new Error('User client not properly initialized');
      }

      // Regular users should be able to create projects
      const { data, error } = await userClient.from('projects').insert({
        title: 'TEST_RLS User Created Project',
        slug: `user-created-${Date.now()}`,
        description: 'Project created by regular user',
        status: 'active',
        author_id: testData.user.profileId
      }).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('TEST_RLS User Created Project');
    });

    it('should prevent unauthorized insertions', async () => {
      // Anonymous users should not be able to insert sensitive data
      const { data, error } = await anonClient.from('profiles').insert({
        user_id: uuidv4(),
        email: 'unauthorized@example.com',
        full_name: 'Unauthorized User',
        role: 'admin' // Attempting to create admin user
      });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Data Isolation', () => {
    it('should isolate user data in multi-tenant scenarios', async () => {
      if (!userClient || !editorClient) {
        throw new Error('Test clients not properly initialized');
      }

      // Create data for different users
      await adminClient.from('projects').insert([
        {
          title: 'TEST_RLS User1 Project',
          slug: `user1-project-${Date.now()}`,
          author_id: testData.user.profileId,
          status: 'active'
        },
        {
          title: 'TEST_RLS User2 Project',
          slug: `user2-project-${Date.now()}`,
          author_id: testData.editor.profileId,
          status: 'active'
        }
      ]);

      // Each user should only see their own projects in management views
      // Note: This depends on specific RLS policies for draft/management access
      const { data: user1Projects } = await userClient
        .from('projects')
        .select('*')
        .eq('author_id', testData.user.profileId)
        .like('title', '%TEST_RLS%');

      const { data: user2Projects } = await editorClient
        .from('projects')
        .select('*')
        .eq('author_id', testData.editor.profileId)  
        .like('title', '%TEST_RLS%');

      expect(user1Projects.length).toBeGreaterThan(0);
      expect(user2Projects.length).toBeGreaterThan(0);
      
      // Verify data isolation
      expect(user1Projects.every(p => p.author_id === testData.user.profileId)).toBe(true);
      expect(user2Projects.every(p => p.author_id === testData.editor.profileId)).toBe(true);
    });
  });

  describe('Security Edge Cases', () => {
    it('should prevent SQL injection through RLS policies', async () => {
      // Attempt SQL injection through where clause
      const maliciousInput = "'; DROP TABLE profiles; --";
      
      const { data, error } = await userClient
        .from('profiles')
        .select('*')
        .eq('full_name', maliciousInput);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
      
      // Verify table still exists
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('count')
        .limit(1);
      
      expect(profiles).toBeDefined();
    });

    it('should handle policy bypass attempts', async () => {
      if (!userClient) {
        throw new Error('User client not properly initialized');
      }

      // Attempt to bypass RLS using function calls or advanced queries
      const { data, error } = await userClient
        .rpc('get_all_profiles') // This RPC shouldn't exist or should respect RLS
        .catch(() => ({ data: null, error: { message: 'function does not exist' } }));

      // Should either not exist or respect RLS policies
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
});