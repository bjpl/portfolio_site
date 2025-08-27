'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle({ 
  theme: propTheme, 
  onToggle, 
  variant = "default", // "default", "enhanced", "simple"
  size = "default" // "sm", "default", "lg"
}) {
  const [theme, setTheme] = useState(propTheme || 'light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (!propTheme) {
      // Auto-detect theme if not provided
      const savedTheme = localStorage.getItem('theme') || 'system';
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      setTheme(propTheme);
    }
  }, [propTheme]);

  const applyTheme = (newTheme) => {
    const root = window.document.documentElement;
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
      root.setAttribute('data-theme', newTheme);
    }
  };

  const toggleTheme = () => {
    if (onToggle) {
      // Use external toggle handler
      onToggle();
    } else {
      // Internal toggle logic for enhanced variant
      const themes = variant === "enhanced" ? ['light', 'dark', 'system'] : ['light', 'dark'];
      const currentIndex = themes.indexOf(theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      
      setTheme(nextTheme);
      localStorage.setItem('theme', nextTheme);
      applyTheme(nextTheme);
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light': return Sun;
      case 'dark': return Moon;
      case 'system': return Monitor;
      default: return Sun;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light': return 'Light mode';
      case 'dark': return 'Dark mode';
      case 'system': return 'System preference';
      default: return 'Light mode';
    }
  };

  const getThemeColor = () => {
    switch (theme) {
      case 'light': return '#fbbf24';
      case 'dark': return '#6366f1';
      case 'system': return '#10b981';
      default: return '#fbbf24';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8 p-1.5';
      case 'lg': return 'w-12 h-12 p-3';
      default: return 'w-10 h-10 p-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  if (!mounted) {
    return (
      <div className={`${getSizeClasses()} rounded-lg bg-brand-surface-alt/50 animate-pulse`} />
    );
  }

  // Enhanced variant with animations and system theme support
  if (variant === "enhanced") {
    const Icon = getIcon();

    return (
      <motion.button
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative ${getSizeClasses()} rounded-lg bg-brand-surface-alt/50 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface-alt/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent`}
        aria-label={getLabel()}
        title={getLabel()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Icon className={getIconSize()} />
          </motion.div>
        </AnimatePresence>
        
        {/* Theme indicator dot */}
        <motion.div
          className={`absolute -top-1 -right-1 ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} rounded-full shadow-lg`}
          style={{ backgroundColor: getThemeColor() }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>
    );
  }

  // Simple variant - just icon toggle
  if (variant === "simple") {
    return (
      <button
        onClick={toggleTheme}
        className={`${getSizeClasses()} rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent`}
        title={getLabel()}
        aria-label={getLabel()}
      >
        {theme === 'light' ? (
          <Moon className={getIconSize()} />
        ) : (
          <Sun className={getIconSize()} />
        )}
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={toggleTheme}
      className={`${getSizeClasses()} rounded-lg bg-brand-surface-alt hover:bg-brand-primary hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        // Moon icon for dark mode
        <svg 
          className={`${getIconSize()} text-gray-600 hover:text-blue-600 transition-colors`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg 
          className={`${getIconSize()} text-yellow-500 hover:text-yellow-400 transition-colors`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;