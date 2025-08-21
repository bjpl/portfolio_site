# Dark Mode Developer Guide

## Quick Start

### Adding Dark Mode to New Components

Follow these steps to ensure your new components support dark mode:

1. **Use CSS Variables for All Colors**
```scss
.new-component {
  background: var(--color-surface);        // ✅ Good
  color: var(--color-text-primary);       // ✅ Good
  border: 1px solid var(--color-border);  // ✅ Good
  
  // ❌ Avoid hardcoded colors
  // background: #ffffff;
  // color: #333333;
}
```

2. **Test Contrast Ratios**
- Primary text: minimum 4.5:1 contrast ratio
- Secondary text: minimum 3:1 contrast ratio
- Use browser dev tools or online contrast checkers

3. **Add Smooth Transitions**
```scss
.new-component {
  transition: background-color var(--transition-base), 
              color var(--transition-base),
              border-color var(--transition-base);
}
```

4. **Test in Both Modes**
- Use browser dev tools to toggle `prefers-color-scheme`
- Test on real devices with dark mode enabled
- Verify theme toggle works correctly

## Code Examples

### Basic Component Template
```scss
.component-name {
  // Layout & Typography
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  
  // Colors using CSS variables
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  
  // Shadows and effects
  box-shadow: var(--shadow-sm);
  
  // Transitions for smooth theme changes
  transition: all var(--transition-base);
  
  // Hover states
  &:hover {
    background: var(--color-surface-alt);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  
  // Focus states for accessibility
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// Dark mode specific enhancements (optional)
[data-theme="dark"] .component-name {
  // Only add if you need dark-mode specific styling
  // Most styling should work with CSS variables
  &:hover {
    box-shadow: var(--shadow-lg), 
                0 0 20px rgba(129, 140, 248, 0.1);
  }
}
```

### Interactive Button Template
```scss
.btn-template {
  // Base styles
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  
  // Layout
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-lg);
  min-height: 48px; // Touch target
  
  // Typography
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  text-decoration: none;
  
  // Colors
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  
  // Effects
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  // States
  &:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

// Dark mode glow effect
[data-theme="dark"] .btn-template {
  box-shadow: 0 2px 8px rgba(129, 140, 248, 0.2);
  
  &:hover {
    box-shadow: 0 8px 20px rgba(129, 140, 248, 0.3), 
                0 0 30px rgba(129, 140, 248, 0.2);
  }
}
```

### Form Input Template
```scss
.input-template {
  // Layout
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  min-height: 48px; // Touch target
  
  // Typography
  font-family: inherit;
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  
  // Colors
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  
  // Effects
  transition: all var(--transition-fast);
  
  // Placeholder
  &::placeholder {
    color: var(--color-text-muted);
  }
  
  // States
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
  }
  
  &:invalid {
    border-color: var(--color-error);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--color-border-light);
  }
}

// Dark mode enhancements
[data-theme="dark"] .input-template {
  background: linear-gradient(145deg, 
              var(--color-surface), 
              rgba(129, 140, 248, 0.02));
  border-color: rgba(129, 140, 248, 0.15);
  
  &:focus {
    background: var(--color-surface);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15), 
                0 0 20px rgba(129, 140, 248, 0.1);
  }
}
```

### Card Component Template
```scss
.card-template {
  // Layout
  padding: var(--space-xl);
  border-radius: var(--radius-xl);
  position: relative;
  overflow: hidden;
  
  // Colors
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  
  // Effects
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  
  // Accent line (optional)
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
  
  // Hover effects
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary-light);
    
    &::before {
      transform: scaleX(1);
    }
  }
  
  // Card header
  .card-header {
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }
  
  // Card title
  .card-title {
    color: var(--color-text-primary);
    font-size: var(--text-xl);
    font-weight: 600;
    margin-bottom: var(--space-sm);
  }
  
  // Card content
  .card-content {
    color: var(--color-text-secondary);
    line-height: var(--leading-relaxed);
  }
  
  // Card footer
  .card-footer {
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

// Dark mode enhancements
[data-theme="dark"] .card-template {
  background: var(--color-surface);
  border-color: rgba(129, 140, 248, 0.1);
  
  &:hover {
    background: rgba(66, 133, 244, 0.04);
    border-color: var(--color-primary-light);
    box-shadow: var(--shadow-lg);
  }
}
```

## Design System Integration

### Color Token Usage
```scss
// ✅ Semantic color usage
.success-message {
  background: var(--color-success);
  color: white;
}

.warning-banner {
  background: var(--color-warning);
  color: white;
}

.error-alert {
  background: var(--color-error);
  color: white;
}

// ✅ Context-specific usage
.primary-button {
  background: var(--color-primary);
}

.accent-highlight {
  background: var(--color-accent);
}

// ❌ Avoid using raw color values
.wrong-component {
  background: #4A90E2; // Use var(--color-primary) instead
}
```

### Elevation System
```scss
// Use consistent shadow levels
.level-1 { box-shadow: var(--shadow-sm); }   // Cards
.level-2 { box-shadow: var(--shadow-md); }   // Dropdowns
.level-3 { box-shadow: var(--shadow-lg); }   // Modals
.level-4 { box-shadow: var(--shadow-xl); }   // Overlays
.level-5 { box-shadow: var(--shadow-2xl); }  // Tooltips
```

### Typography in Dark Mode
```scss
// Headings - maintain hierarchy
h1, h2, h3, h4, h5, h6 {
  color: var(--color-text-primary);
  font-weight: 700;
}

// Body text - readable secondary color
p, li, span {
  color: var(--color-text-secondary);
}

// Muted text - for metadata, captions
.text-muted {
  color: var(--color-text-muted);
}

// Accent text - for highlights
.text-accent {
  color: var(--color-primary);
}
```

