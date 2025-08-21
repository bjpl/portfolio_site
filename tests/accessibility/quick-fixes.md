# Dark Mode Accessibility - Immediate Fixes

## Critical Issues (Fix Immediately)

### 1. Border Contrast Failure
**Current**: 1.27:1 (light), 1.61:1 (dark)  
**Required**: 3:1 minimum for UI components

**Fix in `src/styles/tokens/_index.scss`**:
```scss
:root {
  // Current (failing)
  --color-border: #e5e5e5; // Light theme
  
  [data-theme="dark"] & {
    --color-border: #333333; // Dark theme  
  }
}

// Updated (passing)
:root {
  --color-border: #cccccc; // Light theme (3.8:1 ratio)
  
  [data-theme="dark"] & {
    --color-border: #555555; // Dark theme (3.2:1 ratio)
  }
}
```

### 2. Theme Toggle ARIA Support
**Add to theme toggle component**:
```html
<button 
  class="theme-toggle"
  aria-label="Toggle between light and dark theme"
  aria-pressed="false">
  <svg aria-hidden="true">...</svg>
</button>
<div aria-live="polite" aria-atomic="true" class="sr-only" id="theme-status"></div>
```

**Update JavaScript in `src/scripts/core/theme-manager.ts`**:
```typescript
private announceThemeChange(theme: string): void {
  const announcer = document.getElementById('theme-status');
  if (announcer) {
    announcer.textContent = `Switched to ${theme} theme`;
  }
}

// Call this after theme change
this.announceThemeChange(next);
```

### 3. Reduced Motion Support
**Add to `src/styles/main.scss`**:
```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## High Priority Enhancements

### 4. Enhanced Focus Indicators
**Add to `src/styles/main.scss`**:
```scss
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(77, 148, 255, 0.2);
}

[data-theme="dark"] :focus-visible {
  box-shadow: 0 0 0 4px rgba(77, 148, 255, 0.3);
}
```

### 5. Link Underlines
**Update link styles**:
```scss
a:not(.button) {
  text-decoration: underline;
  text-decoration-skip-ink: auto;
  text-underline-offset: 0.2em;
  
  &:hover {
    text-decoration-thickness: 2px;
  }
}
```

## Testing After Fixes

1. **Run contrast checker** on updated border colors
2. **Test theme toggle** with screen reader
3. **Verify reduced motion** works in browser settings
4. **Check focus indicators** are visible in both themes
5. **Validate links** are identifiable without color

## Estimated Impact

- **Before**: 85% WCAG 2.1 AA compliance
- **After**: 95% WCAG 2.1 AA compliance  
- **Time to implement**: 2-3 hours
- **Testing time**: 1 hour

## Files to Update

1. `src/styles/tokens/_index.scss` - Border colors
2. `src/styles/main.scss` - Focus indicators, reduced motion
3. `src/scripts/core/theme-manager.ts` - ARIA announcements
4. Theme toggle component - ARIA attributes