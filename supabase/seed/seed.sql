-- Seed Data for Portfolio Site
-- Sample data for development and testing

-- Insert sample profiles (users)
INSERT INTO profiles (id, email, full_name, avatar_url, role, bio, social_links) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin@portfolio.com',
    'John Doe',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'admin',
    'Full-stack developer passionate about creating amazing web experiences.',
    '{"github": "johndoe", "twitter": "@johndoe", "linkedin": "johndoe", "website": "https://johndoe.dev"}'
),
(
    '00000000-0000-0000-0000-000000000002',
    'editor@portfolio.com',
    'Jane Smith',
    'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
    'editor',
    'Content creator and technical writer.',
    '{"github": "janesmith", "twitter": "@janesmith"}'
),
(
    '00000000-0000-0000-0000-000000000003',
    'user@portfolio.com',
    'Mike Johnson',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'user',
    'Frontend developer and design enthusiast.',
    '{"dribbble": "mikejohnson"}'
);

-- Insert sample skills
INSERT INTO skills (name, category, proficiency_level, years_experience, display_order, is_featured) VALUES
('JavaScript', 'Programming Languages', 95, 5.0, 1, true),
('TypeScript', 'Programming Languages', 90, 3.0, 2, true),
('Python', 'Programming Languages', 85, 4.0, 3, true),
('React', 'Frontend Frameworks', 95, 4.0, 4, true),
('Next.js', 'Frontend Frameworks', 90, 2.5, 5, true),
('Vue.js', 'Frontend Frameworks', 80, 2.0, 6, false),
('Node.js', 'Backend Technologies', 90, 4.0, 7, true),
('Express.js', 'Backend Technologies', 85, 3.5, 8, false),
('PostgreSQL', 'Databases', 85, 3.0, 9, true),
('MongoDB', 'Databases', 80, 2.5, 10, false),
('Docker', 'DevOps', 85, 3.0, 11, true),
('AWS', 'Cloud Platforms', 80, 2.0, 12, true),
('Git', 'Tools', 95, 5.0, 13, false),
('Figma', 'Design Tools', 75, 2.0, 14, false);

-- Insert sample experiences
INSERT INTO experiences (company, position, description, location, start_date, end_date, is_current, technologies, achievements, company_url, display_order) VALUES
(
    'Tech Solutions Inc.',
    'Senior Full-Stack Developer',
    'Led development of multiple web applications using modern JavaScript frameworks. Collaborated with cross-functional teams to deliver high-quality software solutions.',
    'San Francisco, CA',
    '2022-01-15',
    NULL,
    true,
    ARRAY['React', 'Node.js', 'PostgreSQL', 'AWS'],
    ARRAY['Reduced page load times by 40%', 'Led team of 4 developers', 'Implemented CI/CD pipeline'],
    'https://techsolutions.example.com',
    1
),
(
    'Digital Agency Co.',
    'Frontend Developer',
    'Developed responsive web applications and worked closely with designers to implement pixel-perfect UI/UX designs.',
    'New York, NY',
    '2020-06-01',
    '2021-12-31',
    false,
    ARRAY['React', 'Sass', 'JavaScript', 'Figma'],
    ARRAY['Delivered 15+ client projects', 'Improved mobile performance by 60%', 'Mentored 2 junior developers'],
    'https://digitalagency.example.com',
    2
),
(
    'StartupXYZ',
    'Junior Web Developer',
    'Built and maintained company website and internal tools. Gained experience with full-stack development.',
    'Austin, TX',
    '2019-03-01',
    '2020-05-31',
    false,
    ARRAY['Vue.js', 'PHP', 'MySQL', 'Bootstrap'],
    ARRAY['Built company website from scratch', 'Reduced server response time by 30%'],
    'https://startupxyz.example.com',
    3
);

-- Insert sample education
INSERT INTO education (institution, degree, field_of_study, grade, start_date, end_date, description, activities, institution_url, display_order) VALUES
(
    'University of Technology',
    'Bachelor of Science',
    'Computer Science',
    '3.8 GPA',
    '2015-09-01',
    '2019-05-31',
    'Focused on software engineering, algorithms, and data structures. Participated in various programming competitions and hackathons.',
    ARRAY['Programming Club President', 'Hackathon Winner 2018', 'Dean''s List 3 semesters'],
    'https://universityoftech.edu',
    1
),
(
    'Code Academy',
    'Full-Stack Web Development Certificate',
    'Web Development',
    'Completed',
    '2018-06-01',
    '2018-12-31',
    'Intensive 6-month program covering modern web development technologies and best practices.',
    ARRAY['Built 5 full-stack projects', 'Peer code reviewer'],
    'https://codeacademy.com',
    2
);

