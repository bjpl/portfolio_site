/**
 * Supabase CRUD Operations Tests
 * Tests Create, Read, Update, Delete operations across all tables
 */

const { createClient } = require('@supabase/supabase-js');
const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } = require('@jest/globals');
const { v4: uuidv4 } = require('uuid');

describe('Supabase CRUD Operations', () => {
  let supabase;
  let testUserId;
  let testData = {};

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured for testing');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    testUserId = uuidv4();
  });

  afterAll(async () => {
    // Cleanup all test data
    await cleanupTestData();
  });

  afterEach(async () => {
    // Cleanup after each test to maintain isolation
    await cleanupTestData();
  });

  const cleanupTestData = async () => {
    try {
      // Clean up in reverse dependency order
      await supabase.from('comments').delete().like('content', '%TEST_DATA%');
      await supabase.from('blog_posts').delete().like('title', '%TEST_%');
      await supabase.from('projects').delete().like('title', '%TEST_%');
      await supabase.from('testimonials').delete().like('content', '%TEST_%');
      await supabase.from('contact_messages').delete().like('name', '%TEST_%');
      await supabase.from('media_assets').delete().like('filename', '%test_%');
      await supabase.from('profiles').delete().like('full_name', '%TEST_%');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  };

  describe('Profiles CRUD', () => {
    it('should create a new profile', async () => {
      const profileData = {
        user_id: testUserId,
        email: `test.${Date.now()}@example.com`,
        full_name: 'TEST_User Profile',
        bio: 'Test bio for integration testing',
        role: 'user',
        social_links: { twitter: '@testuser' },
        website: 'https://test-example.com',
        location: 'Test City',
        language_preference: 'en'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.email).toBe(profileData.email);
      expect(data.full_name).toBe(profileData.full_name);
      expect(data.id).toBeDefined();
      
      testData.profileId = data.id;
    });

    it('should read profile data', async () => {
      // First create a profile
      const profileData = {
        user_id: uuidv4(),
        email: `read.test.${Date.now()}@example.com`,
        full_name: 'TEST_Read Profile',
        role: 'user'
      };

      const { data: createdData } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      // Then read it
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', createdData.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.email).toBe(profileData.email);
      expect(data.full_name).toBe(profileData.full_name);
    });

    it('should update profile data', async () => {
      // Create profile first
      const { data: createdData } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: `update.test.${Date.now()}@example.com`,
          full_name: 'TEST_Update Profile',
          role: 'user'
        })
        .select()
        .single();

      // Update the profile
      const updatedBio = 'Updated bio content for testing';
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          bio: updatedBio,
          website: 'https://updated-example.com',
          updated_at: new Date().toISOString()
        })
        .eq('id', createdData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.bio).toBe(updatedBio);
      expect(data.website).toBe('https://updated-example.com');
    });

    it('should delete profile data', async () => {
      // Create profile first
      const { data: createdData } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: `delete.test.${Date.now()}@example.com`,
          full_name: 'TEST_Delete Profile',
          role: 'user'
        })
        .select()
        .single();

      // Delete the profile
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', createdData.id);

      expect(deleteError).toBeNull();

      // Verify deletion
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', createdData.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('Projects CRUD', () => {
    let profileId;

    beforeEach(async () => {
      // Create a test profile for projects
      const { data } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: `project.author.${Date.now()}@example.com`,
          full_name: 'TEST_Project Author',
          role: 'user'
        })
        .select()
        .single();
      
      profileId = data.id;
    });

    it('should create a new project', async () => {
      const projectData = {
        title: 'TEST_Sample Project',
        slug: `test-project-${Date.now()}`,
        description: 'A test project for integration testing',
        content: 'Detailed project content for testing',
        tech_stack: ['React', 'Node.js', 'PostgreSQL'],
        github_url: 'https://github.com/test/project',
        live_url: 'https://test-project.com',
        featured: false,
        status: 'active',
        category: 'web-development',
        tags: ['frontend', 'backend'],
        author_id: profileId
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe(projectData.title);
      expect(data.tech_stack).toEqual(projectData.tech_stack);
      expect(data.id).toBeDefined();
    });

    it('should handle project with complex data types', async () => {
      const projectData = {
        title: 'TEST_Complex Project',
        slug: `complex-project-${Date.now()}`,
        tech_stack: ['Vue.js', 'Express', 'MongoDB', 'Redis'],
        key_achievements: [
          'Improved performance by 50%',
          'Reduced server costs by 30%',
          'Implemented real-time features'
        ],
        challenges: [
          'Complex state management',
          'Performance optimization',
          'Third-party API integration'
        ],
        lessons_learned: [
          'Importance of proper testing',
          'Benefits of code review',
          'Value of documentation'
        ],
        tags: ['vue', 'express', 'mongodb', 'redis', 'realtime'],
        author_id: profileId,
        difficulty_level: 4,
        estimated_hours: 160,
        actual_hours: 180
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.key_achievements).toEqual(projectData.key_achievements);
      expect(data.challenges).toEqual(projectData.challenges);
      expect(data.difficulty_level).toBe(projectData.difficulty_level);
    });

    it('should query projects with filters', async () => {
      // Create multiple test projects
      const projects = [
        {
          title: 'TEST_Frontend Project',
          slug: `frontend-${Date.now()}`,
          category: 'frontend',
          tech_stack: ['React', 'CSS'],
          status: 'active',
          featured: true,
          author_id: profileId
        },
        {
          title: 'TEST_Backend Project',
          slug: `backend-${Date.now()}`,
          category: 'backend',
          tech_stack: ['Node.js', 'Express'],
          status: 'active',
          featured: false,
          author_id: profileId
        }
      ];

      await supabase.from('projects').insert(projects);

      // Test category filter
      const { data: frontendProjects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('category', 'frontend')
        .like('title', 'TEST_%');

      expect(error).toBeNull();
      expect(frontendProjects.length).toBeGreaterThan(0);
      expect(frontendProjects[0].category).toBe('frontend');

      // Test featured filter
      const { data: featuredProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('featured', true)
        .like('title', 'TEST_%');

      expect(featuredProjects.length).toBeGreaterThan(0);
      expect(featuredProjects[0].featured).toBe(true);
    });
  });

  describe('Blog Posts CRUD', () => {
    let authorId;

    beforeEach(async () => {
      const { data } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: `blog.author.${Date.now()}@example.com`,
          full_name: 'TEST_Blog Author',
          role: 'editor'
        })
        .select()
        .single();
      
      authorId = data.id;
    });

    it('should create and publish a blog post', async () => {
      const postData = {
        title: 'TEST_Sample Blog Post',
        slug: `test-blog-post-${Date.now()}`,
        content: 'This is the content of a test blog post with **markdown** formatting.',
        excerpt: 'A sample excerpt for testing purposes.',
        author_id: authorId,
        status: 'published',
        featured: false,
        tags: ['testing', 'integration', 'supabase'],
        categories: ['technology', 'development'],
        language: 'en',
        reading_time: 5,
        published_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('blog_posts')
        .insert(postData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe(postData.title);
      expect(data.tags).toEqual(postData.tags);
      expect(data.status).toBe('published');
    });

    it('should handle multilingual blog posts', async () => {
      const postData = {
        title: 'TEST_Multilingual Post',
        slug: `multilingual-post-${Date.now()}`,
        content: 'English content',
        author_id: authorId,
        status: 'published',
        language: 'en',
        translations: {
          es: {
            title: 'Publicación Multilingüe de Prueba',
            content: 'Contenido en español',
            excerpt: 'Extracto en español'
          },
          fr: {
            title: 'Article Multilingue de Test',
            content: 'Contenu en français',
            excerpt: 'Extrait en français'
          }
        }
      };

      const { data, error } = await supabase
        .from('blog_posts')
        .insert(postData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.translations).toEqual(postData.translations);
      expect(data.translations.es.title).toBe('Publicación Multilingüe de Prueba');
    });
  });

  describe('Media Assets CRUD', () => {
    let uploaderId;

    beforeEach(async () => {
      const { data } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: `uploader.${Date.now()}@example.com`,
          full_name: 'TEST_Media Uploader',
          role: 'user'
        })
        .select()
        .single();
      
      uploaderId = data.id;
    });

    it('should create media asset records', async () => {
      const assetData = {
        filename: `test_image_${Date.now()}.jpg`,
        original_filename: 'test-image.jpg',
        url: 'https://example.com/uploads/test-image.jpg',
        type: 'image',
        mime_type: 'image/jpeg',
        size_bytes: 1024000,
        width: 1920,
        height: 1080,
        alt_text: 'Test image for integration testing',
        caption: 'A sample test image',
        metadata: {
          camera: 'Test Camera',
          iso: 100,
          aperture: 'f/2.8'
        },
        tags: ['test', 'sample', 'integration'],
        folder: 'test-uploads',
        uploaded_by: uploaderId
      };

      const { data, error } = await supabase
        .from('media_assets')
        .insert(assetData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.filename).toBe(assetData.filename);
      expect(data.metadata).toEqual(assetData.metadata);
      expect(data.size_bytes).toBe(assetData.size_bytes);
    });

    it('should handle different media types', async () => {
      const mediaTypes = [
        {
          type: 'video',
          mime_type: 'video/mp4',
          duration: 120.5,
          filename: `test_video_${Date.now()}.mp4`
        },
        {
          type: 'audio',
          mime_type: 'audio/mpeg',
          duration: 240.0,
          filename: `test_audio_${Date.now()}.mp3`
        },
        {
          type: 'document',
          mime_type: 'application/pdf',
          filename: `test_document_${Date.now()}.pdf`
        }
      ];

      for (const mediaType of mediaTypes) {
        const { data, error } = await supabase
          .from('media_assets')
          .insert({
            ...mediaType,
            original_filename: mediaType.filename,
            url: `https://example.com/uploads/${mediaType.filename}`,
            size_bytes: 1000000,
            uploaded_by: uploaderId
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.type).toBe(mediaType.type);
        expect(data.mime_type).toBe(mediaType.mime_type);
      }
    });
  });

  describe('Complex Relationships', () => {
    it('should handle nested queries with joins', async () => {
      // Create test data with relationships
      const { data: author } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: `nested.author.${Date.now()}@example.com`,
          full_name: 'TEST_Nested Author',
          role: 'author'
        })
        .select()
        .single();

      const { data: project } = await supabase
        .from('projects')
        .insert({
          title: 'TEST_Project with Relations',
          slug: `nested-project-${Date.now()}`,
          author_id: author.id,
          status: 'active'
        })
        .select()
        .single();

      // Query with relationship data
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          author:profiles(full_name, email, role)
        `)
        .eq('id', project.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.author).toBeDefined();
      expect(data.author.full_name).toBe('TEST_Nested Author');
    });

    it('should handle cascading deletes properly', async () => {
      // Create parent-child relationship
      const { data: post } = await supabase
        .from('blog_posts')
        .insert({
          title: 'TEST_Parent Post',
          slug: `parent-post-${Date.now()}`,
          content: 'Parent post content',
          status: 'published'
        })
        .select()
        .single();

      const { data: comment } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          content: 'TEST_DATA Child comment',
          author_name: 'Test Commenter',
          author_email: 'test@example.com',
          status: 'approved'
        })
        .select()
        .single();

      // Delete parent
      await supabase
        .from('blog_posts')
        .delete()
        .eq('id', post.id);

      // Check if child was cascade deleted
      const { data: remainingComments } = await supabase
        .from('comments')
        .select('*')
        .eq('id', comment.id);

      expect(remainingComments).toHaveLength(0);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch inserts efficiently', async () => {
      const batchData = Array.from({ length: 10 }, (_, i) => ({
        name: `TEST_Tag ${i}`,
        slug: `test-tag-${i}-${Date.now()}`,
        description: `Test tag ${i} for batch testing`,
        usage_count: i * 2
      }));

      const { data, error } = await supabase
        .from('tags')
        .insert(batchData)
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).toHaveLength(10);
      expect(data[0].name).toBe('TEST_Tag 0');
      expect(data[9].name).toBe('TEST_Tag 9');
    });

    it('should handle batch updates', async () => {
      // First create test records
      const { data: created } = await supabase
        .from('skills')
        .insert([
          { name: 'TEST_JavaScript', category: 'programming', level: 7 },
          { name: 'TEST_TypeScript', category: 'programming', level: 6 },
          { name: 'TEST_React', category: 'frontend', level: 8 }
        ])
        .select();

      const skillIds = created.map(skill => skill.id);

      // Batch update
      const { data, error } = await supabase
        .from('skills')
        .update({ is_featured: true, endorsement_count: 10 })
        .in('id', skillIds)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(data.every(skill => skill.is_featured === true)).toBe(true);
      expect(data.every(skill => skill.endorsement_count === 10)).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should enforce required field constraints', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          // Missing required email field
          full_name: 'TEST_Incomplete Profile'
        });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('null');
    });

    it('should enforce unique constraints', async () => {
      const email = `unique.test.${Date.now()}@example.com`;
      
      // Create first profile
      await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: email,
          full_name: 'TEST_First Profile'
        });

      // Try to create duplicate
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: uuidv4(),
          email: email, // Same email
          full_name: 'TEST_Duplicate Profile'
        });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('duplicate');
    });

    it('should enforce check constraints', async () => {
      const { data, error } = await supabase
        .from('skills')
        .insert({
          name: 'TEST_Invalid Skill',
          category: 'testing',
          level: 15 // Invalid level (should be 1-10)
        });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('check');
    });
  });
});