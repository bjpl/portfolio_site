/**
 * Migration Utility Functions
 * Shared utilities for migration operations
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File system utilities
 */
export class FileUtils {
  static async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error.message);
      return false;
    }
  }

  static async readFileContent(filePath) {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  static async writeFileContent(filePath, content) {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error.message);
      return false;
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      return null;
    }
  }
}

/**
 * Checksum utilities
 */
export class ChecksumUtils {
  static calculateSHA256(content) {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  static calculateMD5(content) {
    return crypto.createHash('md5').update(content, 'utf-8').digest('hex');
  }

  static verifyChecksum(content, expectedChecksum, algorithm = 'sha256') {
    const actualChecksum = algorithm === 'md5' 
      ? this.calculateMD5(content)
      : this.calculateSHA256(content);
    
    return actualChecksum === expectedChecksum;
  }
}

/**
 * SQL parsing utilities
 */
export class SQLUtils {
  static splitStatements(sql) {
    // More sophisticated SQL statement splitting
    const statements = [];
    let current = '';
    let inString = false;
    let stringChar = null;
    let inComment = false;
    let commentType = null;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      // Handle comments
      if (!inString) {
        if (char === '-' && nextChar === '-') {
          inComment = true;
          commentType = 'line';
          i++; // Skip next char
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inComment = true;
          commentType = 'block';
          i++; // Skip next char
          continue;
        }
        if (inComment) {
          if (commentType === 'line' && char === '\n') {
            inComment = false;
            commentType = null;
          }
          if (commentType === 'block' && char === '*' && nextChar === '/') {
            inComment = false;
            commentType = null;
            i++; // Skip next char
          }
          continue;
        }
      }

      // Handle strings
      if (!inComment) {
        if (!inString && (char === "'" || char === '"')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          // Check for escaped quotes
          if (sql[i - 1] !== '\\') {
            inString = false;
            stringChar = null;
          }
        }
      }

      // Handle statement termination
      if (!inString && !inComment && char === ';') {
        const statement = current.trim();
        if (statement.length > 0) {
          statements.push(statement);
        }
        current = '';
        continue;
      }

      if (!inComment) {
        current += char;
      }
    }

    // Add remaining content if any
    const finalStatement = current.trim();
    if (finalStatement.length > 0) {
      statements.push(finalStatement);
    }

    return statements.filter(stmt => stmt.length > 0);
  }

  static extractTableName(createTableSQL) {
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/i;
    const match = createTableSQL.match(regex);
    return match ? match[1] : null;
  }

  static generateDropTableSQL(tableName) {
    return `DROP TABLE IF EXISTS public.${tableName} CASCADE;`;
  }

  static isDestructiveOperation(sql) {
    const destructivePatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+DATABASE/i,
      /TRUNCATE\s+TABLE/i,
      /DELETE\s+FROM.*(?!WHERE)/i, // DELETE without WHERE
      /UPDATE.*SET.*(?!WHERE)/i    // UPDATE without WHERE
    ];

    return destructivePatterns.some(pattern => pattern.test(sql));
  }

  static validateSQLSyntax(sql) {
    // Basic SQL syntax validation
    const errors = [];
    
    // Check for unmatched parentheses
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unmatched parentheses');
    }

    // Check for unmatched quotes
    const singleQuotes = (sql.match(/'/g) || []).length;
    const doubleQuotes = (sql.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Unmatched single quotes');
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unmatched double quotes');
    }

    // Check for basic SQL keywords
    const hasKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(sql);
    if (!hasKeywords && sql.trim().length > 0) {
      errors.push('No valid SQL keywords found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Migration file utilities
 */
export class MigrationFileUtils {
  static parseMigrationFilename(filename) {
    const match = filename.match(/^(\d{14})_(.+)\.sql$/);
    if (!match) {
      return null;
    }

    const [, timestamp, name] = match;
    return {
      timestamp,
      name: name.replace(/_/g, ' '),
      filename,
      version: timestamp
    };
  }

  static generateMigrationFilename(name) {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '');
    
    const cleanName = name.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    return `${timestamp}_${cleanName}.sql`;
  }

  static sortMigrationFiles(files) {
    return files
      .map(file => this.parseMigrationFilename(file))
      .filter(parsed => parsed !== null)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map(parsed => parsed.filename);
  }

  static async scanMigrationDirectory(directory) {
    try {
      const files = await fs.readdir(directory);
      const sqlFiles = files.filter(file => 
        file.endsWith('.sql') && 
        !file.includes('rollback') &&
        !file.includes('temp')
      );
      
      return this.sortMigrationFiles(sqlFiles);
    } catch (error) {
      throw new Error(`Failed to scan migration directory: ${error.message}`);
    }
  }
}

/**
 * Logging utilities
 */
export class LogUtils {
  static formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...metadata
    };

    return JSON.stringify(entry);
  }

  static async appendToLogFile(logFile, entry) {
    try {
      await FileUtils.ensureDirectory(path.dirname(logFile));
      await fs.appendFile(logFile, entry + '\n');
      return true;
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
      return false;
    }
  }

  static async rotateLogs(logDirectory, maxFiles = 10) {
    try {
      const files = await fs.readdir(logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('migration-') && file.endsWith('.log'))
        .sort()
        .reverse();

      // Remove old log files
      if (logFiles.length > maxFiles) {
        const filesToDelete = logFiles.slice(maxFiles);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(logDirectory, file));
        }
      }
    } catch (error) {
      console.error(`Failed to rotate logs: ${error.message}`);
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceUtils {
  static startTimer() {
    return Date.now();
  }

  static endTimer(startTime) {
    return Date.now() - startTime;
  }

  static formatDuration(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    
    if (seconds < 60) {
      return `${seconds}.${Math.floor(ms / 100)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds}s`;
  }

  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  static validateDatabaseConnection(client) {
    // Will be implemented based on database client type
    return Promise.resolve(true);
  }

  static validateMigrationContent(content) {
    const errors = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('Migration content is empty');
    }

    const syntaxCheck = SQLUtils.validateSQLSyntax(content);
    if (!syntaxCheck.isValid) {
      errors.push(...syntaxCheck.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateEnvironment() {
    const errors = [];
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export {
  FileUtils,
  ChecksumUtils,
  SQLUtils,
  MigrationFileUtils,
  LogUtils,
  PerformanceUtils,
  ValidationUtils
};