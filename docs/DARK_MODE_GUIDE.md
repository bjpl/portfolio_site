# Dark Mode Implementation Guide

## Overview

This portfolio site features a comprehensive dark mode implementation with elegant transitions, CSS custom properties, and sophisticated visual enhancements. The dark mode system is built for accessibility, performance, and user experience.

## Color Palette Reference

### Light Mode (Default)
```scss
:root {
  // Core Colors
  --color-bg: #F5F5F7;              // Soft White-Gray
  --color-surface: #FFFFFF;         // Pure White
  --color-surface-alt: #E8F4FD;     // Pale Blue Tint
  
  // Text Colors
  --color-text-primary: #2C3E50;    // Deep Blue-Gray
  --color-text-secondary: #475569;  // Medium Gray
  --color-text-muted: #94A3B8;      // Light Gray
  
  // Brand Colors
  --color-primary: #4A90E2;         // Friendly Sky Blue
  --color-primary-hover: #3A7FD2;   // Darker Blue
  --color-primary-light: #E8F4FD;   // Very Light Blue
  --color-primary-dark: #3A6FB0;    // Dark Blue
  
  // Accent Colors
  --color-accent: #FFB84D;          // Warm Amber
  --color-accent-light: #FFC66D;    // Light Amber
  --color-accent-dark: #E5A043;     // Dark Amber
  
  // Borders & Shadows
  --color-border: #E2E8F0;          // Light Border
  --color-border-light: #F1F5F9;    // Very Light Border
}
```

### Dark Mode
```scss
[data-theme="dark"] {
  // Core Colors
  --color-bg: #0A0B0D;              // Deep Dark
  --color-surface: #141519;         // Dark Surface
  --color-surface-alt: #1E1F26;     // Elevated Surface
  
  // Text Colors
  --color-text-primary: #F7F8FA;    // Near White
  --color-text-secondary: #B8BCC8;  // Light Gray
  --color-text-muted: #868B98;      // Medium Gray
  
  // Brand Colors (Adjusted for dark mode)
  --color-primary: #5BA3F5;         // Lighter Sky Blue
  --color-primary-hover: #6BB0FF;   // Bright Blue
  --color-primary-light: rgba(74, 144, 226, 0.15);  // Transparent Blue
  
  // Accent Colors (Brighter for dark mode)
  --color-accent: #FFCA6D;          // Bright Amber
  --color-accent-light: #FFD584;    // Light Bright Amber
  
  // Borders (Semi-transparent)
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-light: rgba(255, 255, 255, 0.04);
}
```

## CSS Variable List

### Typography Variables
```scss
// Font Families
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

// Font Sizes (Modular Scale)
--text-xs: 0.75rem;      // 12px
--text-sm: 0.875rem;     // 14px
--text-base: 1rem;       // 16px
--text-lg: 1.125rem;     // 18px
--text-xl: 1.25rem;      // 20px
--text-2xl: 1.5rem;      // 24px
--text-3xl: 1.875rem;    // 30px
--text-4xl: 2.25rem;     // 36px
--text-5xl: 3rem;        // 48px
--text-6xl: 3.75rem;     // 60px

// Line Heights
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

// Letter Spacing
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

### Spacing & Layout
```scss
// Spacing Scale
--space-xs: 0.25rem;     // 4px
--space-sm: 0.5rem;      // 8px
--space-md: 1rem;        // 16px
--space-lg: 1.5rem;      // 24px
--space-xl: 2rem;        // 32px
--space-2xl: 3rem;       // 48px
--space-3xl: 4rem;       // 64px
--space-4xl: 6rem;       // 96px

// Border Radius
--radius-none: 0;
--radius-sm: 0.25rem;    // 4px
--radius-md: 0.375rem;   // 6px
--radius-lg: 0.5rem;     // 8px
--radius-xl: 0.75rem;    // 12px
--radius-2xl: 1rem;      // 16px
--radius-3xl: 1.5rem;    // 24px
--radius-full: 9999px;
```

### Shadow System
```scss
// Light Mode Shadows
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

