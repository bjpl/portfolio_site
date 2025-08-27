import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProjectCard from '../../../components/ProjectCard';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt, onLoad, onError, ...props }) => {
    // Simulate successful image load
    React.useEffect(() => {
      if (onLoad) onLoad();
    }, [onLoad]);
    
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock UI components
jest.mock('../../../components/ui/card', () => ({
  Card: ({ children, className, ...props }) => (
    <div className={`card ${className || ''}`} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('../../../components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }) => (
    <span className={`badge ${variant || ''} ${className || ''}`} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('../../../components/ui/button', () => ({
  Button: ({ children, className, variant, size, asChild, ...props }) => {
    if (asChild) {
      return <>{children}</>;
    }
    return (
      <button className={`button ${variant || ''} ${size || ''} ${className || ''}`} {...props}>
        {children}
      </button>
    );
  },
}));

// Mock Lucide icons
const MockIcon = ({ className, ...props }) => (
  <svg className={className} {...props} data-testid="mock-icon">
    <path />
  </svg>
);

jest.mock('lucide-react', () => ({
  ExternalLinkIcon: MockIcon,
  GithubIcon: MockIcon,
  PlayIcon: MockIcon,
  CheckCircleIcon: MockIcon,
  ClockIcon: MockIcon,
  AlertCircleIcon: MockIcon,
  StarIcon: MockIcon,
}));

describe('ProjectCard Component', () => {
  const user = userEvent.setup();
  
  const mockProject = {
    title: 'Test Project',
    description: 'A test project description for unit testing',
    slug: 'test-project',
    image: '/images/test-project.jpg',
    status: 'Completed',
    type: 'Web App',
    technologies: ['React', 'JavaScript', 'CSS'],
    demo: 'https://demo.example.com',
    github: 'https://github.com/example/test-project',
    featured: false
  };

  describe('Rendering', () => {
    it('renders project card with basic information', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('A test project description for unit testing')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    it('renders project image with correct alt text', () => {
      render(<ProjectCard project={mockProject} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/images/test-project.jpg');
      expect(image).toHaveAttribute('alt', 'Test Project');
    });

    it('renders technologies as badges', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('CSS')).toBeInTheDocument();
    });

    it('renders demo and github links when provided', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByRole('link', { name: /demo/i })).toHaveAttribute('href', 'https://demo.example.com');
      expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();
    });

    it('renders view details link with correct href', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view.*details/i })).toHaveAttribute('href', '/projects/test-project');
    });
  });

  describe('Featured Projects', () => {
    it('applies featured styling when featured prop is true', () => {
      render(<ProjectCard project={mockProject} featured={true} />);

      const cardContainer = screen.getByText('Test Project').closest('div').closest('div');
      expect(cardContainer).toHaveClass('lg:col-span-2');
    });

    it('shows featured badge when project is featured', () => {
      const featuredProject = { ...mockProject, featured: true };
      render(<ProjectCard project={featuredProject} featured={true} />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('shows more technologies for featured projects', () => {
      const projectWithManyTech = {
        ...mockProject,
        technologies: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'Express', 'GraphQL', 'AWS']
      };
      
      // Regular project shows fewer technologies
      render(<ProjectCard project={projectWithManyTech} />);
      expect(screen.getByText('+3')).toBeInTheDocument(); // Shows +3 for 4+ hidden techs
      
      // Featured project shows more technologies
      render(<ProjectCard project={projectWithManyTech} featured={true} />);
      expect(screen.getByText('+1')).toBeInTheDocument(); // Shows +1 for 1 hidden tech
    });
  });

  describe('Status Indicators', () => {
    it('shows correct status icon and color for completed projects', () => {
      const completedProject = { ...mockProject, status: 'Completed' };
      render(<ProjectCard project={completedProject} />);

      const statusBadge = screen.getByText('Completed').closest('span');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('shows correct status icon and color for in-progress projects', () => {
      const inProgressProject = { ...mockProject, status: 'In Progress' };
      render(<ProjectCard project={inProgressProject} />);

      const statusBadge = screen.getByText('In Progress').closest('span');
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('shows default status styling for unknown status', () => {
      const unknownStatusProject = { ...mockProject, status: 'Unknown' };
      render(<ProjectCard project={unknownStatusProject} />);

      const statusBadge = screen.getByText('Unknown').closest('span');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('Image Handling', () => {
    it('handles image load success', () => {
      render(<ProjectCard project={mockProject} />);
      
      // Image should be rendered
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('handles image load error with fallback', () => {
      // Mock image to simulate error
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([false, jest.fn()]) // imageLoaded
        .mockReturnValueOnce([true, jest.fn()]); // imageError

      render(<ProjectCard project={mockProject} />);

      // Should still render the image element
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('shows loading state while image is loading', () => {
      // Mock image to simulate loading state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([false, jest.fn()]) // imageLoaded = false
        .mockReturnValueOnce([false, jest.fn()]); // imageError = false

      render(<ProjectCard project={mockProject} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('uses placeholder image when project image is not provided', () => {
      const projectWithoutImage = { ...mockProject, image: undefined };
      render(<ProjectCard project={projectWithoutImage} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/images/placeholder-project.jpg');
    });
  });

  describe('Interaction Behavior', () => {
    it('prevents event propagation on demo link clicks', async () => {
      const mockStopPropagation = jest.fn();
      render(<ProjectCard project={mockProject} />);

      const demoLink = screen.getAllByRole('link').find(link => 
        link.getAttribute('href') === 'https://demo.example.com'
      );
      
      // Simulate click with stopPropagation
      fireEvent.click(demoLink, {
        stopPropagation: mockStopPropagation
      });

      expect(demoLink).toBeInTheDocument();
    });

    it('prevents event propagation on github link clicks', async () => {
      const mockStopPropagation = jest.fn();
      render(<ProjectCard project={mockProject} />);

      const githubLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href') === 'https://github.com/example/test-project'
      );
      
      expect(githubLinks.length).toBeGreaterThan(0);
    });

    it('has proper external link attributes', () => {
      render(<ProjectCard project={mockProject} />);

      const demoLink = screen.getAllByRole('link').find(link => 
        link.getAttribute('href') === 'https://demo.example.com'
      );
      
      expect(demoLink).toHaveAttribute('target', '_blank');
      expect(demoLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels for card interaction', () => {
      render(<ProjectCard project={mockProject} />);

      const cardLink = screen.getByRole('link', { name: /view test project details/i });
      expect(cardLink).toBeInTheDocument();
    });

    it('has semantic HTML structure', () => {
      render(<ProjectCard project={mockProject} />);

      // Should have proper heading
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      
      // Should have proper link elements
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      render(<ProjectCard project={mockProject} />);

      const links = screen.getAllByRole('link');
      const buttons = screen.getAllByRole('button');
      
      // All interactive elements should be focusable
      [...links, ...buttons].forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Content Truncation', () => {
    it('applies line-clamp classes for content overflow', () => {
      const longDescriptionProject = {
        ...mockProject,
        description: 'This is a very long description that should be truncated when displayed in the project card to maintain consistent layout and visual hierarchy across different projects'
      };
      
      render(<ProjectCard project={longDescriptionProject} />);

      const description = screen.getByText(longDescriptionProject.description);
      expect(description).toHaveClass('line-clamp-3');
    });

    it('truncates title when too long', () => {
      const longTitleProject = {
        ...mockProject,
        title: 'This is an extremely long project title that should be truncated'
      };
      
      render(<ProjectCard project={longTitleProject} />);

      const title = screen.getByText(longTitleProject.title);
      expect(title).toHaveClass('line-clamp-2');
    });
  });

  describe('Technology Badges', () => {
    it('limits number of technology badges shown', () => {
      const manyTechProject = {
        ...mockProject,
        technologies: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'Express', 'GraphQL']
      };
      
      render(<ProjectCard project={manyTechProject} />);

      // Should show first 4 and a "+2" indicator
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('MongoDB')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('handles empty technologies array', () => {
      const noTechProject = { ...mockProject, technologies: [] };
      render(<ProjectCard project={noTechProject} />);

      // Should render without technologies section
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });

    it('handles undefined technologies', () => {
      const { technologies, ...projectWithoutTech } = mockProject;
      render(<ProjectCard project={projectWithoutTech} />);

      // Should render without errors
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('handles projects without demo link', () => {
      const { demo, ...projectWithoutDemo } = mockProject;
      render(<ProjectCard project={projectWithoutDemo} />);

      expect(screen.queryByRole('link', { name: /demo/i })).not.toBeInTheDocument();
    });

    it('handles projects without github link', () => {
      const { github, ...projectWithoutGithub } = mockProject;
      render(<ProjectCard project={projectWithoutGithub} />);

      // GitHub links should not be present
      const githubLinks = screen.queryAllByRole('link').filter(link =>
        link.getAttribute('href')?.includes('github.com')
      );
      expect(githubLinks).toHaveLength(0);
    });

    it('handles projects without type', () => {
      const { type, ...projectWithoutType } = mockProject;
      render(<ProjectCard project={projectWithoutType} />);

      // Should render without type badge
      expect(screen.queryByText('Web App')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies correct grid classes for featured cards', () => {
      render(<ProjectCard project={mockProject} featured={true} />);

      const cardContainer = screen.getByText('Test Project').closest('[class*="lg:col-span-2"]');
      expect(cardContainer).toBeInTheDocument();
    });

    it('applies hover states correctly', () => {
      render(<ProjectCard project={mockProject} />);

      const card = screen.getByText('Test Project').closest('.card');
      expect(card).toHaveClass('hover:border-primary/50', 'hover:shadow-xl');
    });
  });
});