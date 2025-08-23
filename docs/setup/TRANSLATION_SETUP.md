# Translation Service Setup Guide

## Overview
The portfolio site includes a comprehensive translation service that integrates with Claude AI to provide real-time translation in 15 languages.

## Features
- **15 Language Support**: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hebrew, Hindi, Dutch, Swedish
- **RTL Support**: Automatic right-to-left layout for Arabic and Hebrew
- **Caching**: Both server-side and client-side caching for performance
- **Lazy Loading**: Intersection Observer for on-demand translation
- **Markdown Support**: Preserves formatting in content translation
- **Batch Processing**: Efficient bulk translation of multiple texts

## Setup Instructions

### 1. Backend Configuration

#### Environment Variables
Add your Anthropic API key to your `.env` file:
```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

#### Install Dependencies
```bash
cd backend
npm install
```

The following packages are required:
- `@anthropic-ai/sdk` - Claude API client
- `node-cache` - Server-side caching
- `gray-matter` - Markdown frontmatter parsing

### 2. Frontend Configuration

The translation service is automatically initialized when the page loads. It integrates with:
- Language selector component
- Accessibility panel
- Store/state management

### 3. API Endpoints

#### Check Translation Status
```http
GET /api/translate/status
```
Returns service availability and supported languages.

#### Get Supported Languages
```http
GET /api/translate/languages
```
Returns full list of available languages with metadata.

#### Translate Text
```http
POST /api/translate
Content-Type: application/json

{
  "text": "Hello world",
  "targetLang": "es",
  "sourceLang": "en"  // optional, defaults to "en"
}
```

#### Batch Translation
```http
POST /api/translate/batch
Content-Type: application/json

{
  "texts": ["Hello", "World"],
  "targetLang": "fr",
  "sourceLang": "en"
}
```

#### Translate Markdown Content
```http
POST /api/translate/content
Content-Type: application/json

{
  "content": "# Hello\n\nThis is **markdown**",
  "targetLang": "de",
  "sourceLang": "en"
}
```

## Usage Examples

### Frontend JavaScript
```javascript
// Using the global translation service
if (window.translationService) {
  // Translate entire page
  await window.translationService.translatePage('es');
  
  // Translate specific text
  const translated = await window.translationService.translateText(
    'Welcome to my site',
    'fr'
  );
  
  // Get current language
  const currentLang = window.translationService.getCurrentLanguage();
}
```

### React Component
```jsx
import translationService from '@/services/translationService';

function MyComponent() {
  const handleTranslate = async (langCode) => {
    await translationService.translatePage(langCode);
  };
  
  return (
    <LanguageSelector onChange={handleTranslate} />
  );
}
```

### Testing Translation

Run the test script to verify your setup:
```bash
node backend/src/test/testTranslation.js
```

## Language Codes

| Code | Language | Native Name | Direction |
|------|----------|-------------|-----------|
| en | English | English | LTR |
| es | Spanish | Español | LTR |
| fr | French | Français | LTR |
| de | German | Deutsch | LTR |
| it | Italian | Italiano | LTR |
| pt | Portuguese | Português | LTR |
| ru | Russian | Русский | LTR |
| zh | Chinese | 中文 | LTR |
| ja | Japanese | 日本語 | LTR |
| ko | Korean | 한국어 | LTR |
| ar | Arabic | العربية | RTL |
| he | Hebrew | עברית | RTL |
| hi | Hindi | हिन्दी | LTR |
| nl | Dutch | Nederlands | LTR |
| sv | Swedish | Svenska | LTR |

## Performance Considerations

### Caching Strategy
- **Server Cache**: 24-hour TTL, max 10,000 entries
- **Client Cache**: LocalStorage with 1,000 entry limit
- **Memory Cache**: In-memory Map for current session

### Optimization Tips
1. Use batch translation for multiple elements
2. Enable lazy loading for below-fold content
3. Mark non-translatable content with `no-translate` class
4. Cache translations persist across sessions

## Troubleshooting

### Translation Not Working
1. Check if `ANTHROPIC_API_KEY` is set
2. Verify API key has sufficient credits
3. Check browser console for errors
4. Test with `/api/translate/status` endpoint

### Styling Issues
- RTL languages automatically set `dir="rtl"` on document
- Use CSS logical properties for RTL compatibility
- Test with Arabic or Hebrew to verify RTL layout

### Performance Issues
- Enable lazy translation for large pages
- Increase cache TTL if appropriate
- Use batch endpoints for multiple translations
- Consider pre-translating static content

## Security Notes

- API key is never exposed to frontend
- Translation requests can be rate-limited
- Admin-only cache clearing endpoint
- Optional authentication for tracking usage

## Integration with CMS

The translation service integrates with the existing content management:
- Preserves Hugo shortcodes
- Maintains markdown formatting
- Translates frontmatter metadata
- Compatible with versioning system

## Future Enhancements

Potential improvements to consider:
- [ ] Glossary/dictionary for consistent translations
- [ ] Custom translation rules per project
- [ ] Translation memory database
- [ ] Automatic language detection
- [ ] Translation quality scoring
- [ ] Collaborative translation review
- [ ] Export/import translation bundles