// Dark Mode Shadows (Deeper)
[data-theme="dark"] {
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px -1px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
}
```

### Transition System
```scss
// Transition Curves
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slower: 500ms cubic-bezier(0.4, 0, 0.2, 1);
```

## Implementation Patterns

### 1. Basic Component with Dark Mode Support

```scss
.card {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  
  &:hover {
    background: var(--color-surface-alt);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}
```

### 2. Interactive Button with Dark Mode

```scss
.btn-primary {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-lg);
  font-weight: 600;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
}

// Dark mode enhancements
[data-theme="dark"] .btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  &:hover {
    box-shadow: 0 8px 20px rgba(129, 140, 248, 0.3), 
                0 0 30px rgba(129, 140, 248, 0.2);
  }
}
```

### 3. Form Elements with Dark Mode

```scss
.form-input {
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: inherit;
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
  }
}

[data-theme="dark"] .form-input {
  background: linear-gradient(145deg, var(--color-surface), rgba(129, 140, 248, 0.02));
  border-color: rgba(129, 140, 248, 0.15);
  
  &:focus {
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15), 
                0 0 20px rgba(129, 140, 248, 0.1);
  }
}
```

### 4. Navigation with Dark Mode Enhancements

```scss
.nav-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--color-primary);
    background: var(--color-primary-light);
    transform: translateY(-1px);
  }
}

[data-theme="dark"] .nav-link:hover {
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(99, 102, 241, 0.1));
  box-shadow: inset 0 1px 0 rgba(129, 140, 248, 0.2);
}
```

## Component Examples

### Enhanced Card Component
```scss
.enhanced-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  position: relative;
  overflow: hidden;
  transition: all var(--transition-base);
  
  // Animated border accent
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--color-primary);
    transform: scaleX(0);
    transition: transform var(--transition-base);
  }
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
    border-color: var(--color-primary-light);
    
    &::before {
      transform: scaleX(1);
    }
  }
}

// Dark mode enhancements
[data-theme="dark"] .enhanced-card {
  background: var(--color-surface);
  border-color: rgba(129, 140, 248, 0.1);
  box-shadow: var(--shadow-sm);
  
  &:hover {
    background: rgba(66, 133, 244, 0.04);
    border-color: var(--color-primary-light);
    box-shadow: var(--shadow-lg);
  }
}
```

### Gradient Text Component
```scss
.gradient-text {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
  letter-spacing: -0.03em;
}

[data-theme="dark"] .gradient-text {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Glowing Button (Dark Mode Special)
```scss
[data-theme="dark"] .btn-glow {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  border: 1px solid var(--color-primary);
  box-shadow: 0 2px 8px rgba(129, 140, 248, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, var(--color-primary-hover), #4c1d95);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 20px rgba(129, 140, 248, 0.4), 
                0 0 30px rgba(129, 140, 248, 0.2);
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Flash of Unstyled Content (FOUC)
**Problem**: Brief flash of light mode before dark mode loads

**Solution**: Initialize theme immediately in HTML head
```javascript
// Add to <head> before any CSS
<script>
(function() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);
})();
</script>
```

#### 2. Inconsistent Color Inheritance
**Problem**: Some elements don't inherit dark mode colors

**Solution**: Use CSS custom properties consistently
```scss
// ❌ Bad - hardcoded colors
.element {
  color: #333333;
  background: #ffffff;
}

