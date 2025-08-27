'use client';

import { useState, useEffect } from 'react';
import { supabase, db } from '../../lib/supabase/client';

export default function TestDatabase() {
  const [status, setStatus] = useState('Testing connection...');
  const [blogs, setBlogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    try {
      // Test API route
      const res = await fetch('/api/test-connection');
      const data = await res.json();
      
      if (data.success) {
        setStatus('✅ Database connected successfully!');
        
        // Fetch blog posts
        const blogPosts = await db.blogPosts.getAll({ limit: 5 });
        setBlogs(blogPosts || []);
        
        // Fetch projects
        const projectList = await db.projects.getAll({ limit: 5 });
        setProjects(projectList || []);
        
        // Get current user profile
        const userProfile = await db.profiles.getCurrentUser();
        setProfile(userProfile);
      } else {
        setStatus('❌ Connection failed');
        setError(data.error);
      }
    } catch (err) {
      setStatus('❌ Connection failed');
      setError(err.message);
    }
  }

  async function createTestPost() {
    try {
      const newPost = await db.blogPosts.create({
        title: 'Test Blog Post',
        slug: `test-post-${Date.now()}`,
        excerpt: 'This is a test blog post',
        content: 'Full content of the test blog post...',
        status: 'published',
        visibility: 'public',
        tags: ['test'],
        categories: ['testing'],
        published_at: new Date().toISOString()
      });
      
      alert('Blog post created successfully!');
      testConnection(); // Refresh data
    } catch (err) {
      alert('Error creating post: ' + err.message);
    }
  }

  async function createTestProject() {
    try {
      const newProject = await db.projects.create({
        title: 'Test Project',
        slug: `test-project-${Date.now()}`,
        description: 'This is a test project',
        content: 'Full description of the test project...',
        status: 'published',
        visibility: 'public',
        technologies: ['Next.js', 'Supabase'],
        tags: ['test'],
        project_type: 'web',
        featured: false
      });
      
      alert('Project created successfully!');
      testConnection(); // Refresh data
    } catch (err) {
      alert('Error creating project: ' + err.message);
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Database Test Page</h1>
      
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <p className="text-lg">{status}</p>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      </div>

      {profile && (
        <div className="mb-8 p-4 bg-blue-50 rounded">
          <h2 className="text-xl font-semibold mb-2">Current User Profile</h2>
          <p>Username: {profile.username}</p>
          <p>Full Name: {profile.full_name}</p>
          <p>Admin: {profile.is_admin ? 'Yes' : 'No'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Blog Posts ({blogs.length})</h2>
          <button
            onClick={createTestPost}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Test Post
          </button>
          {blogs.length === 0 ? (
            <p className="text-gray-500">No blog posts found</p>
          ) : (
            <ul className="space-y-2">
              {blogs.map(post => (
                <li key={post.id} className="p-3 bg-white border rounded">
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-600">{post.excerpt}</p>
                  <p className="text-xs text-gray-400">Status: {post.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Projects ({projects.length})</h2>
          <button
            onClick={createTestProject}
            className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create Test Project
          </button>
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects found</p>
          ) : (
            <ul className="space-y-2">
              {projects.map(project => (
                <li key={project.id} className="p-3 bg-white border rounded">
                  <h3 className="font-semibold">{project.title}</h3>
                  <p className="text-sm text-gray-600">{project.description}</p>
                  <p className="text-xs text-gray-400">Type: {project.project_type}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}