## Testing Guidelines

### Manual Testing Checklist

#### Visual Testing
- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode
- [ ] Smooth transition when switching themes
- [ ] No color flickering or jumps
- [ ] All text is readable (contrast check)
- [ ] Interactive states are visible
- [ ] Loading states work in both modes

#### Functional Testing
- [ ] Theme toggle works immediately
- [ ] Component state persists during theme change
- [ ] No JavaScript errors in console
- [ ] All event handlers still work
- [ ] Form validation works in both modes

#### Accessibility Testing
- [ ] Focus indicators are visible in both modes
- [ ] Screen reader compatibility
- [ ] Keyboard navigation works
- [ ] Touch targets are minimum 44px
- [ ] Color is not the only differentiator

### Automated Testing

#### CSS Testing
```scss
// Test CSS custom property inheritance
.test-component {
  background: var(--color-surface);
  
  // Should inherit from parent theme
  color: var(--color-text-primary);
}

// Verify cascade works correctly
[data-theme="dark"] .test-component {
  // Dark mode styles should override
  background: var(--color-surface); // This should be the dark variant
}
```

#### JavaScript Testing
```javascript
// Test theme switching
describe('Dark Mode', () => {
  it('should apply dark theme when toggled', () => {
    const html = document.documentElement;
    
    // Initial state
    expect(html.getAttribute('data-theme')).toBe('light');
    
    // Toggle to dark
    window.toggleTheme();
    expect(html.getAttribute('data-theme')).toBe('dark');
    
    // Toggle back to light
    window.toggleTheme();
    expect(html.getAttribute('data-theme')).toBe('light');
  });
  
  it('should persist theme in localStorage', () => {
    window.toggleTheme();
    expect(localStorage.getItem('theme')).toBe('dark');
  });
  
  it('should respect system preference', () => {
    // Mock system preference
    window.matchMedia = jest.fn(() => ({
      matches: true, // Dark mode
      addEventListener: jest.fn(),
    }));
    
    // Clear localStorage
    localStorage.removeItem('theme');
    
    // Re-initialize
    // Should detect system preference
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

## Icon Guidelines

### Icon Color Usage
```scss
.icon {
  // Use text colors for consistency
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
  
  &:hover {
    color: var(--color-primary);
  }
}

// Status icons
.icon-success { color: var(--color-success); }
.icon-warning { color: var(--color-warning); }
.icon-error { color: var(--color-error); }
.icon-info { color: var(--color-info); }
```

### SVG Icons with Dark Mode
```scss
// SVG icons that adapt to theme
.svg-icon {
  fill: currentColor; // Inherits text color
  stroke: currentColor;
  
  // For multi-color SVGs
  .primary-fill { fill: var(--color-primary); }
  .surface-fill { fill: var(--color-surface); }
  .text-fill { fill: var(--color-text-primary); }
}
```

## Image Handling

### Images in Dark Mode
```scss
// Subtle darkening for better integration
[data-theme="dark"] .content-image {
  filter: brightness(0.8) contrast(1.2);
  border-radius: var(--radius-md);
}

// Profile images - keep natural
[data-theme="dark"] .profile-image {
  filter: none; // Keep profile photos natural
}

// Decorative images - more aggressive filtering
[data-theme="dark"] .decorative-image {
  filter: brightness(0.6) contrast(1.1) saturate(0.8);
}
```

### Responsive Images with Dark Mode
```html
<!-- Provide different images for light/dark themes -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="hero-dark.jpg">
  <source media="(prefers-color-scheme: light)" srcset="hero-light.jpg">
  <img src="hero-light.jpg" alt="Hero image">
</picture>
```

## Performance Considerations

### Efficient CSS Variable Usage
```scss
// ✅ Efficient - minimal property changes
.efficient-component {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  transition: background-color var(--transition-base),
              color var(--transition-base);
}

// ❌ Less efficient - animates all properties
.inefficient-component {
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}
```

### Reduce Layout Shifts
```scss
// Prevent layout shift during theme changes
.stable-component {
  // Use consistent sizing
  min-height: 48px;
  padding: var(--space-md);
  
  // Avoid changing margins/padding in dark mode
  // Use background/color changes instead
}
```

### GPU Acceleration
```scss
// Use transform and opacity for smooth animations
.smooth-component {
  transform: translateZ(0); // Force GPU layer
  
  &:hover {
    transform: translateY(-2px) translateZ(0);
    // Much smoother than changing top/margin
  }
}
```

## Common Patterns

### Loading States
```scss
.loading-skeleton {
  background: var(--color-border-light);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

[data-theme="dark"] .loading-skeleton {
  background: rgba(129, 140, 248, 0.1);
}
```

### Empty States
```scss
.empty-state {
  text-align: center;
  padding: var(--space-4xl) var(--space-xl);
  color: var(--color-text-muted);
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--space-lg);
    opacity: 0.5;
  }
  
  .empty-title {
    color: var(--color-text-secondary);
    font-size: var(--text-xl);
    margin-bottom: var(--space-md);
  }
}
```

### Tooltips
```scss
.tooltip {
  position: absolute;
  background: var(--color-text-primary);
  color: var(--color-surface);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  white-space: nowrap;
  z-index: 1000;
  box-shadow: var(--shadow-lg);
  
  // Arrow
  &::before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    border-color: var(--color-text-primary) transparent transparent transparent;
  }
}
```

This developer guide provides practical templates and patterns for implementing dark mode support in new components while maintaining consistency with the existing design system.