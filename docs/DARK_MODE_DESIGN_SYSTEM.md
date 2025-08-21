# Dark Mode Design System Documentation

## Color Token Definitions

### Primary Color System

Our color system is built on semantic tokens that automatically adapt between light and dark themes through CSS custom properties.

#### Base Color Tokens
```scss
// Light Theme Base Colors
:root {
  --color-bg: #F5F5F7;              // Soft White-Gray - main background
  --color-surface: #FFFFFF;         // Pure White - card/modal backgrounds  
  --color-surface-alt: #E8F4FD;     // Pale Blue Tint - section backgrounds
}

// Dark Theme Base Colors  
[data-theme="dark"] {
  --color-bg: #0A0B0D;              // Deep Dark - main background
  --color-surface: #141519;         // Dark Surface - card/modal backgrounds
  --color-surface-alt: #1E1F26;     // Elevated Surface - section backgrounds
}
```

#### Text Color Hierarchy
```scss
// Light Theme Text
:root {
  --color-text-primary: #2C3E50;    // Deep Blue-Gray - headers, important text
  --color-text-secondary: #475569;  // Medium Gray - body text, descriptions
  --color-text-muted: #94A3B8;      // Light Gray - captions, metadata
  --color-text-accent: #2C3E50;     // Same as primary for consistency
}

// Dark Theme Text (Higher contrast for readability)
[data-theme="dark"] {
  --color-text-primary: #F7F8FA;    // Near White - headers, important text
  --color-text-secondary: #B8BCC8;  // Light Gray - body text, descriptions  
  --color-text-muted: #868B98;      // Medium Gray - captions, metadata
  --color-text-accent: #D1D5DB;     // Light accent for highlights
}
```

#### Brand Color System
```scss
// Primary Brand Colors (Sky Blue Family)
:root {
  --color-primary: #4A90E2;         // Main brand color
  --color-primary-hover: #3A7FD2;   // Hover state
  --color-primary-light: #E8F4FD;   // Background tints
  --color-primary-dark: #3A6FB0;    // Active states
}

[data-theme="dark"] {
  --color-primary: #5BA3F5;         // Brighter for dark backgrounds
  --color-primary-hover: #6BB0FF;   // Even brighter on hover
  --color-primary-light: rgba(74, 144, 226, 0.15);  // Transparent overlay
  --color-primary-dark: #4A90E2;    // Slightly darker for contrast
}

// Accent Colors (Warm Amber Family)
:root {
  --color-accent: #FFB84D;          // Warm amber for highlights
  --color-accent-light: #FFC66D;    // Light amber
  --color-accent-dark: #E5A043;     // Dark amber
}

[data-theme="dark"] {
  --color-accent: #FFCA6D;          // Brighter amber for dark mode
  --color-accent-light: #FFD584;    // Light bright amber
  --color-accent-dark: #FFB84D;     // Maintains warmth
}
```

#### Semantic Color System
```scss
// Semantic Colors for Status/Feedback
:root {
  --color-success: #7FBA00;         // Fresh Green - achievements, success states
  --color-warning: #FFB84D;         // Warm Amber - warnings, attention
  --color-error: #EF4444;           // Red - errors, destructive actions
  --color-info: #4A90E2;            // Sky Blue - information, neutral actions
}

[data-theme="dark"] {
  --color-success: #8FCA00;         // Brighter green for visibility
  --color-warning: #FFCA6D;         // Brighter amber
  --color-error: #F87171;           // Softer red for dark backgrounds
  --color-info: #5BA3F5;            // Consistent with primary
}
```

#### Border & Divider System
```scss
// Light Theme Borders
:root {
  --color-border: #E2E8F0;          // Standard borders, dividers
  --color-border-light: #F1F5F9;    // Subtle dividers, section breaks
  --color-border-focus: var(--color-primary);  // Focus indicators
}

// Dark Theme Borders (Semi-transparent for natural blending)
[data-theme="dark"] {
  --color-border: rgba(255, 255, 255, 0.08);     // Subtle visibility
  --color-border-light: rgba(255, 255, 255, 0.04);  // Very subtle
  --color-border-focus: var(--color-primary);     // Bright focus
}
```

## Elevation System

### Shadow Definitions
Our shadow system creates depth and hierarchy through consistent elevation levels.

```scss
// Light Mode Shadows (Subtle, natural)
:root {
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
}

// Dark Mode Shadows (Deeper, more dramatic)
[data-theme="dark"] {
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px -1px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.3);
}
```

