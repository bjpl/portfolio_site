# Dark Mode Testing Checklist

## Pre-Deployment Testing Checklist

### Visual Testing

#### Color and Contrast
- [ ] **Text Readability**: All text meets WCAG AA contrast ratios (4.5:1 minimum)
- [ ] **Heading Hierarchy**: Headers are clearly distinguishable in both themes
- [ ] **Link Visibility**: Links are easily identifiable and readable
- [ ] **Button States**: All button states (normal, hover, focus, disabled) are visible
- [ ] **Form Elements**: Input fields, dropdowns, and form controls are clearly visible
- [ ] **Border Visibility**: Borders and dividers provide adequate separation
- [ ] **Icon Clarity**: All icons are visible and maintain their meaning
- [ ] **Image Integration**: Images work well with both light and dark backgrounds

#### Layout and Spacing
- [ ] **No Layout Shift**: Theme switching doesn't cause layout jumps or shifts
- [ ] **Consistent Spacing**: Margins and padding remain consistent across themes
- [ ] **Responsive Behavior**: Dark mode works correctly at all screen sizes
- [ ] **Component Alignment**: All components maintain proper alignment
- [ ] **Typography Scale**: Font sizes and line heights are appropriate in both themes

#### Interactive Elements
- [ ] **Hover States**: Clear visual feedback on hover for all interactive elements
- [ ] **Focus States**: Keyboard focus indicators are visible in both themes
- [ ] **Active States**: Pressed/active states provide clear feedback
- [ ] **Selection States**: Text selection and form field selection are visible
- [ ] **Loading States**: Loading spinners and skeleton screens work in both themes

### Functional Testing

#### Theme Switching
- [ ] **Immediate Toggle**: Theme changes instantly without delay
- [ ] **State Persistence**: Selected theme persists across page loads
- [ ] **System Preference**: Respects user's system dark mode setting
- [ ] **No JavaScript Errors**: Console shows no errors during theme switching
- [ ] **Memory Management**: No memory leaks from theme toggle functionality

#### Cross-Page Consistency
- [ ] **Navigation**: Theme remains consistent when navigating between pages
- [ ] **Form Submissions**: Theme persists through form submissions and redirects
- [ ] **External Links**: Theme state maintained when returning from external sites
- [ ] **Bookmark Support**: Bookmarked pages respect saved theme preference
- [ ] **Deep Links**: Direct links to internal pages load with correct theme

#### Performance Testing
- [ ] **Smooth Transitions**: Theme changes are smooth (no flickering or jumps)
- [ ] **Load Performance**: Initial page load doesn't show FOUC (Flash of Unstyled Content)
- [ ] **CSS Performance**: No unnecessary style recalculations during theme change
- [ ] **Memory Usage**: Theme switching doesn't cause memory bloat
- [ ] **Animation Performance**: All animations run at 60fps in both themes

### Accessibility Testing

#### Keyboard Navigation
- [ ] **Tab Order**: Logical tab order maintained in both themes
- [ ] **Focus Visibility**: Focus indicators clearly visible against all backgrounds
- [ ] **Keyboard Shortcuts**: All keyboard shortcuts work in both themes
- [ ] **Focus Trapping**: Modal focus trapping works correctly in both themes
- [ ] **Skip Links**: Skip navigation links are visible when focused

#### Screen Reader Compatibility
- [ ] **Theme Announcements**: Screen readers announce theme changes
- [ ] **Content Accessibility**: All content remains accessible in both themes
- [ ] **Form Labels**: Form labels and descriptions remain associated
- [ ] **Landmark Navigation**: Page landmarks work correctly in both themes
- [ ] **ARIA Support**: ARIA attributes function properly in both themes

#### Motor Accessibility
- [ ] **Touch Targets**: All touch targets meet minimum size requirements (44px)
- [ ] **Click Areas**: Hover areas match clickable areas
- [ ] **Gesture Support**: Touch gestures work consistently in both themes
- [ ] **Reduced Motion**: Respects `prefers-reduced-motion` setting
- [ ] **Sticky Elements**: Sticky navigation doesn't interfere with accessibility

### Browser Compatibility Testing

#### Desktop Browsers
- [ ] **Chrome/Chromium**: Full functionality in latest version
- [ ] **Firefox**: Complete theme support including custom properties
- [ ] **Safari**: WebKit-specific features work correctly
- [ ] **Edge**: Microsoft Edge Chromium version compatibility
- [ ] **Opera**: Blink-based Opera support

#### Mobile Browsers
- [ ] **Mobile Safari (iOS)**: iPhone and iPad compatibility
- [ ] **Chrome Mobile (Android)**: Android Chrome browser support
- [ ] **Samsung Internet**: Samsung's default browser compatibility
- [ ] **Firefox Mobile**: Mobile Firefox theme support
- [ ] **WebView**: In-app browser compatibility

#### Legacy Browser Support
- [ ] **Graceful Degradation**: Older browsers show acceptable fallback
- [ ] **Progressive Enhancement**: Core functionality works without dark mode
- [ ] **Polyfill Functionality**: CSS custom property polyfills work correctly
- [ ] **Feature Detection**: Proper detection of dark mode capabilities

### Content-Specific Testing

#### Text Content
- [ ] **Body Text**: All paragraph text is readable in both themes
- [ ] **Code Blocks**: Syntax highlighting works in both themes
- [ ] **Blockquotes**: Quote styling is appropriate for both themes
- [ ] **Lists**: Bullet and numbered lists maintain readability
- [ ] **Tables**: Table content and headers are clearly visible

#### Media Content
- [ ] **Images**: Photos and graphics integrate well with both themes
- [ ] **Videos**: Video players and controls work in both themes
- [ ] **Embedded Content**: Third-party embeds (YouTube, etc.) integrate well
- [ ] **Icons**: All icon fonts and SVGs display correctly
- [ ] **Charts/Graphs**: Data visualizations work in both themes

#### Form Content
- [ ] **Input Fields**: All form inputs are usable in both themes
- [ ] **Validation**: Error and success messages are clearly visible
- [ ] **Placeholders**: Placeholder text has sufficient contrast
- [ ] **Checkboxes/Radio**: Custom form controls work in both themes
- [ ] **File Uploads**: File input styling works correctly

### Performance Metrics

#### Page Load Performance
- [ ] **First Contentful Paint**: No increase in FCP due to theme detection
- [ ] **Largest Contentful Paint**: LCP remains optimized in both themes
- [ ] **Cumulative Layout Shift**: CLS score remains low during theme changes
- [ ] **First Input Delay**: Interaction responsiveness maintained
- [ ] **Time to Interactive**: TTI not affected by dark mode implementation

#### Theme Switch Performance
- [ ] **Switch Duration**: Theme change completes in under 300ms
- [ ] **Smooth Animation**: Transitions are smooth and natural
- [ ] **CPU Usage**: Theme switching doesn't spike CPU usage
- [ ] **Memory Impact**: No memory leaks from repeated theme switching
- [ ] **Battery Impact**: Minimal battery drain from theme functionality

### Edge Cases and Error Handling

#### System Integration
- [ ] **System Theme Changes**: Responds correctly to OS theme changes
- [ ] **Multiple Windows**: Theme syncs across multiple browser windows
- [ ] **Incognito Mode**: Works correctly in private browsing
- [ ] **Extensions**: Compatible with common browser extensions
- [ ] **Print Styles**: Print version uses appropriate colors

#### Error Scenarios
- [ ] **JavaScript Disabled**: Site remains usable without theme toggle
- [ ] **CSS Loading Errors**: Graceful degradation when CSS fails to load
- [ ] **LocalStorage Disabled**: Falls back to system preference
- [ ] **Slow Connections**: Theme toggle works on slow networks
- [ ] **Offline Mode**: Theme toggle works when offline

#### Content Edge Cases
- [ ] **Very Long Content**: Performance maintained with large pages
- [ ] **Dynamic Content**: AJAX-loaded content inherits correct theme
- [ ] **Empty States**: Empty content areas display appropriately
- [ ] **Error Pages**: 404 and error pages support both themes
- [ ] **Loading States**: All loading indicators work in both themes

## Testing Tools and Methods

### Automated Testing Tools
```javascript
// Example test for theme switching
describe('Dark Mode Functionality', () => {
  it('should toggle between light and dark themes', () => {
    // Test theme toggle
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    
    // Test persistence
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });
  
  it('should respect system preference', () => {
    // Mock system preference
    cy.window().then((win) => {
      Object.defineProperty(win, 'matchMedia', {
        writable: true,
        value: cy.stub().returns({
          matches: true, // Dark mode
          addEventListener: cy.stub(),
        }),
      });
    });
    
    // Clear localStorage and reload
    cy.clearLocalStorage();
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });
});
```

### Manual Testing Scripts
```javascript
// Browser console commands for manual testing

// Test contrast ratios
function checkContrast() {
  const elements = document.querySelectorAll('*');
  elements.forEach(el => {
    const styles = getComputedStyle(el);
    const bgColor = styles.backgroundColor;
    const textColor = styles.color;
    
    if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
      console.log(`Element: ${el.tagName}, BG: ${bgColor}, Text: ${textColor}`);
    }
  });
}

// Test theme switching performance
function measureThemeSwitch() {
  const start = performance.now();
  window.toggleTheme();
  const end = performance.now();
  console.log(`Theme switch took ${end - start} milliseconds`);
}

// Test for FOUC
function detectFOUC() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        console.log('Theme change detected at:', Date.now());
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
}
```

### Accessibility Testing Commands
```bash
# axe-core accessibility testing
npx @axe-core/cli https://localhost:3000 --tags wcag2a,wcag2aa

# Lighthouse accessibility audit
npx lighthouse https://localhost:3000 --only-categories=accessibility --chrome-flags="--headless"

# Pa11y accessibility testing
npx pa11y https://localhost:3000
```

### Color Contrast Testing
```javascript
// Test color contrast ratios
function testContrast() {
  const testPairs = [
    ['--color-text-primary', '--color-bg'],
    ['--color-text-secondary', '--color-bg'],
    ['--color-text-muted', '--color-bg'],
    ['--color-primary', '--color-surface'],
  ];
  
  testPairs.forEach(([textVar, bgVar]) => {
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue(textVar).trim();
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue(bgVar).trim();
    
    console.log(`Testing ${textVar} on ${bgVar}:`);
    console.log(`Text: ${textColor}, Background: ${bgColor}`);
    // Use a contrast checking library here
  });
}
```

### Performance Testing
```javascript
// Monitor theme switch performance
function monitorPerformance() {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(`${entry.name}: ${entry.duration}ms`);
    });
  });
  
  observer.observe({ entryTypes: ['measure'] });
  
  // Measure theme switch
  performance.mark('theme-switch-start');
  window.toggleTheme();
  performance.mark('theme-switch-end');
  performance.measure('theme-switch', 'theme-switch-start', 'theme-switch-end');
}
```

## Sign-off Criteria

### Must-Have Requirements
- [ ] All text meets WCAG AA contrast requirements
- [ ] Theme toggle works immediately without errors
- [ ] No FOUC on initial page load
- [ ] Theme preference persists across sessions
- [ ] Works on all supported browsers and devices
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatibility verified

### Should-Have Requirements
- [ ] Smooth transitions between themes (under 300ms)
- [ ] System preference detection working
- [ ] Print styles optimized for readability
- [ ] Performance impact minimal (under 5% overhead)
- [ ] Works offline and with JavaScript disabled (graceful degradation)

### Nice-to-Have Requirements
- [ ] Advanced animations and micro-interactions
- [ ] Theme-aware third-party integrations
- [ ] Prefers-reduced-motion support
- [ ] Color scheme meta tag support
- [ ] Advanced keyboard shortcuts

## Testing Schedule

### Development Phase
- **Daily**: Basic functionality testing during development
- **Weekly**: Cross-browser testing on major browsers
- **Sprint End**: Full accessibility audit

### Pre-Release Phase
- **Feature Complete**: Comprehensive testing checklist execution
- **Code Freeze**: Final performance and accessibility validation
- **Release**: Sign-off from design and accessibility teams

### Post-Release Monitoring
- **Week 1**: Monitor user feedback and error reports
- **Month 1**: Analytics review of theme usage and performance
- **Quarterly**: Comprehensive accessibility re-audit

This testing checklist ensures comprehensive validation of dark mode functionality across all aspects of the user experience.