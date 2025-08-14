// tools/translator/utils.js

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

/**
 * Find all content files matching a pattern
 * @param {string} pattern - Glob pattern for finding files
 * @returns {Promise<string[]>} Array of file paths
 */
export async function findContentFiles(pattern) {
  const files = await glob(pattern, {
    ignore: [
      '**/node_modules/**',
      '**/public/**',
      '**/resources/**',
      '**/_index.md',
      '**/es/**',
      '**/fr/**',
      '**/de/**'
    ]
  });
  
  // Filter to only markdown files
  return files.filter(file => file.endsWith('.md'));
}

/**
 * Parse markdown file with frontmatter
 * @param {string} content - Raw markdown content
 * @returns {Object} Parsed frontmatter and body
 */
export function parseMarkdown(content) {
  const { data, content: body } = matter(content);
  return {
    frontmatter: data,
    body: body.trim()
  };
}

/**
 * Save translated content to file
 * @param {string} outputPath - Destination file path
 * @param {Object} frontmatter - Translated frontmatter
 * @param {string} body - Translated body content
 */
export async function saveTranslation(outputPath, frontmatter, body) {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  
  // Combine frontmatter and body
  const output = matter.stringify(body, frontmatter);
  
  // Write file
  await fs.writeFile(outputPath, output, 'utf-8');
}

/**
 * Get translated file path based on language
 * @param {string} originalPath - Original file path
 * @param {string} targetLang - Target language code
 * @returns {string} Translated file path
 */
export function getTranslatedPath(originalPath, targetLang) {
  const parts = originalPath.split(path.sep);
  const contentIndex = parts.indexOf('content');
  
  if (contentIndex === -1) {
    throw new Error('Not a content file');
  }
  
  // Language-specific section mappings
  const sectionMaps = {
    es: {
      'make': 'hacer',
      'learn': 'aprender',
      'think': 'pensar',
      'meet': 'conocer',
      'words': 'palabras',
      'sounds': 'sonidos',
      'visuals': 'visuales',
      'built': 'construido',
      'found': 'encontrado',
      'strategies': 'estrategias',
      'positions': 'posiciones',
      'links': 'enlaces',
      'me': 'yo',
      'work': 'trabajo'
    },
    fr: {
      'make': 'faire',
      'learn': 'apprendre',
      'think': 'penser',
      'meet': 'rencontrer',
      'words': 'mots',
      'sounds': 'sons',
      'visuals': 'visuels',
      'built': 'construit',
      'found': 'trouvé',
      'strategies': 'stratégies',
      'positions': 'positions',
      'links': 'liens',
      'me': 'moi',
      'work': 'travail'
    }
  };
  
  // Clone parts array
  const translatedParts = [...parts];
  
  // Insert language code after 'content'
  translatedParts.splice(contentIndex + 1, 0, targetLang);
  
  // Translate section names if mapping exists
  if (sectionMaps[targetLang]) {
    const map = sectionMaps[targetLang];
    for (let i = contentIndex + 2; i < translatedParts.length - 1; i++) {
      if (map[translatedParts[i]]) {
        translatedParts[i] = map[translatedParts[i]];
      }
    }
  }
  
  return translatedParts.join(path.sep);
}

/**
 * Check if a translation already exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if file exists
 */
export async function translationExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get language name from code
 * @param {string} code - Language code
 * @returns {string} Full language name
 */
export function getLanguageName(code) {
  const languages = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi'
  };
  return languages[code] || code;
}

/**
 * Validate language code
 * @param {string} code - Language code to validate
 * @returns {boolean} True if valid
 */
export function isValidLanguageCode(code) {
  const validCodes = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'ru', 'ar', 'hi'];
  return validCodes.includes(code);
}

/**
 * Extract translatable strings from content
 * @param {string} content - Content to analyze
 * @returns {Array} Array of translatable segments
 */
export function extractTranslatableSegments(content) {
  const segments = [];
  
  // Split by code blocks to avoid translating them
  const parts = content.split(/```[\s\S]*?```/);
  
  parts.forEach((part, index) => {
    if (part.trim()) {
      // Split by paragraphs for better translation context
      const paragraphs = part.split(/\n\n+/);
      paragraphs.forEach(para => {
        if (para.trim() && !para.startsWith('{{') && !para.startsWith('//')) {
          segments.push({
            index,
            type: 'text',
            content: para.trim()
          });
        }
      });
    }
  });
  
  return segments;
}

/**
 * Create translation report
 * @param {Array} files - Files processed
 * @param {string} targetLang - Target language
 * @returns {Object} Report object
 */
export function createTranslationReport(files, targetLang) {
  const report = {
    timestamp: new Date().toISOString(),
    targetLanguage: targetLang,
    totalFiles: files.length,
    processedFiles: [],
    failedFiles: [],
    statistics: {
      totalWords: 0,
      totalCharacters: 0
    }
  };
  
  return report;
}

/**
 * Estimate translation cost (for Claude API)
 * @param {string} content - Content to translate
 * @returns {Object} Cost estimation
 */
export function estimateTranslationCost(content) {
  // Rough estimation based on Claude's pricing
  // Assuming ~4 characters per token
  const tokens = Math.ceil(content.length / 4);
  const inputTokens = tokens;
  const outputTokens = tokens * 1.2; // Translations are often slightly longer
  
  // Claude-3 Opus pricing (as of 2024)
  const inputCostPer1k = 0.015;
  const outputCostPer1k = 0.075;
  
  const estimatedCost = (
    (inputTokens / 1000) * inputCostPer1k +
    (outputTokens / 1000) * outputCostPer1k
  );
  
  return {
    inputTokens,
    outputTokens: Math.ceil(outputTokens),
    estimatedCost: estimatedCost.toFixed(4),
    currency: 'USD'
  };
}