### Elevation Hierarchy
```scss
// Component Elevation Mapping
.elevation-0 { box-shadow: none; }           // Flat elements
.elevation-1 { box-shadow: var(--shadow-sm); }   // Cards, buttons
.elevation-2 { box-shadow: var(--shadow-md); }   // Dropdowns, popovers  
.elevation-3 { box-shadow: var(--shadow-lg); }   // Modals, sheets
.elevation-4 { box-shadow: var(--shadow-xl); }   // Floating panels
.elevation-5 { box-shadow: var(--shadow-2xl); }  // Tooltips, notifications
```

## Typography in Dark Mode

### Font Family System
```scss
// Premium Font Stack
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  --font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace;
}
```

### Typography Hierarchy
```scss
// Heading Styles - Consistent across themes
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-sans);
  color: var(--color-text-primary);  // Automatically adapts
  font-weight: 700;
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

// Size Scale
h1 { font-size: var(--text-5xl); font-weight: 800; }  // 48px, Hero headlines
h2 { font-size: var(--text-3xl); font-weight: 700; }  // 30px, Section headers
h3 { font-size: var(--text-2xl); font-weight: 600; }  // 24px, Subsection headers
h4 { font-size: var(--text-xl); font-weight: 600; }   // 20px, Component headers
h5 { font-size: var(--text-lg); font-weight: 500; }   // 18px, Small headers
h6 { font-size: var(--text-base); font-weight: 500; } // 16px, Micro headers

// Body Text Styles
p, li, span {
  color: var(--color-text-secondary);  // Readable secondary color
  line-height: var(--leading-relaxed);
  font-size: var(--text-base);
}

// Utility Text Classes
.text-muted {
  color: var(--color-text-muted);     // For captions, metadata
  font-size: var(--text-sm);
}

.text-accent {
  color: var(--color-primary);        // For highlights, links
}

.text-large {
  font-size: var(--text-lg);
  color: var(--color-text-primary);
}
```

### Reading Optimization for Dark Mode
```scss
// Enhanced readability in dark mode
[data-theme="dark"] {
  // Improved text rendering
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  
  // Slightly increased line height for better readability
  p, li {
    line-height: 1.7; // Up from 1.625
  }
  
  // Subtle text shadow for depth
  h1, h2, h3 {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
}
```

## Icon Guidelines

### Icon Color System
```scss
// Icon Colors - Inherit from text hierarchy
.icon {
  color: var(--color-text-secondary);  // Default icon color
  transition: color var(--transition-fast);
  
  &:hover {
    color: var(--color-primary);
  }
}

// Semantic Icon Colors
.icon-success { color: var(--color-success); }
.icon-warning { color: var(--color-warning); }
.icon-error { color: var(--color-error); }
.icon-info { color: var(--color-info); }
.icon-muted { color: var(--color-text-muted); }
```

### Icon Sizing Scale
```scss
// Consistent icon sizing
.icon-xs { font-size: 0.75rem; }   // 12px - inline with text
.icon-sm { font-size: 1rem; }      // 16px - small UI elements
.icon-md { font-size: 1.25rem; }   // 20px - standard UI
.icon-lg { font-size: 1.5rem; }    // 24px - prominent elements
.icon-xl { font-size: 2rem; }      // 32px - feature icons
.icon-2xl { font-size: 2.5rem; }   // 40px - hero icons
```

### SVG Icon Optimization
```scss
// SVG icons that adapt to dark mode
.svg-icon {
  fill: currentColor;         // Inherits parent color
  stroke: currentColor;
  transition: all var(--transition-fast);
  
  // Multi-color SVG components
  .primary-fill { fill: var(--color-primary); }
  .surface-fill { fill: var(--color-surface); }
  .text-fill { fill: var(--color-text-primary); }
  .accent-fill { fill: var(--color-accent); }
}

// Dark mode specific icon adjustments
[data-theme="dark"] .svg-icon {
  // Slightly reduce opacity for softer appearance
  opacity: 0.9;
  
  &:hover {
    opacity: 1;
  }
}
```

## Image Handling in Dark Mode

### Image Filtering Strategy
```scss
// Content Images - Subtle integration
[data-theme="dark"] .content-image {
  filter: brightness(0.8) contrast(1.2);
  border-radius: var(--radius-md);
  transition: filter var(--transition-base);
  
  &:hover {
    filter: brightness(0.9) contrast(1.1);
  }
}

// Profile/Avatar Images - Keep natural
[data-theme="dark"] .avatar-image,
[data-theme="dark"] .profile-image {
  filter: none;  // Preserve skin tones and natural colors
}

// Decorative/Background Images - More aggressive filtering
[data-theme="dark"] .decorative-image,
[data-theme="dark"] .hero-background {
  filter: brightness(0.6) contrast(1.1) saturate(0.8);
}

// Logo Images - Invert if needed
[data-theme="dark"] .logo-light {
  display: none;
}

[data-theme="dark"] .logo-dark {
  display: block;
}

// Default - show light logo
.logo-light {
  display: block;
}

.logo-dark {
  display: none;
}
```

