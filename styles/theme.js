/**
 * Theme Configuration for Portfolio Site
 * Provides comprehensive theme system with light/dark modes
 * and responsive design tokens
 */

export const themeConfig = {
  // Color Palette - Professional & Modern
  colors: {
    // Light Mode Colors
    light: {
      bg: '#F5F5F7',           // Soft White-Gray
      surface: '#FFFFFF',       // Pure White
      surfaceAlt: '#E8F4FD',   // Pale Blue Tint
      textPrimary: '#2C3E50',   // Deep Blue-Gray
      textSecondary: '#475569', // Medium Gray
      textMuted: '#94A3B8',     // Light Gray
      textAccent: '#2C3E50',    // Deep Blue-Gray
      
      primary: '#4A90E2',       // Friendly Sky Blue
      primaryHover: '#3A7FD2',  // Darker Sky Blue
      primaryLight: '#E8F4FD',  // Very Light Blue
      primaryDark: '#3A6FB0',   // Dark Sky Blue
      
      accent: '#FFB84D',        // Warm Amber
      accentLight: '#FFC66D',   // Light Amber
      accentDark: '#E5A043',    // Dark Amber
      
      success: '#7FBA00',       // Fresh Green
      warning: '#FFB84D',       // Warm Amber
      error: '#EF4444',         // Red
      info: '#4A90E2',          // Sky Blue
      
      border: '#E2E8F0',        // Light Border
      borderLight: '#F1F5F9',   // Very Light Border
      borderFocus: '#4A90E2'    // Primary Focus
    },
    
    // Dark Mode Colors
    dark: {
      bg: '#0A0B0D',            // Very Dark Blue-Black
      surface: '#141519',       // Dark Surface
      surfaceAlt: '#1E1F26',    // Alternate Dark Surface
      textPrimary: '#F7F8FA',   // Near White
      textSecondary: '#B8BCC8', // Medium Light Gray
      textMuted: '#868B98',     // Muted Gray
      textAccent: '#D1D5DB',    // Light Gray
      
      primary: '#5BA3F5',       // Lighter Sky Blue
      primaryHover: '#6BB0FF',  // Bright Blue
      primaryLight: 'rgba(74, 144, 226, 0.15)', // Transparent Blue
      primaryDark: '#4A90E2',   // Standard Blue
      
      accent: '#FFCA6D',        // Lighter Warm Amber
      accentLight: '#FFD584',   // Light Amber
      accentDark: '#FFB84D',    // Standard Amber
      
      success: '#8FCA00',       // Lighter Fresh Green
      warning: '#FFCA6D',       // Lighter Amber
      error: '#F87171',         // Light Red
      info: '#5BA3F5',          // Lighter Blue
      
      border: 'rgba(255, 255, 255, 0.08)',  // Transparent Border
      borderLight: 'rgba(255, 255, 255, 0.04)', // Very Light Transparent
      borderFocus: '#5BA3F5'    // Primary Focus
    }
  },

  // Typography Scale
  typography: {
    fontFamilies: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
      serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
      mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace"
    },
    
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem'  // 60px
    },
    
    lineHeights: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    },
    
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900
    }
  },

  // Spacing Scale (consistent with Tailwind)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem'    // 96px
  },

  // Border Radius Scale
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px'
  },

  // Shadow System
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    
    // Dark mode shadows
    dark: {
      xs: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)'
    }
  },

  // Animation & Transition System
  animations: {
    durations: {
      fast: '150ms',
      base: '250ms',
      slow: '350ms',
      slower: '500ms'
    },
    
    easings: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    },
    
    keyframes: {
      fadeIn: {
        '0%': { opacity: 0 },
        '100%': { opacity: 1 }
      },
      
      slideUp: {
        '0%': { transform: 'translateY(10px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 }
      },
      
      slideDown: {
        '0%': { transform: 'translateY(-10px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 }
      },
      
      scaleIn: {
        '0%': { transform: 'scale(0.95)', opacity: 0 },
        '100%': { transform: 'scale(1)', opacity: 1 }
      },
      
      pulse: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 }
      },
      
      spin: {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    }
  },

  // Responsive Breakpoints (matching Tailwind defaults)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  },

  // Component-specific configurations
  components: {
    button: {
      sizes: {
        sm: {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          minHeight: '2rem'
        },
        md: {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          minHeight: '2.5rem'
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          minHeight: '3rem'
        }
      },
      
      variants: {
        primary: {
          bg: 'var(--color-primary)',
          color: 'white',
          hoverBg: 'var(--color-primary-hover)'
        },
        secondary: {
          bg: 'transparent',
          color: 'var(--color-primary)',
          border: '2px solid var(--color-primary)',
          hoverBg: 'var(--color-primary)',
          hoverColor: 'white'
        },
        accent: {
          bg: 'var(--color-accent)',
          color: 'white',
          hoverBg: 'var(--color-accent-dark)'
        }
      }
    },

    card: {
      padding: 'var(--space-xl)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-border)',
      hoverTransform: 'translateY(-4px)',
      hoverShadow: 'var(--shadow-lg)'
    },

    input: {
      padding: '0.875rem 1rem',
      borderRadius: 'var(--radius-lg)',
      border: '2px solid var(--color-border)',
      focusBorder: 'var(--color-primary)',
      focusShadow: '0 0 0 3px rgba(74, 144, 226, 0.1)'
    }
  }
};

// Theme utility functions
export const themeUtils = {
  // Get CSS variable value
  getCSSVar: (varName) => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
    }
    return null;
  },

  // Set CSS variable value
  setCSSVar: (varName, value) => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty(varName, value);
    }
  },

  // Toggle theme
  toggleTheme: () => {
    if (typeof window !== 'undefined') {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      return newTheme;
    }
  },

  // Initialize theme from localStorage or system preference
  initializeTheme: () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      
      document.documentElement.setAttribute('data-theme', theme);
      return theme;
    }
    return 'light';
  },

  // Get current theme
  getCurrentTheme: () => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
    return 'light';
  },

  // Apply theme transition class temporarily
  enableThemeTransition: () => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.add('theme-transition');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 500);
    }
  }
};

export default themeConfig;