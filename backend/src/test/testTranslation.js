/**
 * Test script for translation service
 * Run with: node backend/src/test/testTranslation.js
 */

const { Translator } = require('../../../tools/translator/translator');

async function testTranslation() {
  console.log('Testing Translation Service...\n');

  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY not set in environment');
    console.log('To enable translation, add to your .env file:');
    console.log('ANTHROPIC_API_KEY=your_api_key_here\n');
    return;
  }

  console.log('✅ ANTHROPIC_API_KEY found\n');

  try {
    // Initialize translator
    const translator = new Translator(process.env.ANTHROPIC_API_KEY);
    console.log('✅ Translator initialized\n');

    // Test simple text translation
    console.log('Testing simple text translation...');
    const testText = 'Hello, welcome to my portfolio website!';
    console.log(`Original: ${testText}`);

    const languages = ['es', 'fr', 'de', 'ja', 'ar'];

    for (const lang of languages) {
      try {
        const translated = await translator.translateText(testText, lang);
        console.log(`${lang.toUpperCase()}: ${translated}`);
      } catch (error) {
        console.log(`❌ Failed to translate to ${lang}: ${error.message}`);
      }
    }

    console.log('\n✅ Translation service is working correctly!');

    // Test markdown content
    console.log('\nTesting markdown content translation...');
    const markdownContent = `
# Welcome to My Portfolio

This is a **bold** statement and this is *italic*.

## Features
- Item 1
- Item 2
- Item 3

\`\`\`javascript
// This code should not be translated
const greeting = "Hello World";
console.log(greeting);
\`\`\`

Visit my [GitHub](https://github.com) for more projects.
    `;

    const translatedMarkdown = await translator.translateContent(markdownContent, 'es');
    console.log('Translated to Spanish:');
    console.log(translatedMarkdown);

    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('❌ Translation test failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

// Run test
testTranslation();
