# Portfolio Site Styling System

A comprehensive, modern styling system built with Tailwind CSS and custom design tokens, featuring complete light/dark theme support and responsive design patterns.

## 📁 File Structure

```
styles/
├── index.css          # Main stylesheet entry point
├── theme.js           # JavaScript theme configuration
├── components.css     # Component-specific styles
├── utilities.css      # Custom utility classes
├── animations.css     # Animation system
├── responsive.css     # Responsive design patterns
├── markdown.css       # Prose content styling
└── README.md         # This documentation
```

## 🎨 Design System Overview

### Color Palette

The design system uses CSS custom properties for consistent theming:

#### Light Theme Colors
- **Background**: `#F5F5F7` (Soft White-Gray)
- **Surface**: `#FFFFFF` (Pure White)
- **Surface Alt**: `#E8F4FD` (Pale Blue Tint)
- **Primary**: `#4A90E2` (Friendly Sky Blue)
- **Accent**: `#FFB84D` (Warm Amber)
- **Text Primary**: `#2C3E50` (Deep Blue-Gray)
- **Text Secondary**: `#475569` (Medium Gray)

#### Dark Theme Colors
- **Background**: `#0A0B0D` (Very Dark Blue-Black)
- **Surface**: `#141519` (Dark Surface)
- **Surface Alt**: `#1E1F26` (Alternate Dark Surface)
- **Primary**: `#5BA3F5` (Lighter Sky Blue)
- **Accent**: `#FFCA6D` (Lighter Warm Amber)
- **Text Primary**: `#F7F8FA` (Near White)
- **Text Secondary**: `#B8BCC8` (Medium Light Gray)

### Typography

#### Font Families
- **Sans**: Inter + system font stack
- **Serif**: Playfair Display + serif stack
- **Mono**: JetBrains Mono + monospace stack

#### Font Scale (Modular)
- `xs`: 0.75rem (12px)
- `sm`: 0.875rem (14px)
- `base`: 1rem (16px)
- `lg`: 1.125rem (18px)
- `xl`: 1.25rem (20px)
- `2xl`: 1.5rem (24px)
- `3xl`: 1.875rem (30px)
- `4xl`: 2.25rem (36px)
- `5xl`: 3rem (48px)
- `6xl`: 3.75rem (60px)

### Spacing Scale

Consistent spacing using CSS custom properties:
- `xs`: 0.25rem (4px)
- `sm`: 0.5rem (8px)
- `md`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)
- `2xl`: 3rem (48px)
- `3xl`: 4rem (64px)
- `4xl`: 6rem (96px)

## 🧩 Component System

### Buttons

```css
.btn              /* Base button styles */
.btn-sm          /* Small button */
.btn-lg          /* Large button */
.btn-primary     /* Primary button style */
.btn-secondary   /* Secondary button style */
.btn-accent      /* Accent button style */
.btn-ghost       /* Ghost button style */
```

### Cards

```css
.card            /* Base card container */
.card-interactive /* Interactive card with hover effects */
.card-featured   /* Featured card with accent border */
```

### Forms

```css
.form-group      /* Form field container */
.form-label      /* Form field label */
.form-input      /* Input field styles */
.form-textarea   /* Textarea styles */
.form-select     /* Select dropdown styles */
```

## 🎭 Animation System

### Keyframe Animations

- `fadeIn` - Smooth opacity transition
- `slideUp` - Slide up from bottom
- `slideDown` - Slide down from top
- `scaleIn` - Scale in animation
- `float` - Floating animation
- `glow` - Text glow effect
- `subtleRotate` - Slow rotation

### Animation Classes

```css
.animate-fade-in
.animate-slide-up
.animate-slide-down
.animate-scale-in
.animate-float
.animate-glow
.animate-subtle-rotate
```

### Hover Effects

```css
.hover-lift      /* Translate Y on hover */
.hover-scale     /* Scale on hover */
.hover-rotate    /* Rotate on hover */
.hover-glow      /* Glow effect on hover */
```

## 📱 Responsive System

### Breakpoints

- `xs`: 480px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px
- `3xl`: 1792px

### Container Utilities

```css
.container-custom     /* Max-width with responsive padding */
.container-narrow     /* Narrower content width */
.container-wide       /* Full-width container */
```

### Grid Systems

