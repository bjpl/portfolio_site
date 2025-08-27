'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const Navigation = ({ pathname, isMobile = false, onLinkClick }) => {
  const [navigationData, setNavigationData] = useState({ main: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load navigation data
    const loadNavigationData = async () => {
      try {
        const response = await fetch('/data/navigation.json');
        if (response.ok) {
          const data = await response.json();
          setNavigationData(data);
        } else {
          // Fallback navigation data
          setNavigationData({
            main: [
              { name: "Projects", url: "/projects/", weight: 15 },
              { name: "Teaching & Learning", url: "/teaching-learning/", weight: 10 },
              { name: "Tools", url: "/tools/", weight: 20 },
              { name: "Blog", url: "/blog", weight: 25 },
              { name: "Writing", url: "/writing/", weight: 30 },
              { name: "Photography", url: "/photography/", weight: 40 },
              { name: "About", url: "/me/", weight: 50 }
            ]
          });
        }
      } catch (error) {
        console.warn('Failed to load navigation data, using fallback:', error);
        // Fallback navigation data
        setNavigationData({
          main: [
            { name: "Projects", url: "/projects/", weight: 15 },
            { name: "Teaching & Learning", url: "/teaching-learning/", weight: 10 },
            { name: "Tools", url: "/tools/", weight: 20 },
            { name: "Blog", url: "/blog", weight: 25 },
            { name: "Writing", url: "/writing/", weight: 30 },
            { name: "Photography", url: "/photography/", weight: 40 },
            { name: "About", url: "/me/", weight: 50 }
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadNavigationData();
  }, []);

  const isActiveLink = (url) => {
    if (url === '/' && pathname === '/') return true;
    if (url !== '/' && pathname?.startsWith(url.replace(/\/$/, ''))) return true;
    return false;
  };

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  if (isLoading) {
    return (
      <nav className="site-nav" aria-label="Main navigation">
        <ul className={isMobile ? 'flex flex-col space-y-2' : 'flex space-x-6'}>
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

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <ul className={isMobile ? 'flex flex-col space-y-2' : 'flex space-x-6'}>
        {sortedNavItems.map((item) => {
          const isActive = isActiveLink(item.url);
          
          return (
            <li key={item.url}>
              <Link
                href={item.url}
                className={`
                  site-nav-link transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? 'active text-blue-600 bg-blue-50 font-medium'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }
                  ${
                    isMobile
                      ? 'block w-full px-4 py-3 rounded-lg text-left'
                      : 'px-3 py-2 rounded-lg text-sm font-medium'
                  }
                `}
                onClick={handleLinkClick}
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
};

export default Navigation;