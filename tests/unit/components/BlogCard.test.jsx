import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlogCard from '../../../components/BlogCard';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt, ...props }) => (
    <img src={src} alt={alt} {...props} />
  );
});

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}));

// Mock reading time utility
jest.mock('../../../utils/readingTime', () => ({
  getReadingTime: jest.fn(() => '5 min read'),
}));

import { formatDistanceToNow } from 'date-fns';
import { getReadingTime } from '../../../utils/readingTime';

describe('BlogCard Component', () => {
  const mockPost = {
    id: 1,
    title: 'Test Blog Post Title',
    excerpt: 'This is a test excerpt for the blog post that provides a brief summary of the content.',
    slug: 'test-blog-post',
    featured_image: '/images/blog/test-post.jpg',
    published_at: '2024-01-15T10:00:00.000Z',
    content: 'This is the full content of the blog post with more detailed information.',
    tags: ['React', 'Testing', 'JavaScript'],
    profiles: {
      username: 'testuser',
      full_name: 'Test Author',
      avatar_url: '/images/avatars/test-user.jpg'
    }
  };

  beforeEach(() => {
    formatDistanceToNow.mockReturnValue('2 days ago');
    getReadingTime.mockReturnValue('5 min read');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders blog card with basic information', () => {
      render(<BlogCard post={mockPost} />);

      expect(screen.getByText('Test Blog Post Title')).toBeInTheDocument();
      expect(screen.getByText('This is a test excerpt for the blog post that provides a brief summary of the content.')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
      expect(screen.getByText('5 min read')).toBeInTheDocument();
      expect(screen.getByText('2 days ago')).toBeInTheDocument();
    });

    it('renders featured image when provided', () => {
      render(<BlogCard post={mockPost} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/images/blog/test-post.jpg');
      expect(image).toHaveAttribute('alt', 'Test Blog Post Title');
    });

    it('renders without featured image when not provided', () => {
      const postWithoutImage = { ...mockPost, featured_image: null };
      render(<BlogCard post={postWithoutImage} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders blog post tags', () => {
      render(<BlogCard post={mockPost} />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('creates correct blog post links', () => {
      render(<BlogCard post={mockPost} />);

      const titleLink = screen.getByRole('link', { name: /test blog post title/i });
      expect(titleLink).toHaveAttribute('href', '/blog/test-blog-post');

      const imageLink = screen.getByRole('link', { name: '' }); // Image link has no text
      expect(imageLink).toHaveAttribute('href', '/blog/test-blog-post');
    });
  });

  describe('Author Information', () => {
    it('displays author avatar when available', () => {
      render(<BlogCard post={mockPost} />);

      const avatar = screen.getByRole('img', { name: /test author/i });
      expect(avatar).toHaveAttribute('src', '/images/avatars/test-user.jpg');
      expect(avatar).toHaveAttribute('alt', 'Test Author');
    });

    it('displays author initials when avatar is not available', () => {
      const postWithoutAvatar = {
        ...mockPost,
        profiles: {
          username: 'testuser',
          full_name: 'Test Author',
          avatar_url: null
        }
      };
      
      render(<BlogCard post={postWithoutAvatar} />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First initial
    });

    it('handles missing author gracefully', () => {
      const postWithoutAuthor = { ...mockPost, profiles: null };
      render(<BlogCard post={postWithoutAuthor} />);

      expect(screen.getByText('Anonymous')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument(); // Anonymous initial
    });

    it('falls back to username when full_name is not available', () => {
      const postWithUsernameOnly = {
        ...mockPost,
        profiles: {
          username: 'testuser',
          full_name: null,
          avatar_url: null
        }
      };
      
      render(<BlogCard post={postWithUsernameOnly} />);

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });

  describe('Tags Display', () => {
    it('shows up to 3 tags', () => {
      render(<BlogCard post={mockPost} />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('shows "+X more" indicator when there are more than 3 tags', () => {
      const postWithManyTags = {
        ...mockPost,
        tags: ['React', 'Testing', 'JavaScript', 'TypeScript', 'Node.js', 'GraphQL']
      };
      
      render(<BlogCard post={postWithManyTags} />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('+3 more')).toBeInTheDocument();
    });

    it('handles empty tags array', () => {
      const postWithoutTags = { ...mockPost, tags: [] };
      render(<BlogCard post={postWithoutTags} />);

      // Should not render tags section
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });

    it('handles undefined tags', () => {
      const postWithUndefinedTags = { ...mockPost, tags: undefined };
      render(<BlogCard post={postWithUndefinedTags} />);

      // Should render without errors
      expect(screen.getByText('Test Blog Post Title')).toBeInTheDocument();
    });
  });

  describe('Date and Time Formatting', () => {
    it('calls formatDistanceToNow with correct parameters', () => {
      render(<BlogCard post={mockPost} />);

      expect(formatDistanceToNow).toHaveBeenCalledWith(
        new Date('2024-01-15T10:00:00.000Z'),
        { addSuffix: true }
      );
    });

    it('displays formatted date in time element', () => {
      render(<BlogCard post={mockPost} />);

      const timeElement = screen.getByText('2 days ago');
      expect(timeElement.tagName).toBe('TIME');
      expect(timeElement).toHaveAttribute('dateTime', '2024-01-15T10:00:00.000Z');
    });

    it('includes title attribute with readable date', () => {
      render(<BlogCard post={mockPost} />);

      const timeElement = screen.getByText('2 days ago');
      expect(timeElement).toHaveAttribute('title');
    });

    it('calls getReadingTime with post content', () => {
      render(<BlogCard post={mockPost} />);

      expect(getReadingTime).toHaveBeenCalledWith(mockPost.content);
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive image sizing', () => {
      render(<BlogCard post={mockPost} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw');
    });

    it('has responsive text truncation classes', () => {
      render(<BlogCard post={mockPost} />);

      const title = screen.getByText('Test Blog Post Title');
      expect(title.closest('a')).toHaveClass('line-clamp-2');

      const excerpt = screen.getByText(/this is a test excerpt/i);
      expect(excerpt).toHaveClass('line-clamp-3');
    });
  });

  describe('Hover Effects', () => {
    it('applies hover classes for interactive elements', () => {
      render(<BlogCard post={mockPost} />);

      const article = screen.getByRole('article');
      expect(article).toHaveClass('group', 'hover:shadow-xl', 'transition-all');

      const title = screen.getByText('Test Blog Post Title');
      expect(title.closest('h2')).toHaveClass('group-hover:text-blue-600');
    });

    it('applies image hover transform', () => {
      render(<BlogCard post={mockPost} />);

      const image = screen.getByRole('img');
      expect(image).toHaveClass('group-hover:scale-105', 'transition-transform');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      render(<BlogCard post={mockPost} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByRole('time')).toBeInTheDocument();
    });

    it('provides proper link descriptions', () => {
      render(<BlogCard post={mockPost} />);

      const titleLink = screen.getByRole('link', { name: /test blog post title/i });
      expect(titleLink).toBeInTheDocument();
    });

    it('includes proper image alt text', () => {
      render(<BlogCard post={mockPost} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Test Blog Post Title');
    });

    it('provides accessible author information', () => {
      render(<BlogCard post={mockPost} />);

      const authorImage = screen.getByRole('img', { name: /test author/i });
      expect(authorImage).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes', () => {
      render(<BlogCard post={mockPost} />);

      const article = screen.getByRole('article');
      expect(article).toHaveClass('dark:bg-gray-800');

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('dark:text-white', 'dark:group-hover:text-blue-400');
    });

    it('applies dark mode classes to tags', () => {
      render(<BlogCard post={mockPost} />);

      const reactTag = screen.getByText('React');
      expect(reactTag).toHaveClass('dark:bg-blue-900', 'dark:text-blue-200');
    });

    it('applies dark mode classes to meta information', () => {
      render(<BlogCard post={mockPost} />);

      const authorName = screen.getByText('Test Author');
      const metaContainer = authorName.closest('div').parentElement;
      expect(metaContainer).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Content Handling', () => {
    it('handles missing excerpt gracefully', () => {
      const postWithoutExcerpt = { ...mockPost, excerpt: null };
      render(<BlogCard post={postWithoutExcerpt} />);

      expect(screen.getByText('Test Blog Post Title')).toBeInTheDocument();
      // Should not crash or display empty excerpt section
    });

    it('handles empty excerpt gracefully', () => {
      const postWithEmptyExcerpt = { ...mockPost, excerpt: '' };
      render(<BlogCard post={postWithEmptyExcerpt} />);

      expect(screen.getByText('Test Blog Post Title')).toBeInTheDocument();
    });

    it('handles missing content for reading time', () => {
      const postWithoutContent = { ...mockPost, content: null };
      render(<BlogCard post={postWithoutContent} />);

      expect(getReadingTime).toHaveBeenCalledWith(null);
    });
  });

  describe('Performance', () => {
    it('uses proper image optimization attributes', () => {
      render(<BlogCard post={mockPost} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('sizes');
      // Next.js Image component should handle optimization
    });

    it('applies efficient CSS classes for animations', () => {
      render(<BlogCard post={mockPost} />);

      const article = screen.getByRole('article');
      expect(article).toHaveClass('transition-all', 'duration-300');

      const image = screen.getByRole('img');
      expect(image).toHaveClass('transition-transform', 'duration-300');
    });
  });
});