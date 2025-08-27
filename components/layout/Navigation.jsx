'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navigation data - this could be imported from a config file or API
const defaultNavigationData = {
  "main": [
    { "name": "Projects", "url": "/projects/", "weight": 15 },
    { "name": "Teaching & Learning", "url": "/teaching-learning/", "weight": 10 },
    { "name": "Tools", "url": "/tools/", "weight": 20 },
    { "name": "Blog", "url": "/blog", "weight": 25 },
    { "name": "Writing", "url": "/writing/", "weight": 30 },
    { "name": "Photography", "url": "/photography/", "weight": 40 },
    { "name": "About", "url": "/me/", "weight": 50 }
  ]
};

export function Navigation({ isMobile = false, onLinkClick, pathname: propPathname }) {
  const [navigationData, setNavigationData] = useState(defaultNavigationData);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const routerPathname = usePathname();
  const pathname = propPathname || routerPathname;
  const navRef = useRef(null);

  // Load navigation data
  useEffect(() => {
    const loadNavigationData = async () => {
      try {
        const response = await fetch('/data/navigation.json');
        if (response.ok) {
          const data = await response.json();
          setNavigationData(data);
        }
      } catch (error) {
        // Failed to load navigation data, using fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadNavigationData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (!isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobile]);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Check if current path matches navigation item
  const isActive = (url) => {
    if (url === '/' && pathname === '/') return true;
    if (url !== '/' && pathname?.startsWith(url.replace(/\/$/, ''))) return true;
    return false;
  };

  const handleLinkClick = (url) => {
    if (onLinkClick) {
      onLinkClick();
    }
    setIsOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <nav className="site-nav" aria-label="Main navigation">
        <ul className={isMobile ? 'flex flex-col space-y-2' : 'hidden lg:flex items-center space-x-1'}>
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i}>
              <div className={`animate-pulse bg-gray-300 rounded h-8 ${
                isMobile ? 'w-full' : 'w-24'
              }`} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // Sort navigation items by weight
  const sortedNavItems = navigationData.main?.sort((a, b) => a.weight - b.weight) || [];

  // Mobile version
  if (isMobile) {
    return (
      <nav className="site-nav" aria-label="Main navigation">
        <ul className="flex flex-col space-y-2">
          {sortedNavItems.map((item) => {
            const isActiveLink = isActive(item.url);
            
            return (
              <li key={item.url}>
                <Link
                  href={item.url}
                  className={`
                    block w-full px-4 py-3 rounded-lg text-left transition-all duration-200 ease-in-out
                    ${
                      isActiveLink
                        ? 'active text-blue-600 bg-blue-50 font-medium'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }
                  `}
                  onClick={() => handleLinkClick(item.url)}
                  title={`Visit ${item.name} section`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  // Desktop version
  return (
    <nav ref={navRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center space-x-1">
        {sortedNavItems.map((item) => (
          <Link
            key={item.name}
            href={item.url}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              hover:bg-brand-surface-alt hover:text-brand-primary
              focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2
              ${isActive(item.url)
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-brand-text-secondary hover:text-brand-text-primary'
              }
            `}
            onMouseEnter={() => setActiveItem(item.name)}
            onMouseLeave={() => setActiveItem(null)}
          >
            {item.name}
          </Link>
        ))}
      </div>

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden p-2 rounded-lg bg-brand-surface-alt hover:bg-brand-primary hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      <div 
        id="mobile-menu"
        className={`
          lg:hidden absolute right-0 top-full mt-2 w-64 bg-brand-surface rounded-lg border border-brand-border shadow-xl
          transition-all duration-200 transform origin-top-right z-50
          ${isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
        `}
      >
        <div className="p-2">
          {sortedNavItems.map((item, index) => (
            <Link
              key={item.name}
              href={item.url}
              className={`
                block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                hover:bg-brand-surface-alt hover:text-brand-primary
                focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-inset
                ${isActive(item.url)
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-brand-text-secondary hover:text-brand-text-primary'
                }
              `}
              style={{
                animationDelay: `${index * 50}ms`
              }}
              onClick={() => handleLinkClick(item.url)}
            >
              <div className="flex items-center justify-between">
                <span>{item.name}</span>
                {isActive(item.url) && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </Link>
          ))}
          
          {/* Mobile menu footer */}
          <div className="mt-4 pt-4 border-t border-brand-border">
            <p className="px-4 text-xs text-brand-text-muted">
              Brandon JP Lambert • Educator & Developer
            </p>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </nav>
  );
}

export default Navigation;