// ✅ Good - uses CSS variables
.element {
  color: var(--color-text-primary);
  background: var(--color-surface);
}
```

#### 3. Poor Contrast in Dark Mode
**Problem**: Text is hard to read in dark mode

**Solution**: Test contrast ratios and adjust colors
```scss
// Ensure sufficient contrast
[data-theme="dark"] .text-muted {
  color: var(--color-text-muted); // #868B98 - tested for accessibility
}
```

#### 4. Broken Third-Party Components
**Problem**: External libraries don't support dark mode

**Solution**: Override with CSS custom properties
```scss
// Override third-party styles
[data-theme="dark"] .external-component {
  background: var(--color-surface) !important;
  color: var(--color-text-primary) !important;
  border-color: var(--color-border) !important;
}
```

#### 5. Images Look Wrong in Dark Mode
**Problem**: Light images clash with dark backgrounds

**Solution**: Implement image filters or provide dark versions
```scss
[data-theme="dark"] .content img {
  filter: brightness(0.8) contrast(1.2);
  border-radius: var(--radius-md);
}

// Or use picture element for different images
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="image-dark.jpg">
  <img src="image-light.jpg" alt="Description">
</picture>
```

### Performance Optimization

#### 1. CSS Custom Property Inheritance
```scss
// Efficient - inherits from parent
.child-element {
  color: inherit; // Uses parent's --color-text-primary
}

// Less efficient - re-declares variable
.child-element {
  color: var(--color-text-primary);
}
```

#### 2. Transition Optimization
```scss
// Efficient - only animate necessary properties
.element {
  transition: background-color var(--transition-base), 
              color var(--transition-base);
}

// Less efficient - animates all properties
.element {
  transition: all var(--transition-base);
}
```

#### 3. Layer Organization
```scss
// Use CSS cascade layers for better performance
@layer base, components, utilities;

@layer base {
  :root { /* base variables */ }
}

@layer components {
  .card { /* component styles */ }
}

@layer utilities {
  [data-theme="dark"] { /* dark mode overrides */ }
}
```

### Accessibility Considerations

#### 1. Respect User Preferences
```javascript
// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    const newTheme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
  }
});
```

#### 2. Keyboard Navigation
```scss
[data-theme="dark"] :focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

#### 3. Reduced Motion Support
```scss
@media (prefers-reduced-motion: reduce) {
  .theme-transition,
  .theme-transition *,
  .theme-transition *::before,
  .theme-transition *::after {
    transition: none !important;
  }
}
```

## Browser Support

- **Chrome/Edge**: Full support for CSS custom properties and color-scheme
- **Firefox**: Full support with slight rendering differences
- **Safari**: Full support including backdrop-filter
- **Mobile browsers**: Full support on modern versions

### Fallbacks for Older Browsers
```scss
// Fallback for browsers without CSS custom properties support
.element {
  background: #ffffff; /* fallback */
  background: var(--color-surface); /* modern browsers */
}
```

## Testing Checklist

### Visual Testing
- [ ] All text has sufficient contrast (WCAG AA: 4.5:1, AAA: 7:1)
- [ ] Interactive elements are clearly visible
- [ ] Borders and dividers are visible but subtle
- [ ] Images and media look appropriate
- [ ] Loading states work in both modes

### Functional Testing
- [ ] Theme toggle works immediately
- [ ] Theme persists across page loads
- [ ] System preference detection works
- [ ] No FOUC on initial load
- [ ] Smooth transitions between themes

### Performance Testing
- [ ] No layout shift during theme change
- [ ] Smooth 60fps transitions
- [ ] No unnecessary repaints
- [ ] CSS file size is optimized

### Accessibility Testing
- [ ] Screen readers announce theme changes
- [ ] Keyboard navigation works in both modes
- [ ] Focus indicators are visible
- [ ] Reduced motion is respected
- [ ] Color is not the only indicator

## Development Tips

1. **Use browser dev tools** to test color-scheme and prefers-color-scheme
2. **Test on real devices** especially mobile screens
3. **Use a contrast checker** for all text/background combinations
4. **Document color decisions** for team consistency
5. **Consider seasonal themes** for future enhancements

## Resources

- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- [Dark Mode Design Guidelines](https://material.io/design/color/dark-theme.html)