-- Insert sample projects
INSERT INTO projects (title, description, short_description, tech_stack, images, github_url, live_url, featured, display_order, metadata) VALUES
(
    'E-Commerce Platform',
    'A full-featured e-commerce platform built with React and Node.js. Includes user authentication, product catalog, shopping cart, payment processing with Stripe, order management, and admin dashboard. Features responsive design, real-time inventory updates, and comprehensive analytics.',
    'Full-stack e-commerce solution with React, Node.js, and Stripe integration',
    ARRAY['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Redux', 'Express.js', 'JWT'],
    ARRAY['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600'],
    'https://github.com/johndoe/ecommerce-platform',
    'https://ecommerce-demo.johndoe.dev',
    true,
    1,
    '{"featured_image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600", "completion_date": "2023-08-15"}'
),
(
    'Task Management App',
    'A collaborative task management application inspired by Trello. Features include drag-and-drop functionality, real-time collaboration, team management, file attachments, due dates, and notifications. Built with modern React patterns and WebSocket for real-time updates.',
    'Collaborative task management with real-time updates',
    ARRAY['React', 'Socket.io', 'MongoDB', 'Express.js', 'Material-UI', 'Cloudinary'],
    ARRAY['https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=600'],
    'https://github.com/johndoe/task-manager',
    'https://taskmanager.johndoe.dev',
    true,
    2,
    '{"featured_image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600", "completion_date": "2023-06-20"}'
),
(
    'Weather Dashboard',
    'A comprehensive weather dashboard that displays current conditions, hourly and weekly forecasts, and weather maps. Features location-based weather, favorite locations, weather alerts, and beautiful data visualizations using Chart.js.',
    'Beautiful weather dashboard with forecasts and visualizations',
    ARRAY['JavaScript', 'Chart.js', 'OpenWeather API', 'Leaflet.js', 'Bootstrap'],
    ARRAY['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600'],
    'https://github.com/johndoe/weather-dashboard',
    'https://weather.johndoe.dev',
    true,
    3,
    '{"featured_image": "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600", "completion_date": "2023-04-10"}'
),
(
    'Portfolio Website',
    'This very portfolio website you''re viewing! Built with modern web technologies and best practices. Features a responsive design, blog system, contact form, and admin dashboard. Deployed on Netlify with automatic deployments from GitHub.',
    'Personal portfolio with blog and admin features',
    ARRAY['React', 'Gatsby', 'GraphQL', 'Styled Components', 'Netlify Functions'],
    ARRAY['https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600'],
    'https://github.com/johndoe/portfolio',
    'https://johndoe.dev',
    false,
    4,
    '{"featured_image": "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600", "completion_date": "2023-09-01"}'
),
(
    'Real-time Chat Application',
    'A real-time chat application with multiple rooms, private messaging, file sharing, and emoji support. Built with Socket.io for real-time communication and includes features like message history, user presence indicators, and typing indicators.',
    'Real-time chat with rooms and private messaging',
    ARRAY['Node.js', 'Socket.io', 'React', 'MongoDB', 'Multer', 'JWT'],
    ARRAY['https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&h=600'],
    'https://github.com/johndoe/chat-app',
    'https://chat.johndoe.dev',
    false,
    5,
    '{"featured_image": "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&h=600", "completion_date": "2023-03-15"}'
);

-- Insert sample blog posts
INSERT INTO blog_posts (id, title, content, excerpt, slug, author_id, tags, featured_image, status, published_at, metadata) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Getting Started with React Hooks',
    '# Getting Started with React Hooks

React Hooks revolutionized the way we write React components by allowing us to use state and other React features in functional components. In this comprehensive guide, we''ll explore the most commonly used hooks and learn how to implement them effectively.

## What are React Hooks?

Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have become the standard way to write React components.

## useState Hook

The `useState` hook is the most fundamental hook. It allows you to add state to functional components:

```javascript
import React, { useState } from ''react'';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

## useEffect Hook

The `useEffect` hook lets you perform side effects in function components. It serves the same purpose as `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount` combined:

```javascript
import React, { useState, useEffect } from ''react'';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

## Custom Hooks

One of the most powerful features of hooks is the ability to create custom hooks. Custom hooks are JavaScript functions whose names start with "use" and that may call other hooks:

```javascript
import { useState, useEffect } from ''react'';

function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}
```

## Best Practices

1. **Always call hooks at the top level** - Don''t call hooks inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Either React function components or custom hooks
3. **Use the ESLint plugin** - The `eslint-plugin-react-hooks` plugin helps enforce these rules

## Conclusion

