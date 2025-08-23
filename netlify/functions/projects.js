/**
 * Netlify Function: Projects API
 * Serves portfolio projects data with filtering and categorization
 */

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed. Use GET.'
      })
    };
  }

  try {
    // Parse query parameters
    const params = new URLSearchParams(event.queryString || '');
    const category = params.get('category');
    const technology = params.get('technology');
    const featured = params.get('featured') === 'true';

    // Mock projects data (in production, you'd fetch from a CMS or database)
    const allProjects = [
      {
        id: 1,
        name: 'Universal API System',
        slug: 'universal-api-system',
        description: 'A comprehensive API client system that automatically detects environments, handles fallbacks, and provides offline support with service workers.',
        longDescription: 'This project demonstrates advanced API architecture with intelligent environment detection, retry logic with exponential backoff, comprehensive error handling, and seamless offline functionality. It includes monitoring, caching, and graceful degradation to ensure users never see connection errors.',
        category: 'Web Development',
        technologies: ['JavaScript', 'Service Workers', 'PWA', 'API Design'],
        status: 'completed',
        featured: true,
        images: {
          thumbnail: '/images/projects/api-system-thumb.jpg',
          gallery: [
            '/images/projects/api-system-1.jpg',
            '/images/projects/api-system-2.jpg'
          ]
        },
        links: {
          demo: 'https://portfolio-demo.netlify.app',
          github: 'https://github.com/username/universal-api-system',
          documentation: 'https://docs.example.com/api-system'
        },
        metrics: {
          githubStars: 45,
          forks: 12,
          downloads: 1200
        },
        startDate: '2024-01-01',
        completedDate: '2024-01-15',
        highlights: [
          'Zero connection errors for users',
          'Automatic environment detection',
          'Offline-first architecture',
          'Real-time monitoring dashboard'
        ]
      },
      {
        id: 2,
        name: 'Multilingual Portfolio Site',
        slug: 'multilingual-portfolio-site',
        description: 'A responsive portfolio website built with Hugo, featuring dark mode, multiple languages, and modern UI components.',
        longDescription: 'A sophisticated portfolio site built with Hugo static site generator, featuring internationalization, dark/light mode switching, responsive design, and modern CSS techniques. Includes automated deployment and performance optimization.',
        category: 'Web Development',
        technologies: ['Hugo', 'HTML5', 'CSS3', 'JavaScript', 'Netlify'],
        status: 'completed',
        featured: true,
        images: {
          thumbnail: '/images/projects/portfolio-thumb.jpg',
          gallery: [
            '/images/projects/portfolio-1.jpg',
            '/images/projects/portfolio-2.jpg'
          ]
        },
        links: {
          demo: 'https://portfolio.netlify.app',
          github: 'https://github.com/username/portfolio-site'
        },
        metrics: {
          performanceScore: 98,
          accessibilityScore: 100,
          seoScore: 95
        },
        startDate: '2023-12-15',
        completedDate: '2024-01-10',
        highlights: [
          'Perfect accessibility score',
          'Sub-second loading times',
          'Multiple language support',
          'Modern design system'
        ]
      },
      {
        id: 3,
        name: 'React Task Management App',
        slug: 'react-task-management-app',
        description: 'A full-stack task management application with real-time collaboration, drag-and-drop interface, and advanced filtering.',
        longDescription: 'A comprehensive task management solution built with React and Node.js, featuring real-time collaboration via WebSockets, drag-and-drop task organization, advanced filtering and search, user authentication, and responsive design.',
        category: 'Full Stack',
        technologies: ['React', 'Node.js', 'MongoDB', 'Socket.io', 'Express'],
        status: 'in-progress',
        featured: false,
        images: {
          thumbnail: '/images/projects/taskapp-thumb.jpg',
          gallery: [
            '/images/projects/taskapp-1.jpg'
          ]
        },
        links: {
          github: 'https://github.com/username/task-management-app'
        },
        metrics: {
          codeQuality: 'A+',
          testCoverage: 85
        },
        startDate: '2024-01-20',
        expectedCompletion: '2024-03-15',
        highlights: [
          'Real-time collaboration',
          'Intuitive drag-and-drop',
          'Advanced search capabilities',
          'Responsive design'
        ]
      },
      {
        id: 4,
        name: 'Mobile Weather App',
        slug: 'mobile-weather-app',
        description: 'A cross-platform mobile weather application with location services, weather forecasts, and beautiful visualizations.',
        longDescription: 'A React Native mobile application providing comprehensive weather information with location services, 7-day forecasts, interactive maps, weather alerts, and stunning visual presentations of weather data.',
        category: 'Mobile Development',
        technologies: ['React Native', 'Expo', 'Weather API', 'Maps'],
        status: 'completed',
        featured: false,
        images: {
          thumbnail: '/images/projects/weather-thumb.jpg',
          gallery: [
            '/images/projects/weather-1.jpg',
            '/images/projects/weather-2.jpg'
          ]
        },
        links: {
          demo: 'https://weather-app-demo.netlify.app',
          github: 'https://github.com/username/weather-app',
          appStore: 'https://apps.apple.com/app/weather-app',
          playStore: 'https://play.google.com/store/apps/details?id=com.weather'
        },
        metrics: {
          downloads: 5000,
          rating: 4.8,
          reviews: 234
        },
        startDate: '2023-11-01',
        completedDate: '2023-12-20',
        highlights: [
          'Cross-platform compatibility',
          'Beautiful data visualizations',
          'Offline data caching',
          'Push notifications for alerts'
        ]
      }
    ];

    // Filter projects
    let filteredProjects = [...allProjects];

    // Category filter
    if (category) {
      filteredProjects = filteredProjects.filter(project => 
        project.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Technology filter
    if (technology) {
      filteredProjects = filteredProjects.filter(project =>
        project.technologies.some(tech => 
          tech.toLowerCase().includes(technology.toLowerCase())
        )
      );
    }

    // Featured filter
    if (featured) {
      filteredProjects = filteredProjects.filter(project => project.featured);
    }

    // Sort by featured first, then by completion date
    filteredProjects.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      
      const dateA = new Date(a.completedDate || a.startDate);
      const dateB = new Date(b.completedDate || b.startDate);
      return dateB - dateA;
    });

    // Get available categories and technologies for filtering
    const categories = [...new Set(allProjects.map(project => project.category))];
    const technologies = [...new Set(allProjects.flatMap(project => project.technologies))];

    // Calculate stats
    const stats = {
      total: allProjects.length,
      completed: allProjects.filter(p => p.status === 'completed').length,
      inProgress: allProjects.filter(p => p.status === 'in-progress').length,
      featured: allProjects.filter(p => p.featured).length
    };

    const response = {
      projects: filteredProjects,
      meta: {
        categories,
        technologies,
        stats,
        lastUpdated: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Projects API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch projects',
        timestamp: new Date().toISOString()
      })
    };
  }
};