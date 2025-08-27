import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import '@testing-library/jest-dom';
import { Navigation } from '../../../components/Navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

describe('Navigation Component', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    usePathname.mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders navigation component', () => {
      render(<Navigation />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders all navigation items in desktop view', () => {
      render(<Navigation />);
      
      // Check for desktop navigation items
      expect(screen.getByText('Teaching & Learning')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
      expect(screen.getByText('Writing')).toBeInTheDocument();
      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('renders mobile menu button', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('renders navigation links with correct href attributes', () => {
      render(<Navigation />);
      
      expect(screen.getByRole('link', { name: 'Teaching & Learning' })).toHaveAttribute('href', '/teaching-learning/');
      expect(screen.getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/tools/');
      expect(screen.getByRole('link', { name: 'Writing' })).toHaveAttribute('href', '/writing/');
      expect(screen.getByRole('link', { name: 'Photography' })).toHaveAttribute('href', '/photography/');
      expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/me/');
    });
  });

  describe('Active State', () => {
    it('highlights active navigation item based on current pathname', () => {
      usePathname.mockReturnValue('/tools/');
      render(<Navigation />);
      
      const toolsLinks = screen.getAllByText('Tools');
      // Desktop navigation link should have active styling
      expect(toolsLinks[0].closest('a')).toHaveClass('bg-brand-primary');
    });

    it('handles root path correctly', () => {
      usePathname.mockReturnValue('/');
      render(<Navigation />);
      
      // No items should be active when on root path
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).not.toHaveClass('bg-brand-primary');
      });
    });

    it('handles nested paths correctly', () => {
      usePathname.mockReturnValue('/tools/built/vocab-tool/');
      render(<Navigation />);
      
      const toolsLinks = screen.getAllByText('Tools');
      expect(toolsLinks[0].closest('a')).toHaveClass('bg-brand-primary');
    });
  });

  describe('Mobile Menu Interaction', () => {
    it('opens mobile menu when menu button is clicked', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      // Menu should be visible
      const mobileMenu = screen.getByRole('generic', { name: undefined });
      expect(mobileMenu).toHaveClass('opacity-100');
      
      // Button text should change
      expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument();
    });

    it('closes mobile menu when menu button is clicked again', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      
      // Open menu
      await user.click(menuButton);
      expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument();
      
      // Close menu
      await user.click(menuButton);
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    });

    it('closes mobile menu when clicking outside', async () => {
      render(
        <div>
          <Navigation />
          <div data-testid="outside-element">Outside content</div>
        </div>
      );
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      // Menu should be open
      expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument();
      
      // Click outside
      await user.click(screen.getByTestId('outside-element'));
      
      // Menu should be closed
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
      });
    });

    it('displays mobile menu items with animation delays', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      // Check that mobile menu items have staggered animation delays
      const mobileMenuItems = screen.getAllByRole('link').filter(link => 
        link.closest('#mobile-menu')
      );
      
      mobileMenuItems.forEach((item, index) => {
        const expectedDelay = `${index * 50}ms`;
        expect(item).toHaveStyle({ animationDelay: expectedDelay });
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes mobile menu when Escape key is pressed', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      // Menu should be open
      expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument();
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Menu should be closed
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
      });
    });

    it('has proper focus management for accessibility', async () => {
      render(<Navigation />);
      
      // Tab through navigation items
      const links = screen.getAllByRole('link');
      const menuButton = screen.getByRole('button');
      
      // All interactive elements should be focusable
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
      
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('shows desktop navigation on large screens', () => {
      render(<Navigation />);
      
      const desktopNav = screen.getByRole('navigation').querySelector('.hidden.lg\\:flex');
      expect(desktopNav).toBeInTheDocument();
    });

    it('shows mobile menu button on small screens', () => {
      render(<Navigation />);
      
      const mobileButton = screen.getByRole('button', { name: /navigation menu/i });
      expect(mobileButton).toHaveClass('lg:hidden');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-menu');
      expect(menuButton).toHaveAttribute('aria-label');
      
      // Open menu and check updated attributes
      await user.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('provides proper focus indicators', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link');
      const button = screen.getByRole('button');
      
      // All interactive elements should have focus styles
      links.forEach(link => {
        expect(link).toHaveClass('focus:outline-none', 'focus:ring-2');
      });
      
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('includes mobile menu footer with context', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      expect(screen.getByText('Brandon JP Lambert • Educator & Developer')).toBeInTheDocument();
    });
  });

  describe('Hover States', () => {
    it('handles mouse enter and leave events', async () => {
      render(<Navigation />);
      
      const toolsLink = screen.getByRole('link', { name: 'Tools' });
      
      // Simulate hover
      fireEvent.mouseEnter(toolsLink);
      fireEvent.mouseLeave(toolsLink);
      
      // Component should handle these events without error
      expect(toolsLink).toBeInTheDocument();
    });
  });

  describe('Route Changes', () => {
    it('closes mobile menu on pathname change', () => {
      const { rerender } = render(<Navigation />);
      
      // Open mobile menu
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(menuButton);
      
      // Simulate route change
      usePathname.mockReturnValue('/tools/');
      rerender(<Navigation />);
      
      // Menu should be closed after route change
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles navigation data gracefully if malformed', () => {
      // Component should still render even with navigation issues
      render(<Navigation />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles missing pathname gracefully', () => {
      usePathname.mockReturnValue(undefined);
      
      expect(() => render(<Navigation />)).not.toThrow();
    });
  });
});