```css
.grid-auto-sm        /* Auto-fit grid (200px min) */
.grid-auto-md        /* Auto-fit grid (280px min) */
.grid-auto-lg        /* Auto-fit grid (350px min) */
```

## 🎨 Utility Classes

### Typography

```css
.text-fluid-sm       /* Responsive small text */
.text-fluid-md       /* Responsive medium text */
.text-fluid-lg       /* Responsive large text */
.font-display        /* Serif display font */
.font-body           /* Sans body font */
.font-code           /* Monospace code font */
```

### Layout

```css
.flex-center         /* Flex center alignment */
.flex-between        /* Flex space-between */
.flex-column-center  /* Flex column center */
```

### Visual Effects

```css
.shadow-soft         /* Light shadow */
.shadow-medium       /* Medium shadow */
.shadow-strong       /* Strong shadow */
.bg-gradient-primary /* Primary gradient background */
.text-gradient-primary /* Primary gradient text */
```

## 🌙 Dark Mode Support

The system automatically switches themes based on the `[data-theme="dark"]` attribute. All components include comprehensive dark mode styling.

### Theme Toggle Implementation

```javascript
// From theme.js
const themeUtils = {
  toggleTheme: () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    return newTheme;
  },
  
  initializeTheme: () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }
}
```

## 📝 Markdown Styling

The `markdown.css` file provides comprehensive prose styling with:

- Syntax-highlighted code blocks
- Styled blockquotes with quote marks
- Enhanced table styling
- Info boxes and callouts
- Mathematical expression support
- Print-optimized styles

### Usage

```html
<article class="prose prose-lg">
  <!-- Markdown content -->
</article>
```

## ♿ Accessibility Features

### Built-in Accessibility

- Screen reader utilities (`.sr-only`)
- Focus management with visible focus states
- High contrast mode support
- Reduced motion preferences respected
- ARIA-friendly component patterns

### Focus Management

```css
.focus-ring          /* Custom focus ring */
.focus-visible-only  /* Focus visible only */
.skip-link          /* Skip navigation link */
```

## 🔧 Integration with Tailwind CSS

The system extends Tailwind with custom design tokens:

```javascript
// In tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: 'var(--color-primary)',
        hover: 'var(--color-primary-hover)',
        light: 'var(--color-primary-light)'
      }
    }
  }
}
```

## 🎭 Performance Optimizations

### CSS Variables
- Efficient theme switching without JavaScript
- Single source of truth for design tokens
- Runtime theme customization support

### Animation Performance
- GPU-accelerated transforms
- Reduced motion support
- Will-change properties for smooth animations

### Loading Strategies
- Critical CSS inlined
- Progressive enhancement patterns
- Efficient asset loading

## 🚀 Usage Examples

### Basic Component

```html
<div class="card hover-lift">
  <h3 class="text-2xl font-semibold text-primary mb-4">Card Title</h3>
  <p class="text-secondary mb-6">Card description content.</p>
  <button class="btn btn-primary">Action</button>
</div>
```

### Responsive Layout

```html
<div class="grid grid-auto-md gap-6 py-16">
  <div class="card animate-fade-in">...</div>
  <div class="card animate-fade-in" style="animation-delay: 0.1s">...</div>
  <div class="card animate-fade-in" style="animation-delay: 0.2s">...</div>
</div>
```

### Theme-Aware Styling

```html
<div class="bg-surface border border-DEFAULT rounded-lg p-6 shadow-md
            dark:shadow-lg dark:border-primary/20">
  <!-- Content automatically adapts to light/dark themes -->
</div>
```

## 📊 File Sizes

- `index.css`: ~15KB (minified)
- `components.css`: ~25KB (minified)
- `utilities.css`: ~18KB (minified)
- `animations.css`: ~12KB (minified)
- `responsive.css`: ~20KB (minified)
- `markdown.css`: ~15KB (minified)

**Total**: ~105KB minified, ~25KB gzipped

---

## 💡 Best Practices

1. **Use CSS Custom Properties**: Leverage variables for consistent theming
2. **Mobile-First**: Always design for mobile, then enhance for larger screens
3. **Performance**: Use `will-change` sparingly and only during animations
4. **Accessibility**: Test with screen readers and keyboard navigation
5. **Dark Mode**: Ensure sufficient contrast in both themes
6. **Animation**: Respect `prefers-reduced-motion` preferences

This styling system provides a solid foundation for building modern, accessible, and performant web applications with excellent user experience across all devices and preferences.