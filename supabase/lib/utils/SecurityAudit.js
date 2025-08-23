const { User } = require('../../models/User');
const ApiKey = require('../models/ApiKey');
const AuthAttempt = require('../models/AuthAttempt');
const RefreshToken = require('../models/RefreshToken');
const OAuthProvider = require('../models/OAuthProvider');
const PasswordService = require('../services/PasswordService');
const TokenService = require('../services/TokenService');

class SecurityAudit {
  constructor() {
    this.findings = [];
    this.recommendations = [];
  }

  /**
   * Run comprehensive security audit
   */
  async runAudit() {
    this.findings = [];
    this.recommendations = [];

    console.log('🔍 Starting security audit...');

    await this.auditUsers();
    await this.auditPasswords();
    await this.auditTokens();
    await this.auditApiKeys();
    await this.auditAuthAttempts();
    await this.auditOAuthProviders();
    await this.auditConfiguration();

    return this.generateReport();
  }

  /**
   * Audit user accounts
   */
  async auditUsers() {
    console.log('👥 Auditing user accounts...');

    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'isActive', 'isEmailVerified', 
                    'lastLogin', 'loginAttempts', 'lockoutUntil', 'createdAt']
      });

      // Check for inactive admin accounts
      const inactiveAdmins = users.filter(user => 
        user.role === 'admin' && !user.isActive
      );
      
      if (inactiveAdmins.length > 0) {
        this.addFinding('warning', 'Inactive admin accounts found', 
          `${inactiveAdmins.length} admin account(s) are inactive`);
      }

      // Check for users without email verification
      const unverifiedUsers = users.filter(user => 
        !user.isEmailVerified && user.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      if (unverifiedUsers.length > 0) {
        this.addFinding('info', 'Unverified email addresses', 
          `${unverifiedUsers.length} users have unverified emails older than 7 days`);
      }

      // Check for locked accounts
      const lockedAccounts = users.filter(user => 
        user.lockoutUntil && user.lockoutUntil > new Date()
      );
      
      if (lockedAccounts.length > 0) {
        this.addFinding('info', 'Locked accounts', 
          `${lockedAccounts.length} account(s) are currently locked`);
      }

      // Check for stale accounts (no login in 90 days)
      const staleAccounts = users.filter(user => {
        if (!user.lastLogin) return false;
        return user.lastLogin < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      });
      
      if (staleAccounts.length > 0) {
        this.addFinding('warning', 'Stale accounts', 
          `${staleAccounts.length} account(s) haven't logged in for 90+ days`);
        this.addRecommendation('Consider deactivating or contacting owners of stale accounts');
      }

      // Check admin to user ratio
      const adminCount = users.filter(u => u.role === 'admin').length;
      const totalUsers = users.length;
      const adminRatio = adminCount / totalUsers;

      if (adminRatio > 0.1) {
        this.addFinding('warning', 'High admin ratio', 
          `${((adminRatio * 100).toFixed(1))}% of users are admins`);
        this.addRecommendation('Review admin privileges and apply principle of least privilege');
      }

    } catch (error) {
      this.addFinding('error', 'User audit failed', error.message);
    }
  }

  /**
   * Audit password security
   */
  async auditPasswords() {
    console.log('🔐 Auditing password security...');

    try {
      // Check password policy configuration
      const samplePassword = 'TestPassword123!';
      const validation = PasswordService.validatePassword(samplePassword);
      
      if (!validation.isValid) {
        this.addFinding('error', 'Password policy too strict', 
          'Default password policy rejects valid passwords');
      }

      // Check for weak password algorithm detection
      const weakPassword = 'password';
      const weakValidation = PasswordService.validatePassword(weakPassword);
      
      if (weakValidation.isValid) {
        this.addFinding('critical', 'Weak password policy', 
          'Password policy allows weak passwords');
      }

      // Check password hashing method
      const useArgon2 = process.env.USE_ARGON2 === 'true';
      if (!useArgon2) {
        this.addFinding('info', 'Using bcrypt for password hashing', 
          'Consider upgrading to Argon2 for better security');
        this.addRecommendation('Set USE_ARGON2=true to enable Argon2 password hashing');
      }

    } catch (error) {
      this.addFinding('error', 'Password audit failed', error.message);
    }
  }

  /**
   * Audit token security
   */
  async auditTokens() {
    console.log('🎫 Auditing token security...');

    try {
      const tokens = await RefreshToken.findAll({
        attributes: ['id', 'userId', 'familyId', 'generation', 'isActive', 
                    'isRevoked', 'expiresAt', 'lastUsedAt', 'createdAt']
      });

      // Check for expired tokens still in database
      const expiredTokens = tokens.filter(token => 
        token.expiresAt < new Date() && !token.isRevoked
      );
      
      if (expiredTokens.length > 0) {
        this.addFinding('warning', 'Expired tokens in database', 
          `${expiredTokens.length} expired tokens need cleanup`);
        this.addRecommendation('Run token cleanup task regularly');
      }

      // Check for long token chains (potential token theft)
      const tokensByFamily = tokens.reduce((acc, token) => {
        acc[token.familyId] = (acc[token.familyId] || 0) + 1;
        return acc;
      }, {});

      const longChains = Object.values(tokensByFamily).filter(count => count > 10);
      
      if (longChains.length > 0) {
        this.addFinding('warning', 'Long token chains detected', 
          `${longChains.length} token families have excessive generations`);
        this.addRecommendation('Investigate potential token theft or excessive refresh');
      }

      // Check for old unused tokens
      const oldTokens = tokens.filter(token => 
        token.lastUsedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      
      if (oldTokens.length > 0) {
        this.addFinding('info', 'Old unused tokens', 
          `${oldTokens.length} tokens haven't been used in 30+ days`);
      }

      // Check JWT configuration
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        this.addFinding('critical', 'Weak JWT secret', 
          'JWT secret is missing or too short');
        this.addRecommendation('Use a strong JWT secret (at least 32 characters)');
      }

    } catch (error) {
      this.addFinding('error', 'Token audit failed', error.message);
    }
  }

  /**
   * Audit API keys
   */
  async auditApiKeys() {
    console.log('🔑 Auditing API keys...');

    try {
      const apiKeys = await ApiKey.findAll({
        attributes: ['id', 'userId', 'name', 'permissions', 'allowedIPs', 
                    'rateLimit', 'totalUsage', 'isActive', 'expiresAt', 
                    'lastUsedAt', 'createdAt']
      });

      // Check for keys with admin permissions
      const adminKeys = apiKeys.filter(key => key.permissions.admin);
      
      if (adminKeys.length > 0) {
        this.addFinding('warning', 'API keys with admin permissions', 
          `${adminKeys.length} API key(s) have admin privileges`);
        this.addRecommendation('Regularly review API keys with elevated permissions');
      }

      // Check for keys without IP restrictions
      const unrestrictedKeys = apiKeys.filter(key => 
        key.allowedIPs.length === 0 && key.permissions.write
      );
      
      if (unrestrictedKeys.length > 0) {
        this.addFinding('warning', 'API keys without IP restrictions', 
          `${unrestrictedKeys.length} write-enabled key(s) have no IP restrictions`);
        this.addRecommendation('Consider adding IP restrictions to sensitive API keys');
      }

      // Check for keys without expiration
      const permanentKeys = apiKeys.filter(key => !key.expiresAt);
      
      if (permanentKeys.length > 0) {
        this.addFinding('info', 'API keys without expiration', 
          `${permanentKeys.length} API key(s) have no expiration date`);
        this.addRecommendation('Set expiration dates for API keys to limit exposure');
      }

      // Check for unused keys
      const unusedKeys = apiKeys.filter(key => 
        !key.lastUsedAt || 
        key.lastUsedAt < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );
      
      if (unusedKeys.length > 0) {
        this.addFinding('info', 'Unused API keys', 
          `${unusedKeys.length} API key(s) haven't been used in 90+ days`);
        this.addRecommendation('Revoke unused API keys to reduce attack surface');
      }

    } catch (error) {
      this.addFinding('error', 'API key audit failed', error.message);
    }
  }

  /**
   * Audit authentication attempts
   */
  async auditAuthAttempts() {
    console.log('🚨 Auditing authentication attempts...');

    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const attempts = await AuthAttempt.findAll({
        where: {
          createdAt: {
            [AuthAttempt.sequelize.Sequelize.Op.gte]: last24Hours
          }
        }
      });

      // Analyze failure rates
      const totalAttempts = attempts.length;
      const failedAttempts = attempts.filter(a => !a.success).length;
      const failureRate = totalAttempts > 0 ? failedAttempts / totalAttempts : 0;

      if (failureRate > 0.5) {
        this.addFinding('warning', 'High authentication failure rate', 
          `${(failureRate * 100).toFixed(1)}% of auth attempts failed in last 24h`);
        this.addRecommendation('Investigate potential brute force attacks');
      }

      // Check for suspicious IP addresses
      const ipStats = attempts.reduce((acc, attempt) => {
        const ip = attempt.ipAddress;
        if (!acc[ip]) {
          acc[ip] = { total: 0, failed: 0 };
        }
        acc[ip].total++;
        if (!attempt.success) {
          acc[ip].failed++;
        }
        return acc;
      }, {});

      const suspiciousIPs = Object.entries(ipStats).filter(([ip, stats]) => 
        stats.failed > 10 && stats.failed / stats.total > 0.8
      );

      if (suspiciousIPs.length > 0) {
        this.addFinding('critical', 'Suspicious IP addresses detected', 
          `${suspiciousIPs.length} IP(s) with high failure rates`);
        this.addRecommendation('Consider blocking or monitoring suspicious IP addresses');
      }

      // Check for account lockouts
      const lockouts = attempts.filter(a => 
        a.failureReason === 'account_locked' || a.failureReason === 'account_locked'
      );
      
      if (lockouts.length > 0) {
        this.addFinding('info', 'Account lockouts occurred', 
          `${lockouts.length} lockout events in last 24h`);
      }

    } catch (error) {
      this.addFinding('error', 'Auth attempts audit failed', error.message);
    }
  }

  /**
   * Audit OAuth providers
   */
  async auditOAuthProviders() {
    console.log('🔗 Auditing OAuth providers...');

    try {
      const providers = await OAuthProvider.findAll({
        attributes: ['id', 'userId', 'provider', 'email', 'isActive', 
                    'lastUsedAt', 'tokenExpiresAt', 'createdAt']
      });

      // Check for expired OAuth tokens
      const expiredTokens = providers.filter(p => 
        p.tokenExpiresAt && p.tokenExpiresAt < new Date()
      );
      
      if (expiredTokens.length > 0) {
        this.addFinding('info', 'Expired OAuth tokens', 
          `${expiredTokens.length} OAuth token(s) have expired`);
        this.addRecommendation('Refresh expired OAuth tokens or notify users');
      }

      // Check for inactive OAuth connections
      const inactiveProviders = providers.filter(p => 
        !p.lastUsedAt || 
        p.lastUsedAt < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      );
      
      if (inactiveProviders.length > 0) {
        this.addFinding('info', 'Inactive OAuth connections', 
          `${inactiveProviders.length} OAuth connection(s) unused for 180+ days`);
        this.addRecommendation('Consider unlinking unused OAuth connections');
      }

      // Check OAuth configuration
      const requiredEnvVars = [
        'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        this.addFinding('warning', 'Missing OAuth configuration', 
          `Missing environment variables: ${missingVars.join(', ')}`);
      }

    } catch (error) {
      this.addFinding('error', 'OAuth audit failed', error.message);
    }
  }

  /**
   * Audit system configuration
   */
  async auditConfiguration() {
    console.log('⚙️ Auditing system configuration...');

    const checks = [
      {
        name: 'NODE_ENV',
        check: process.env.NODE_ENV === 'production',
        message: 'NODE_ENV should be set to production',
        severity: 'warning'
      },
      {
        name: 'HTTPS',
        check: process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV !== 'production',
        message: 'HTTPS should be enforced in production',
        severity: 'critical'
      },
      {
        name: 'Session Secret',
        check: process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
        message: 'Session secret should be at least 32 characters',
        severity: 'critical'
      },
      {
        name: 'Rate Limiting Store',
        check: process.env.RATE_LIMIT_STORE === 'redis' || process.env.RATE_LIMIT_STORE === 'mongodb',
        message: 'Use persistent store for rate limiting in production',
        severity: 'warning'
      },
      {
        name: 'Email Configuration',
        check: process.env.EMAIL_PROVIDER && process.env.EMAIL_FROM,
        message: 'Email service should be properly configured',
        severity: 'warning'
      },
      {
        name: 'Password Pepper',
        check: !!process.env.PASSWORD_PEPPER,
        message: 'Password pepper adds extra security layer',
        severity: 'info'
      },
      {
        name: 'CORS Configuration',
        check: !!process.env.CORS_ORIGINS,
        message: 'CORS origins should be explicitly configured',
        severity: 'warning'
      }
    ];

    for (const check of checks) {
      if (!check.check) {
        this.addFinding(check.severity, check.name, check.message);
        
        if (check.severity === 'critical') {
          this.addRecommendation(`URGENT: ${check.message}`);
        }
      }
    }

    // Check for debug mode
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      this.addFinding('info', 'Debug mode enabled', 
        'Debug mode may expose sensitive information');
    }

    // Check database configuration
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      this.addFinding('critical', 'Database not configured', 
        'Database connection not properly configured');
    }
  }

  /**
   * Add audit finding
   */
  addFinding(severity, title, description) {
    this.findings.push({
      severity,
      title,
      description,
      timestamp: new Date()
    });
  }

  /**
   * Add recommendation
   */
  addRecommendation(text) {
    this.recommendations.push({
      text,
      timestamp: new Date()
    });
  }

  /**
   * Generate audit report
   */
  generateReport() {
    const severityCounts = this.findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {});

    const report = {
      timestamp: new Date(),
      summary: {
        totalFindings: this.findings.length,
        critical: severityCounts.critical || 0,
        warning: severityCounts.warning || 0,
        info: severityCounts.info || 0,
        error: severityCounts.error || 0
      },
      findings: this.findings,
      recommendations: this.recommendations,
      score: this.calculateSecurityScore()
    };

    this.logReport(report);
    return report;
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore() {
    const totalFindings = this.findings.length;
    if (totalFindings === 0) return 100;

    const weights = {
      critical: 20,
      warning: 10,
      info: 2,
      error: 15
    };

    const weightedFindings = this.findings.reduce((acc, finding) => 
      acc + (weights[finding.severity] || 0), 0
    );

    // Score out of 100, minimum 0
    return Math.max(0, 100 - weightedFindings);
  }

  /**
   * Log audit report
   */
  logReport(report) {
    console.log('\n📊 Security Audit Report');
    console.log('=======================');
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`Security Score: ${report.score}/100`);
    console.log(`Total Findings: ${report.summary.totalFindings}`);
    
    if (report.summary.critical > 0) {
      console.log(`❌ Critical: ${report.summary.critical}`);
    }
    if (report.summary.warning > 0) {
      console.log(`⚠️  Warning: ${report.summary.warning}`);
    }
    if (report.summary.info > 0) {
      console.log(`ℹ️  Info: ${report.summary.info}`);
    }
    if (report.summary.error > 0) {
      console.log(`💥 Error: ${report.summary.error}`);
    }

    console.log('\nFindings:');
    for (const finding of report.findings) {
      const icon = {
        critical: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        error: '💥'
      }[finding.severity] || '•';
      
      console.log(`${icon} ${finding.title}: ${finding.description}`);
    }

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      for (const rec of report.recommendations) {
        console.log(`💡 ${rec.text}`);
      }
    }

    console.log('\n✅ Security audit completed');
  }

  /**
   * Quick security check (subset of full audit)
   */
  async quickCheck() {
    const checks = [];

    // Check critical environment variables
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      checks.push('❌ JWT secret is weak or missing');
    }

    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      checks.push('❌ Session secret is weak or missing');
    }

    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
      checks.push('⚠️ NODE_ENV not properly set');
    }

    // Check for locked accounts
    try {
      const lockedCount = await User.count({
        where: {
          lockoutUntil: {
            [User.sequelize.Sequelize.Op.gt]: new Date()
          }
        }
      });

      if (lockedCount > 0) {
        checks.push(`ℹ️ ${lockedCount} account(s) currently locked`);
      }
    } catch (error) {
      checks.push('💥 Unable to check locked accounts');
    }

    return {
      timestamp: new Date(),
      checks,
      status: checks.length === 0 ? 'GOOD' : 'ISSUES_FOUND'
    };
  }
}

module.exports = new SecurityAudit();