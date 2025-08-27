'use client';

import { useState, useEffect } from 'react';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { ThemeToggle } from './ThemeToggle';

export function Layout({ children }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('light');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    
    // Get initial theme
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="animate-pulse">
          <div className="h-20 bg-brand-surface"></div>
          <div className="container mx-auto px-4 py-8">
            <div className="h-64 bg-brand-surface-alt rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'dark' : ''
    }`}>
      {/* Skip to content for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 bg-brand-primary text-white px-4 py-2 rounded-br-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        Skip to main content
      </a>

      {/* Header with Navigation */}
      <header className="sticky top-0 z-40 bg-brand-surface/95 backdrop-blur-sm border-b border-brand-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">BL</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-brand-text-primary">
                  Brandon JP Lambert
                </h1>
                <p className="text-sm text-brand-text-secondary">
                  Educator & Developer
                </p>
              </div>
            </div>

            {/* Navigation and Theme Toggle */}
            <div className="flex items-center space-x-6">
              <Navigation />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 bg-brand-bg">
        {/* Content wrapper with consistent spacing */}
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}