React Hooks provide a more direct API to the React concepts you already know. They make it easier to reuse stateful logic between components and help you organize your code better. Start incorporating them into your React applications today!',
    'Learn the fundamentals of React Hooks and how to use useState, useEffect, and custom hooks in your React applications.',
    'getting-started-with-react-hooks',
    '00000000-0000-0000-0000-000000000001',
    ARRAY['React', 'JavaScript', 'Hooks', 'Frontend', 'Tutorial'],
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600',
    'published',
    '2023-10-15 10:00:00+00',
    '{"reading_time": 8, "featured": true}'
),
(
    '10000000-0000-0000-0000-000000000002',
    'Building Scalable APIs with Node.js and Express',
    '# Building Scalable APIs with Node.js and Express

Creating scalable APIs is crucial for modern web applications. In this article, we''ll explore best practices for building robust, maintainable APIs using Node.js and Express.js.

## Why Node.js and Express?

Node.js provides an excellent runtime for building APIs due to its:
- Non-blocking I/O operations
- Large ecosystem of packages
- JavaScript across the entire stack
- Excellent performance for I/O-intensive applications

Express.js is a minimal and flexible web framework that provides:
- Robust routing
- Middleware support
- Template engines
- Static file serving

## Project Structure

A well-organized project structure is essential for scalability:

```
project/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── tests/
├── config/
└── docs/
```

## Middleware for Cross-Cutting Concerns

Use middleware to handle common functionality:

```javascript
const express = require(''express'');
const cors = require(''cors'');
const helmet = require(''helmet'');
const rateLimit = require(''express-rate-limit'');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: ''10mb'' }));
app.use(express.urlencoded({ extended: true }));
```

## Error Handling

Implement centralized error handling:

```javascript
class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(''4'') ? ''fail'' : ''error'';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  if (process.env.NODE_ENV === ''production'' && !err.isOperational) {
    message = ''Internal server error'';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === ''development'' && { stack: err.stack })
  });
};
```

## Validation and Sanitization

Use libraries like Joi or express-validator:

```javascript
const Joi = require(''joi'');

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).max(120)
});

const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};
```

## Database Integration

Use connection pooling and proper error handling:

```javascript
const { Pool } = require(''pg'');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class UserService {
  static async getUser(id) {
    const client = await pool.connect();
    try {
      const result = await client.query(''SELECT * FROM users WHERE id = $1'', [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
```

## Conclusion

Building scalable APIs requires careful attention to structure, error handling, validation, and database integration. By following these practices, you''ll create APIs that can grow with your application''s needs.',
    'Learn best practices for building scalable, maintainable APIs using Node.js and Express.js, including project structure, middleware, and error handling.',
    'building-scalable-apis-nodejs-express',
    '00000000-0000-0000-0000-000000000001',
    ARRAY['Node.js', 'Express.js', 'API', 'Backend', 'Scalability'],
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600',
    'published',
    '2023-10-10 14:30:00+00',
    '{"reading_time": 12, "featured": true}'
),
(
    '10000000-0000-0000-0000-000000000003',
    'CSS Grid vs Flexbox: When to Use Each',
    '# CSS Grid vs Flexbox: When to Use Each

Both CSS Grid and Flexbox are powerful layout systems, but they serve different purposes. Understanding when to use each one will make you a more effective frontend developer.

## Understanding Flexbox

Flexbox is designed for one-dimensional layouts. It excels at:
- Distributing space along a single axis
- Aligning items within a container
- Creating flexible, responsive components

### Example: Navigation Bar

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
  list-style: none;
}
```

## Understanding CSS Grid

CSS Grid is designed for two-dimensional layouts. It''s perfect for:
- Creating complex layout structures
- Overlapping elements
- Precise control over rows and columns

### Example: Card Layout

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}
```

## When to Use Flexbox

Use Flexbox when you need:
1. **One-dimensional layouts**: Arranging items in a row or column
2. **Component-level layouts**: Navigation bars, button groups, form controls
3. **Content-based sizing**: When content should determine the size
4. **Alignment control**: Centering items or distributing space

## When to Use CSS Grid

Use CSS Grid when you need:
1. **Two-dimensional layouts**: Complex page layouts with rows and columns
2. **Precise control**: Exact positioning and sizing requirements
3. **Overlapping elements**: Layering content in specific grid areas
4. **Page-level layouts**: Overall page structure and major sections

## Combining Both

Often, the best approach is using both together:

```css
/* Grid for overall page layout */
.page {
  display: grid;
  grid-template-areas: 
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}

/* Flexbox for component layouts */
.header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}
```

## Conclusion

Both CSS Grid and Flexbox are essential tools in modern CSS. Use Flexbox for component-level, one-dimensional layouts and CSS Grid for page-level, two-dimensional layouts. Don''t be afraid to combine them for the best results!',
    'Understand the differences between CSS Grid and Flexbox, and learn when to use each layout system for optimal results.',
    'css-grid-vs-flexbox-when-to-use-each',
    '00000000-0000-0000-0000-000000000002',
    ARRAY['CSS', 'Grid', 'Flexbox', 'Layout', 'Frontend'],
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600',
    'published',
    '2023-10-05 09:15:00+00',
    '{"reading_time": 6, "featured": false}'
);

