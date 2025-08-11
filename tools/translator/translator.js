import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export class Translator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    
    this.client = new Anthropic({
      apiKey: apiKey
    });
    
    this.cache = new Map();
  }
  
  async translateContent(content, targetLang) {
    // Check cache
    const cacheKey = `${targetLang}:${content.substring(0, 50)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const prompt = `
      Translate the following Markdown content to ${this.getLanguageName(targetLang)}.
      Preserve all Markdown formatting, links, and code blocks.
      Maintain the same tone and style.
      Do not translate code blocks, URLs, or Hugo shortcodes.
      
      Content:
      ${content}
    `;
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const translated = response.content[0].text;
      this.cache.set(cacheKey, translated);
      
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Failed to translate content: ${error.message}`);
    }
  }
  
  async translateMetadata(frontmatter, targetLang) {
    const translatable = ['title', 'description', 'summary'];
    const translated = { ...frontmatter };
    
    for (const field of translatable) {
      if (frontmatter[field]) {
        translated[field] = await this.translateText(frontmatter[field], targetLang);
      }
    }
    
    // Update locale
    translated.locale = this.getLocaleCode(targetLang);
    
    return translated;
  }
  
  async translateText(text, targetLang) {
    const prompt = `
      Translate to ${this.getLanguageName(targetLang)}: "${text}"
      Provide only the translation, no explanation.
    `;
    
    const response = await this.client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    return response.content[0].text.trim().replace(/^"|"$/g, '');
  }
  
  async translateFile(filePath, targetLang) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    
    const translatedBody = await this.translateContent(body, targetLang);
    const translatedData = await this.translateMetadata(data, targetLang);
    
    const outputPath = this.getOutputPath(filePath, targetLang);
    await this.saveTranslation(outputPath, translatedData, translatedBody);
    
    return outputPath;
  }
  
  getOutputPath(filePath, targetLang) {
    return filePath.replace('/content/', `/content/${targetLang}/`);
  }
  
  async saveTranslation(outputPath, frontmatter, content) {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    const output = matter.stringify(content, frontmatter);
    await fs.writeFile(outputPath, output, 'utf-8');
  }
  
  getLanguageName(code) {
    const languages = {
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean'
    };
    return languages[code] || code;
  }
  
  getLocaleCode(code) {
    const locales = {
      es: 'es_ES',
      fr: 'fr_FR',
      de: 'de_DE',
      it: 'it_IT',
      pt: 'pt_PT',
      ja: 'ja_JP',
      zh: 'zh_CN',
      ko: 'ko_KR'
    };
    return locales[code] || code;
  }
}