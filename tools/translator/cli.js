#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import matter from 'gray-matter';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const program = new Command();

class Translator {
    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error(chalk.red('❌ ANTHROPIC_API_KEY not found in .env file'));
            process.exit(1);
        }
        
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    }
    
    async translateMarkdown(filePath, targetLang = 'es') {
        const spinner = ora(`Translating ${path.basename(filePath)} to ${targetLang}...`).start();
        
        try {
            // Read the file
            const content = await fs.readFile(filePath, 'utf-8');
            const { data: frontmatter, content: markdown } = matter(content);
            
            // Translate content
            const translatedMarkdown = await this.translateText(markdown, targetLang);
            
            // Translate frontmatter fields
            const translatedFrontmatter = { ...frontmatter };
            if (frontmatter.title) {
                translatedFrontmatter.title = await this.translateText(frontmatter.title, targetLang);
            }
            if (frontmatter.description) {
                translatedFrontmatter.description = await this.translateText(frontmatter.description, targetLang);
            }
            
            // Build output path
            const outputPath = this.getTranslatedPath(filePath, targetLang);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            
            // Write translated file
            const output = matter.stringify(translatedMarkdown, translatedFrontmatter);
            await fs.writeFile(outputPath, output, 'utf-8');
            
            spinner.succeed(chalk.green(`✓ Translated to ${outputPath}`));
            return outputPath;
            
        } catch (error) {
            spinner.fail(chalk.red(`✗ Failed: ${error.message}`));
            throw error;
        }
    }
    
    async translateText(text, targetLang) {
        const langMap = {
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ja': 'Japanese',
            'zh': 'Chinese'
        };
        
        const targetLanguage = langMap[targetLang] || targetLang;
        
        const message = await this.anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            temperature: 0.3,
            messages: [{
                role: 'user',
                content: `Translate the following text to ${targetLanguage}. Maintain the same tone, style, and any Markdown formatting. Only provide the translation, no explanations.\n\nText to translate:\n${text}`
            }]
        });
        
        return message.content[0].text;
    }
    
    getTranslatedPath(originalPath, targetLang) {
        // Convert content/section/file.md to content/es/section/file.md
        const parts = originalPath.split(path.sep);
        const contentIndex = parts.indexOf('content');
        
        if (contentIndex !== -1) {
            // Map English sections to Spanish
            const sectionMap = {
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
            };
            
            // Insert language code after 'content'
            parts.splice(contentIndex + 1, 0, targetLang);
            
            // Translate section names if Spanish
            if (targetLang === 'es') {
                for (let i = contentIndex + 2; i < parts.length - 1; i++) {
                    if (sectionMap[parts[i]]) {
                        parts[i] = sectionMap[parts[i]];
                    }
                }
            }
        }
        
        return parts.join(path.sep);
    }
}

program
    .name('hugo-translate')
    .description('Translate Hugo content using Claude AI')
    .version('1.0.0');

program
    .command('file <path>')
    .description('Translate a single markdown file')
    .option('-l, --lang <language>', 'Target language', 'es')
    .action(async (filePath, options) => {
        const translator = new Translator();
        await translator.translateMarkdown(filePath, options.lang);
    });

program
    .command('batch')
    .description('Translate all content files')
    .option('-l, --lang <language>', 'Target language', 'es')
    .option('-s, --source <pattern>', 'Source pattern', 'content/**/*.md')
    .action(async (options) => {
        const translator = new Translator();
        const glob = (await import('glob')).default;
        
        const files = await glob(options.source, {
            ignore: [`content/${options.lang}/**`]
        });
        
        console.log(chalk.cyan(`Found ${files.length} files to translate`));
        
        for (const file of files) {
            await translator.translateMarkdown(file, options.lang);
        }
        
        console.log(chalk.green('✓ All translations complete!'));
    });

program.parse();