-- Insert sample comments
INSERT INTO comments (post_id, author_id, content, approved) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Great article! React Hooks have really transformed the way I write React components. The useState example is particularly clear.',
    true
),
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'Thanks for this comprehensive guide. I''ve been struggling with useEffect, but your explanation makes it much clearer.',
    true
),
(
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Excellent breakdown of API best practices. The error handling section is especially useful.',
    true
);

-- Insert sample contact messages
INSERT INTO contact_messages (name, email, subject, message, status) VALUES
(
    'Alice Cooper',
    'alice@example.com',
    'Project Collaboration',
    'Hi! I came across your portfolio and I''m really impressed with your work. I have a project that might be a good fit for your skills. Would you be interested in discussing it further?',
    'new'
),
(
    'Bob Wilson',
    'bob@startup.com',
    'Freelance Opportunity',
    'We''re a startup looking for a freelance developer to help us build our MVP. Your experience with React and Node.js looks perfect for our needs. Can we schedule a call?',
    'read'
),
(
    'Sarah Davis',
    'sarah@company.com',
    'Speaking Engagement',
    'We''re organizing a tech meetup next month and would love to have you as a speaker. Your blog posts about React hooks are fantastic! Would you be available?',
    'replied'
);

-- Insert sample newsletter subscriptions
INSERT INTO newsletter_subscriptions (email, name, status, confirmed_at) VALUES
('subscriber1@example.com', 'Alex Johnson', 'subscribed', NOW() - INTERVAL '30 days'),
('subscriber2@example.com', 'Emma Brown', 'subscribed', NOW() - INTERVAL '15 days'),
('subscriber3@example.com', 'David Lee', 'subscribed', NOW() - INTERVAL '5 days'),
('unsubscribed@example.com', 'Former Subscriber', 'unsubscribed', NOW() - INTERVAL '60 days');

-- Insert sample media assets
INSERT INTO media_assets (filename, original_filename, url, file_type, file_size, mime_type, width, height, alt_text, uploaded_by) VALUES
(
    'profile-avatar.jpg',
    'my-photo.jpg',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300',
    'jpg',
    45000,
    'image/jpeg',
    300,
    300,
    'Profile photo of John Doe',
    '00000000-0000-0000-0000-000000000001'
),
(
    'project-screenshot-1.png',
    'ecommerce-homepage.png',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600',
    'png',
    120000,
    'image/png',
    800,
    600,
    'E-commerce platform homepage screenshot',
    '00000000-0000-0000-0000-000000000001'
);

-- Insert sample analytics events
INSERT INTO analytics_events (event_type, page_path, user_agent, device_type, browser, os, metadata) VALUES
('page_view', '/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'desktop', 'Chrome', 'macOS', '{"referrer": "https://google.com"}'),
('page_view', '/blog', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)', 'mobile', 'Safari', 'iOS', '{"referrer": "https://twitter.com"}'),
('page_view', '/projects', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'desktop', 'Firefox', 'Windows', '{"referrer": "direct"}'),
('page_view', '/blog/getting-started-with-react-hooks', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'desktop', 'Chrome', 'macOS', '{"referrer": "https://dev.to"}'),
('contact_form_submit', '/contact', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'desktop', 'Chrome', 'macOS', '{"form_type": "contact"}');

-- Update search vectors for blog posts
UPDATE blog_posts SET search_vector = to_tsvector('english', title || ' ' || content || ' ' || excerpt || ' ' || array_to_string(tags, ' '));

-- Create some sample notifications
INSERT INTO notifications (recipient_id, title, message, type, action_url, metadata) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'New Comment',
    'Jane Smith commented on your post "Getting Started with React Hooks"',
    'info',
    '/blog/getting-started-with-react-hooks#comment-1',
    '{"comment_id": "1", "post_id": "10000000-0000-0000-0000-000000000001"}'
),
(
    '00000000-0000-0000-0000-000000000001',
    'New Contact Message',
    'New message from Alice Cooper (alice@example.com)',
    'info',
    '/admin/messages',
    '{"message_id": "1", "sender_name": "Alice Cooper"}'
);

-- Set some posts to have view counts
UPDATE blog_posts SET view_count = 1250 WHERE slug = 'getting-started-with-react-hooks';
UPDATE blog_posts SET view_count = 890 WHERE slug = 'building-scalable-apis-nodejs-express';
UPDATE blog_posts SET view_count = 645 WHERE slug = 'css-grid-vs-flexbox-when-to-use-each';