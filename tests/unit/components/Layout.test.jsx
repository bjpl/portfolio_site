import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Layout } from '../../../components/Layout';

// Mock child components
jest.mock('../../../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>
}));

jest.mock('../../../components/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>
}));

jest.mock('../../../components/ThemeToggle', () => ({
  ThemeToggle: ({ theme, onToggle }) => (
    <button data-testid="theme-toggle" onClick={onToggle}>
      {theme} theme
    </button>
  )
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock matchMedia
global.matchMedia = jest.fn(() => ({
  matches: false,
  addListener: jest.fn(),
  removeListener: jest.fn(),
}));

describe('Layout Component', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    global.matchMedia.mockClear();
    
    // Mock document methods
    document.documentElement.setAttribute = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders layout structure correctly', async () => {
      render(
        <Layout>
          <div data-testid="children">Test content</div>
        </Layout>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument(); // header
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
        expect(screen.getByTestId('children')).toBeInTheDocument();
      });
    });

    it('renders skip to content link for accessibility', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const skipLink = screen.getByText('Skip to main content');
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute('href', '#main-content');
      });
    });

    it('renders brand logo and title', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByText('BL')).toBeInTheDocument();
        expect(screen.getByText('Brandon JP Lambert')).toBeInTheDocument();
        expect(screen.getByText('Educator & Developer')).toBeInTheDocument();
      });
    });

    it('includes navigation and theme toggle', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByTestId('navigation')).toBeInTheDocument();
        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Management', () => {
    it('initializes with light theme by default', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      global.matchMedia.mockReturnValue({ matches: false });

      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByText('light theme')).toBeInTheDocument();
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      });
    });

    it('initializes with dark theme when system prefers dark', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      global.matchMedia.mockReturnValue({ matches: true });

      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByText('dark theme')).toBeInTheDocument();
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      });
    });

    it('uses saved theme preference from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      global.matchMedia.mockReturnValue({ matches: false });

      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByText('dark theme')).toBeInTheDocument();
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      });
    });

    it('toggles theme when theme toggle is clicked', async () => {
      localStorageMock.getItem.mockReturnValue('light');

      render(<Layout><div>Content</div></Layout>);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('light theme')).toBeInTheDocument();
      });

      // Click theme toggle
      const themeToggle = screen.getByTestId('theme-toggle');
      await user.click(themeToggle);

      await waitFor(() => {
        expect(screen.getByText('dark theme')).toBeInTheDocument();
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      });
    });

    it('applies dark class to root element when dark theme is active', async () => {
      localStorageMock.getItem.mockReturnValue('dark');

      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const rootDiv = screen.getByRole('banner').closest('div');
        expect(rootDiv).toHaveClass('dark');
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton before hydration', () => {
      // Mock useState to simulate pre-hydration state
      const mockSetState = jest.fn();
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([false, mockSetState]) // mounted = false
        .mockReturnValueOnce(['light', jest.fn()]); // theme = light

      render(<Layout><div>Content</div></Layout>);

      // Should show loading skeleton
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });

    it('renders full layout after hydration', async () => {
      render(<Layout><div data-testid="content">Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
        expect(screen.queryByText('animate-pulse')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('hides brand text on small screens', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const brandText = screen.getByText('Brandon JP Lambert').closest('div');
        expect(brandText).toHaveClass('hidden', 'sm:block');
      });
    });

    it('maintains proper spacing and structure', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const header = screen.getByRole('banner');
        expect(header).toHaveClass('sticky', 'top-0', 'z-40');
        
        const main = screen.getByRole('main');
        expect(main).toHaveClass('flex-1');
        
        const container = main.querySelector('.container');
        expect(container).toHaveClass('mx-auto', 'px-4', 'py-8');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic HTML structure', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument(); // header
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
      });
    });

    it('provides skip navigation for keyboard users', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const skipLink = screen.getByText('Skip to main content');
        expect(skipLink).toHaveClass('sr-only');
        expect(skipLink).toHaveClass('focus:not-sr-only');
        expect(skipLink).toHaveClass('focus:absolute');
      });
    });

    it('has proper focus management', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const skipLink = screen.getByText('Skip to main content');
        expect(skipLink).toHaveClass('focus:outline-none', 'focus:ring-2');
      });
    });

    it('sets proper main content id for skip link', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('id', 'main-content');
      });
    });
  });

  describe('Visual Effects', () => {
    it('applies backdrop blur to header', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const header = screen.getByRole('banner');
        expect(header).toHaveClass('backdrop-blur-sm');
      });
    });

    it('applies gradient background to logo', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const logo = screen.getByText('BL').closest('div');
        expect(logo).toHaveClass('bg-gradient-to-br', 'from-brand-primary', 'to-brand-accent');
      });
    });

    it('includes transition effects', async () => {
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        const rootDiv = screen.getByRole('banner').closest('div');
        expect(rootDiv).toHaveClass('transition-colors', 'duration-300');
      });
    });
  });

  describe('Content Structure', () => {
    it('renders children within main content area', async () => {
      const testContent = <div data-testid="test-content">Test Content</div>;
      render(<Layout>{testContent}</Layout>);

      await waitFor(() => {
        const main = screen.getByRole('main');
        const content = screen.getByTestId('test-content');
        expect(main).toContainElement(content);
      });
    });

    it('maintains proper content hierarchy', async () => {
      render(
        <Layout>
          <h1>Page Title</h1>
          <p>Page content</p>
        </Layout>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByText('Page content')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => render(<Layout><div>Content</div></Layout>)).not.toThrow();
    });

    it('handles matchMedia errors gracefully', async () => {
      global.matchMedia = jest.fn(() => {
        throw new Error('matchMedia error');
      });

      expect(() => render(<Layout><div>Content</div></Layout>)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('prevents flash of unstyled content', async () => {
      render(<Layout><div>Content</div></Layout>);

      // Initially shows loading state
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
      
      // Then shows actual content after mount
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
      });
    });

    it('optimizes theme initialization', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(<Layout><div>Content</div></Layout>);

      await waitFor(() => {
        // Theme should be applied immediately after mount
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      });
    });
  });
});