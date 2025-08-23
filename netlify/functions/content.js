/**
 * Content Management API for Netlify Functions
 * Handles portfolio content CRUD operations
 */

// Simulated content store (in production, use a database)
let contentStore = {
  projects: [
    {
      id: 'project-1',
      title: 'Language Learning Dashboard',
      description: 'Interactive React dashboard for language learning analytics',
      tags: ['React', 'TypeScript', 'Education'],
      status: 'published',
      lastModified: new Date().toISOString()
    },
    {
      id: 'project-2',
      title: 'Hugo Portfolio Site',
      description: 'Multilingual portfolio site built with Hugo and modern JavaScript',
      tags: ['Hugo', 'JavaScript', 'Multilingual'],
      status: 'published',
      lastModified: new Date().toISOString()
    }
  ],
  posts: [],
  skills: [
    'JavaScript', 'TypeScript', 'React', 'Hugo', 'Node.js', 'Python',
    'Education Technology', 'Language Learning', 'Web Development'
  ]
};

// Simple authentication check
function isAuthenticated(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  // Simple token validation (in production, use proper JWT validation)
  const token = authHeader.substring(7);
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: ''
    };
  }

  const path = event.path.replace('/.netlify/functions/content', '') || '/';
  const method = event.httpMethod;
  const pathSegments = path.split('/').filter(segment => segment);

  try {
    // Routes that don't require authentication
    if (method === 'GET') {
      // GET /api/content/projects
      if (pathSegments[0] === 'projects' && pathSegments.length === 1) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: contentStore.projects.filter(p => p.status === 'published'),
            total: contentStore.projects.length
          })
        };
      }

      // GET /api/content/projects/:id
      if (pathSegments[0] === 'projects' && pathSegments.length === 2) {
        const projectId = pathSegments[1];
        const project = contentStore.projects.find(p => p.id === projectId);
        
        if (!project) {
          return {
            statusCode: 404,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Project not found' })
          };
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: project
          })
        };
      }

      // GET /api/content/skills
      if (pathSegments[0] === 'skills') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: contentStore.skills
          })
        };
      }
    }

    // Routes that require authentication
    if (!isAuthenticated(event)) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // POST /api/content/projects
    if (method === 'POST' && pathSegments[0] === 'projects') {
      const projectData = JSON.parse(event.body);
      const newProject = {
        id: `project-${Date.now()}`,
        ...projectData,
        lastModified: new Date().toISOString(),
        status: projectData.status || 'draft'
      };
      
      contentStore.projects.push(newProject);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: newProject,
          message: 'Project created successfully'
        })
      };
    }

    // PUT /api/content/projects/:id
    if (method === 'PUT' && pathSegments[0] === 'projects' && pathSegments.length === 2) {
      const projectId = pathSegments[1];
      const projectIndex = contentStore.projects.findIndex(p => p.id === projectId);
      
      if (projectIndex === -1) {
        return {
          statusCode: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Project not found' })
        };
      }

      const updateData = JSON.parse(event.body);
      contentStore.projects[projectIndex] = {
        ...contentStore.projects[projectIndex],
        ...updateData,
        lastModified: new Date().toISOString()
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: contentStore.projects[projectIndex],
          message: 'Project updated successfully'
        })
      };
    }

    // DELETE /api/content/projects/:id
    if (method === 'DELETE' && pathSegments[0] === 'projects' && pathSegments.length === 2) {
      const projectId = pathSegments[1];
      const projectIndex = contentStore.projects.findIndex(p => p.id === projectId);
      
      if (projectIndex === -1) {
        return {
          statusCode: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Project not found' })
        };
      }

      contentStore.projects.splice(projectIndex, 1);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Project deleted successfully'
        })
      };
    }

    // Route not found
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Content endpoint not found',
        path: path,
        method: method
      })
    };

  } catch (error) {
    console.error('Content API error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};