### Responsive Images with Theme Support
```html
<!-- Optimal approach - different images for different themes -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="hero-dark.jpg">
  <source media="(prefers-color-scheme: light)" srcset="hero-light.jpg">
  <img src="hero-light.jpg" alt="Hero image" class="hero-image">
</picture>

<!-- Alternative - CSS-based switching -->
<div class="hero-container">
  <img src="hero-light.jpg" alt="Hero" class="hero-light">
  <img src="hero-dark.jpg" alt="Hero" class="hero-dark">
</div>
```

## Component-Specific Guidelines

### Button Variants
```scss
// Primary Button
.btn-primary {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  
  &:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }
}

// Secondary Button  
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  
  &:hover {
    background: var(--color-primary);
    color: white;
  }
}

// Accent Button
.btn-accent {
  background: var(--color-accent);
  color: white;
  border: 1px solid var(--color-accent);
  
  &:hover {
    background: var(--color-accent-dark);
    border-color: var(--color-accent-dark);
  }
}

// Dark mode enhancements
[data-theme="dark"] .btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  box-shadow: 0 2px 8px rgba(129, 140, 248, 0.2);
  
  &:hover {
    box-shadow: 0 8px 20px rgba(129, 140, 248, 0.3), 
                0 0 30px rgba(129, 140, 248, 0.2);
  }
}
```

### Card Components
```scss
// Base Card Style
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  
  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}

// Elevated Card
.card-elevated {
  box-shadow: var(--shadow-md);
  
  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }
}

// Dark mode card enhancements
[data-theme="dark"] .card {
  background: var(--color-surface);
  border-color: rgba(129, 140, 248, 0.1);
  
  &:hover {
    background: rgba(66, 133, 244, 0.04);
    border-color: var(--color-primary-light);
  }
}
```

### Form Components
```scss
// Input Fields
.form-input {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  
  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
  }
  
  &::placeholder {
    color: var(--color-text-muted);
  }
}

// Dark mode form enhancements
[data-theme="dark"] .form-input {
  background: linear-gradient(145deg, var(--color-surface), rgba(129, 140, 248, 0.02));
  border-color: rgba(129, 140, 248, 0.15);
  
  &:focus {
    background: var(--color-surface);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15), 
                0 0 20px rgba(129, 140, 248, 0.1);
  }
}
```

### Navigation Components
```scss
// Navigation Links
.nav-link {
  color: var(--color-text-secondary);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  
  &:hover,
  &.active {
    color: var(--color-primary);
    background: var(--color-primary-light);
  }
}

// Dark mode navigation enhancements
[data-theme="dark"] .nav-link:hover,
[data-theme="dark"] .nav-link.active {
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(99, 102, 241, 0.1));
  box-shadow: inset 0 1px 0 rgba(129, 140, 248, 0.2);
}
```

## Accessibility Considerations

### Contrast Requirements
```scss
// Ensure WCAG AA compliance (4.5:1 ratio minimum)
// Primary text on background
--color-text-primary: #2C3E50;     // 9.5:1 ratio on white
[data-theme="dark"] {
  --color-text-primary: #F7F8FA;   // 13.2:1 ratio on #0A0B0D
}

// Secondary text (minimum 3:1 for large text)
--color-text-secondary: #475569;   // 6.8:1 ratio on white
[data-theme="dark"] {
  --color-text-secondary: #B8BCC8; // 7.1:1 ratio on dark background
}
```

### Focus Indicators
```scss
// High contrast focus indicators for both themes
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

[data-theme="dark"] :focus-visible {
  outline-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.2);
}
```

### Reduced Motion Support
```scss
// Respect user's motion preferences
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Print Styles

### Dark Mode Print Optimization
```scss
// Ensure printable content in dark mode
@media print {
  [data-theme="dark"] {
    // Force light theme for printing
    --color-bg: white !important;
    --color-surface: white !important;
    --color-text-primary: black !important;
    --color-text-secondary: #333333 !important;
    --color-border: #cccccc !important;
    
    // Remove shadows and effects
    * {
      box-shadow: none !important;
      text-shadow: none !important;
      background-image: none !important;
    }
  }
}
```

This design system documentation provides a comprehensive foundation for maintaining consistency across all components while ensuring excellent dark mode support and accessibility compliance.