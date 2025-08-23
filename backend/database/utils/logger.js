/**
 * Database Logger Utility
 * Provides structured logging for database operations
 */

const fs = require('fs');
const path = require('path');

class DatabaseLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../../logs/database');
    this.ensureLogDirectory();
    this.logLevel = process.env.DB_LOG_LEVEL || 'info';
    this.enableFileLogging = process.env.DB_FILE_LOGGING !== 'false';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log entry
   */
  formatLog(level, message, meta = {}) {
    return {
      timestamp: this.getTimestamp(),
      level,
      message,
      meta,
      pid: process.pid
    };
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Write to console
   */
  writeToConsole(level, formattedLog) {
    const colorize = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[37m'
    };
    
    const reset = '\x1b[0m';
    const timestamp = formattedLog.timestamp;
    const message = typeof formattedLog.message === 'object' 
      ? JSON.stringify(formattedLog.message, null, 2)
      : formattedLog.message;
    
    const metaStr = Object.keys(formattedLog.meta).length > 0
      ? ` ${JSON.stringify(formattedLog.meta)}`
      : '';

    console.log(
      `${colorize[level]}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}${metaStr}`
    );
  }

  /**
   * Write to file
   */
  writeToFile(level, formattedLog) {
    if (!this.enableFileLogging) return;

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${today}.log`);
    const errorLogFile = path.join(this.logDir, `${today}-error.log`);

    const logLine = JSON.stringify(formattedLog) + '\n';

    // Write to main log file
    fs.appendFileSync(logFile, logLine);

    // Write errors to separate error log
    if (level === 'error') {
      fs.appendFileSync(errorLogFile, logLine);
    }
  }

  /**
   * Main logging function
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedLog = this.formatLog(level, message, meta);
    
    this.writeToConsole(level, formattedLog);
    this.writeToFile(level, formattedLog);
  }

  /**
   * Error logging
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  /**
   * Warning logging
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Info logging
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Debug logging
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Query logging with timing
   */
  query(query, duration, params = {}) {
    const meta = {
      query: query.slice(0, 200), // Truncate long queries
      duration: `${duration}ms`,
      params
    };

    if (duration > 1000) {
      this.warn('Slow query detected', meta);
    } else {
      this.debug('Query executed', meta);
    }
  }

  /**
   * Transaction logging
   */
  transaction(action, meta = {}) {
    this.info(`Transaction ${action}`, meta);
  }

  /**
   * Connection logging
   */
  connection(status, meta = {}) {
    const level = status === 'connected' ? 'info' : 'error';
    this.log(level, `Database ${status}`, meta);
  }

  /**
   * Migration logging
   */
  migration(action, meta = {}) {
    this.info(`Migration ${action}`, meta);
  }

  /**
   * Seed logging
   */
  seed(action, meta = {}) {
    this.info(`Seed ${action}`, meta);
  }

  /**
   * Backup logging
   */
  backup(action, meta = {}) {
    this.info(`Backup ${action}`, meta);
  }

  /**
   * Performance logging
   */
  performance(metric, value, meta = {}) {
    this.info(`Performance: ${metric} = ${value}`, meta);
  }

  /**
   * Security logging
   */
  security(event, meta = {}) {
    this.warn(`Security event: ${event}`, meta);
  }

  /**
   * Cleanup old log files
   */
  cleanup(retentionDays = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      files.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoff) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned up old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Error cleaning up log files:', { error: error.message });
    }
  }

  /**
   * Get log statistics
   */
  getStats() {
    try {
      const files = fs.readdirSync(this.logDir);
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        oldestLog: null,
        newestLog: null,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        debugCount: 0
      };

      files.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const fileStats = fs.statSync(filePath);
          
          stats.totalFiles++;
          stats.totalSize += fileStats.size;
          
          if (!stats.oldestLog || fileStats.mtime < stats.oldestLog) {
            stats.oldestLog = fileStats.mtime;
          }
          
          if (!stats.newestLog || fileStats.mtime > stats.newestLog) {
            stats.newestLog = fileStats.mtime;
          }

          // Count log levels in today's log
          if (file === `${new Date().toISOString().split('T')[0]}.log`) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              try {
                const log = JSON.parse(line);
                stats[`${log.level}Count`]++;
              } catch (e) {
                // Skip malformed log lines
              }
            });
          }
        }
      });

      return stats;
    } catch (error) {
      this.error('Error getting log stats:', { error: error.message });
      return null;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseLogger();