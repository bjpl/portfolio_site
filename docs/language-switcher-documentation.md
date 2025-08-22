# Enhanced Language Switcher Documentation

## Overview

The Enhanced Language Switcher provides a robust, accessible, and user-friendly language switching experience for the portfolio site. It includes comprehensive URL mappings, smooth transitions, error handling, and accessibility features.

## Features

### ✨ Core Functionality
- **Comprehensive URL Mappings**: Smart mapping between English and Spanish URLs
- **Language Preference Persistence**: Remembers user's language choice using localStorage
- **Auto-Detection**: Detects browser language and suggests switching
- **Smooth Transitions**: Visual feedback during language switching
- **Error Handling**: Graceful fallbacks for missing translations

### 🎯 User Experience
- **Loading Indicators**: Shows progress during language switching
- **Toast Notifications**: Provides feedback for user actions
- **Language Detection Notice**: Suggests switching to detected browser language
- **Accessibility**: Full screen reader support and keyboard navigation

### 🛡️ Reliability
- **Fallback Logic**: Multiple layers of fallback for edge cases
- **Timeout Handling**: Prevents hanging during navigation
- **Error Recovery**: Graceful error handling with user feedback
- **Backward Compatibility**: Works with existing switchLanguage() function

## Implementation

### Files Structure
```
static/js/
├── enhanced-language-switcher.js    # Main implementation
├── language-switcher-tests.js       # Comprehensive test suite
└── url-mappings-complete.js         # URL mappings (if needed)

layouts/
├── _default/baseof.html             # Updated with enhanced switcher
└── partials/header.html             # Accessibility improvements

static/css/
└── main.css                         # Screen reader accessibility styles
```

### Usage

#### Basic Usage
The language switcher initializes automatically when the DOM is ready:

```javascript
// Automatic initialization
document.addEventListener('DOMContentLoaded', () => {
    window.languageSwitcher = new LanguageSwitcher();
});

// Manual usage
window.languageSwitcher.switchLanguage('es'); // Switch to Spanish
window.languageSwitcher.switchLanguage('en'); // Switch to English
```

#### Advanced Usage
```javascript
// Check current language
const currentLang = window.languageSwitcher.getCurrentLanguage();

// Check if switching is in progress
const isSwitching = window.languageSwitcher.isSwitching();

// Show custom notifications
window.languageSwitcher.showToast('Custom message', 'info');

// Access URL mappings
const targetPath = window.languageSwitcher.getTargetPath('es');
```

## URL Mappings

### English to Spanish
| English URL | Spanish URL |
|-------------|-------------|
| `/` | `/es/` |
| `/photography/` | `/es/fotografia/` |
| `/teaching-learning/` | `/es/ensenanza-aprendizaje/` |
| `/me/` | `/es/yo/` |
| `/services/` | `/es/servicios/` |
| `/cv/` | `/es/cv/` |
| `/tools/` | `/es/tools/` |
| `/writing/` | `/es/writing/` |
| `/contact/` | `/es/contact/` |

### Smart Fallback Logic
For URLs not in the direct mapping:
1. **English to Spanish**: Adds `/es` prefix
2. **Spanish to English**: Removes `/es` prefix
3. **Special sections**: Uses specific mappings (e.g., `/fotografia/` → `/photography/`)
4. **404 Fallback**: Redirects to homepage if page doesn't exist

## Accessibility Features

### Screen Reader Support
- Proper ARIA labels and descriptions
- Screen reader only labels (`.sr-only` class)
- Language attributes on options
- Descriptive text for current language

### Keyboard Navigation
- Full keyboard accessibility
- Tab navigation support
- Focus management
- Enter/Space activation

### Visual Accessibility
- High contrast support
- Proper color schemes
- Focus indicators
- Motion reduction support

## User Interface Components

### Loading Indicator
Shows during language switching with:
- Backdrop blur effect
- Animated spinner
- Progress message
- Timeout protection

### Toast Notifications
Provides feedback with:
- Multiple types (info, warning, error)
- Auto-dismiss after 4 seconds
- Close button
- Responsive design

### Language Detection Notice
Appears for new users with:
- Browser language detection
- Switch suggestion
- Dismiss option
- Auto-remove after 8 seconds

## Error Handling

### Navigation Errors
- Timeout protection (2 seconds)
- Fallback to homepage
- User notification
- Retry mechanism

### Invalid Languages
- Graceful handling of invalid language codes
- Prevention of double switching
- User feedback
- State preservation

### Missing Translations
- 404 detection
- Fallback to homepage
- Warning notification
- Path preservation where possible

## Testing

### Automated Test Suite
Run comprehensive tests with:
```javascript
// Run all tests
const tests = new LanguageSwitcherTests();
tests.runAllTests();

// Run specific test
tests.runTest('accessibility');
```

### Test Categories
1. **Initialization**: Object creation and setup
2. **URL Mappings**: Path transformation logic
3. **Language Preferences**: localStorage persistence
4. **Accessibility**: ARIA labels and keyboard navigation
5. **Error Handling**: Edge cases and recovery
6. **User Interface**: Visual components and feedback
7. **Performance**: Speed and memory usage

### Manual Testing
1. Switch between languages on different pages
2. Test with browser language detection
3. Verify accessibility with screen readers
4. Test keyboard navigation
5. Check mobile responsiveness

## Configuration

### URL Mappings
Modify the `urlMappings` object in `enhanced-language-switcher.js`:

```javascript
this.urlMappings = {
    'en': {
        '/new-page/': '/new-page/',
        // Add more mappings
    },
    'es': {
        '/new-page/': '/es/nueva-pagina/',
        // Add more mappings
    }
};
```

### Timeout Settings
Adjust timeouts in the constructor:

```javascript
this.fallbackDelay = 2000; // 2 seconds (adjust as needed)
```

### UI Customization
Modify CSS variables in the injected styles:

```css
:root {
    --accent-color: #007bff;
    --background-color: #fff;
    --text-color: #333;
    --text-color-muted: #666;
}
```

## Browser Support

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Features Used
- ES6 Classes
- async/await
- localStorage
- CSS Custom Properties
- Intersection Observer (for performance)

## Performance Considerations

### Optimization Features
- Lazy loading of non-critical features
- Efficient DOM queries
- Minimal reflows and repaints
- Memory leak prevention

### Memory Management
- Event listener cleanup
- DOM element removal
- Storage cleanup
- Timeout clearing

## Migration Guide

### From Basic Switcher
1. Include `enhanced-language-switcher.js`
2. Update URL mappings if needed
3. Test functionality
4. Remove old switching code (optional)

### Backward Compatibility
The enhanced switcher maintains compatibility with:
- Existing `switchLanguage()` function calls
- Current HTML structure
- Existing CSS classes

## Troubleshooting

### Common Issues

#### Language Switcher Not Working
1. Check console for JavaScript errors
2. Verify `enhanced-language-switcher.js` is loaded
3. Ensure DOM is ready before initialization

#### URL Mappings Incorrect
1. Check `urlMappings` object
2. Verify path formatting (leading/trailing slashes)
3. Test with browser developer tools

#### Accessibility Issues
1. Verify ARIA labels are present
2. Test with screen reader
3. Check keyboard navigation
4. Validate HTML markup

#### Performance Problems
1. Check for memory leaks
2. Monitor network requests
3. Verify CSS animations
4. Test on slower devices

### Debug Mode
Enable debug logging:
```javascript
// In browser console
window.languageSwitcher.debugMode = true;
```

## Future Enhancements

### Planned Features
- RTL language support
- Multiple language support (beyond en/es)
- Advanced caching strategies
- Progressive Web App integration
- Analytics integration

### Potential Improvements
- Server-side rendering support
- CDN integration
- A/B testing capabilities
- Advanced error reporting
- Performance monitoring

## Support

For issues or questions:
1. Check this documentation
2. Run the test suite
3. Review browser console errors
4. Test with different browsers
5. Check network connectivity

## Version History

### v1.0.0 (Current)
- Initial enhanced implementation
- Comprehensive URL mappings
- Full accessibility support
- Error handling and recovery
- Automated test suite
- Performance optimizations