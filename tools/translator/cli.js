#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { Translator } from './translator.js';
import { findContentFiles, parseMarkdown, saveTranslation } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

program
  .name('hugo-translator')
  .description('Translate Hugo content using Claude AI')
  .version('1.0.0');

program
  .command('translate <file>')
  .description('Translate a single content file')
  .option('-l, --language <lang>', 'Target language code', 'es')
  .option('-o, --output <path>', 'Output path')
  .option('-f, --force', 'Overwrite existing translations')
  .action(async (file, options) => {
    const spinner = ora('Initializing translator...').start();
    
    try {
      const translator = new Translator(process.env.ANTHROPIC_API_KEY);
      
      spinner.text = 'Reading content file...';
      const content = await fs.readFile(file, 'utf-8');
      const { frontmatter, body } = parseMarkdown(content);
      
      spinner.text = 'Translating content...';
      const translated = await translator.translateContent(body, options.language);
      
      spinner.text = 'Translating metadata...';
      const translatedMeta = await translator.translateMetadata(frontmatter, options.language);
      
      const outputPath = options.output || file.replace('/content/', `/content/${options.language}/`);
      await saveTranslation(outputPath, translatedMeta, translated);
      
      spinner.succeed(chalk.green(`✓ Translated to ${outputPath}`));
    } catch (error) {
      spinner.fail(chalk.red(`✗ Translation failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Translate multiple files')
  .option('-s, --source <pattern>', 'Source file pattern', 'content/**/*.md')
  .option('-l, --language <lang>', 'Target language code', 'es')
  .option('-c, --concurrent <number>', 'Concurrent translations', '3')
  .action(async (options) => {
    const spinner = ora('Finding content files...').start();
    
    try {
      const files = await findContentFiles(options.source);
      spinner.succeed(chalk.green(`Found ${files.length} files to translate`));
      
      const translator = new Translator(process.env.ANTHROPIC_API_KEY);
      const concurrent = parseInt(options.concurrent);
      
      for (let i = 0; i < files.length; i += concurrent) {
        const batch = files.slice(i, i + concurrent);
        await Promise.all(batch.map(file => 
          translator.translateFile(file, options.language)
        ));
        console.log(chalk.cyan(`Progress: ${Math.min(i + concurrent, files.length)}/${files.length}`));
      }
      
      console.log(chalk.green('✓ All translations complete!'));
    } catch (error) {
      spinner.fail(chalk.red(`✗ Batch translation failed: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();