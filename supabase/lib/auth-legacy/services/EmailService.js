const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../../config');
const TokenService = require('./TokenService');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@portfolio.com';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Create email transporter based on environment
   */
  createTransporter() {
    if (process.env.NODE_ENV === 'development') {
      // Use ethereal email for development
      return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'ethereal-password'
        }
      });
    }

    // Production transporters
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    switch (emailProvider) {
      case 'sendgrid':
        return nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });

      case 'mailgun':
        return nodemailer.createTransporter({
          service: 'Mailgun',
          auth: {
            user: process.env.MAILGUN_USERNAME,
            pass: process.env.MAILGUN_PASSWORD
          }
        });

      case 'ses':
        return nodemailer.createTransporter({
          SES: { 
            aws: {
              region: process.env.AWS_REGION || 'us-east-1',
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
          }
        });

      default:
        return nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
    }
  }

  /**
   * Send email with error handling and retries
   */
  async sendEmail(mailOptions, retries = 3) {
    const options = {
      from: this.fromAddress,
      ...mailOptions
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.transporter.sendMail(options);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Development email preview URL:', nodemailer.getTestMessageUrl(result));
        }

        return {
          success: true,
          messageId: result.messageId,
          previewUrl: process.env.NODE_ENV === 'development' ? 
            nodemailer.getTestMessageUrl(result) : null
        };
      } catch (error) {
        console.error(`Email send attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw new Error(`Failed to send email after ${retries} attempts: ${error.message}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(user, token) {
    const verificationUrl = `${this.baseUrl}/verify-email?token=${token}`;
    
    const htmlContent = this.getEmailVerificationTemplate(user, verificationUrl);
    const textContent = this.getEmailVerificationText(user, verificationUrl);

    const mailOptions = {
      to: user.email,
      subject: 'Verify Your Email Address',
      text: textContent,
      html: htmlContent
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user, token) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;
    
    const htmlContent = this.getPasswordResetTemplate(user, resetUrl);
    const textContent = this.getPasswordResetText(user, resetUrl);

    const mailOptions = {
      to: user.email,
      subject: 'Reset Your Password',
      text: textContent,
      html: htmlContent
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send account lockout notification
   */
  async sendAccountLockout(user, lockoutDuration) {
    const htmlContent = this.getAccountLockoutTemplate(user, lockoutDuration);
    const textContent = this.getAccountLockoutText(user, lockoutDuration);

    const mailOptions = {
      to: user.email,
      subject: 'Account Temporarily Locked',
      text: textContent,
      html: htmlContent
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlert(user, alertType, details = {}) {
    const htmlContent = this.getSecurityAlertTemplate(user, alertType, details);
    const textContent = this.getSecurityAlertText(user, alertType, details);

    const mailOptions = {
      to: user.email,
      subject: `Security Alert - ${this.getAlertTitle(alertType)}`,
      text: textContent,
      html: htmlContent
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(user) {
    const htmlContent = this.getWelcomeTemplate(user);
    const textContent = this.getWelcomeText(user);

    const mailOptions = {
      to: user.email,
      subject: 'Welcome to Portfolio!',
      text: textContent,
      html: htmlContent
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send login notification
   */
  async sendLoginNotification(user, deviceInfo = {}) {
    const htmlContent = this.getLoginNotificationTemplate(user, deviceInfo);
    const textContent = this.getLoginNotificationText(user, deviceInfo);

    const mailOptions = {
      to: user.email,
      subject: 'New Login to Your Account',
      text: textContent,
      html: htmlContent
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Email verification template
   */
  getEmailVerificationTemplate(user, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verify Your Email Address</h1>
          
          <p>Hello ${user.firstName || user.username},</p>
          
          <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
          
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          
          <p>This verification link will expire in 24 hours.</p>
          
          <p>If you didn't create an account, you can safely ignore this email.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Portfolio Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Email verification text template
   */
  getEmailVerificationText(user, verificationUrl) {
    return `
      Hello ${user.firstName || user.username},

      Thank you for signing up! Please verify your email address by visiting this link:

      ${verificationUrl}

      This verification link will expire in 24 hours.

      If you didn't create an account, you can safely ignore this email.

      Best regards,
      The Portfolio Team
    `;
  }

  /**
   * Password reset template
   */
  getPasswordResetTemplate(user, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #dc3545; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .warning { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          
          <p>Hello ${user.firstName || user.username},</p>
          
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <div class="warning">
            <strong>Security Note:</strong> This password reset link will expire in 1 hour. 
            If you didn't request this reset, please ignore this email and your password will remain unchanged.
          </div>
          
          <div class="footer">
            <p>Best regards,<br>The Portfolio Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset text template
   */
  getPasswordResetText(user, resetUrl) {
    return `
      Hello ${user.firstName || user.username},

      You requested to reset your password. Visit this link to create a new password:

      ${resetUrl}

      This password reset link will expire in 1 hour.

      If you didn't request this reset, please ignore this email and your password will remain unchanged.

      Best regards,
      The Portfolio Team
    `;
  }

  /**
   * Account lockout template
   */
  getAccountLockoutTemplate(user, lockoutDuration) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Temporarily Locked</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #f8d7da; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Account Temporarily Locked</h1>
          
          <div class="alert">
            <strong>Security Alert:</strong> Your account has been temporarily locked due to multiple failed login attempts.
          </div>
          
          <p>Hello ${user.firstName || user.username},</p>
          
          <p>Your account will be automatically unlocked in ${lockoutDuration} minutes. You can also reset your password if you've forgotten it.</p>
          
          <p>If this wasn't you, please contact our support team immediately.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Portfolio Security Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Account lockout text template
   */
  getAccountLockoutText(user, lockoutDuration) {
    return `
      Hello ${user.firstName || user.username},

      SECURITY ALERT: Your account has been temporarily locked due to multiple failed login attempts.

      Your account will be automatically unlocked in ${lockoutDuration} minutes. You can also reset your password if you've forgotten it.

      If this wasn't you, please contact our support team immediately.

      Best regards,
      The Portfolio Security Team
    `;
  }

  /**
   * Security alert template
   */
  getSecurityAlertTemplate(user, alertType, details) {
    const alertTitle = this.getAlertTitle(alertType);
    const alertMessage = this.getAlertMessage(alertType, details);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Security Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #f8d7da; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Security Alert</h1>
          
          <div class="alert">
            <strong>${alertTitle}</strong>
          </div>
          
          <p>Hello ${user.firstName || user.username},</p>
          
          <p>${alertMessage}</p>
          
          <div class="details">
            <h3>Details:</h3>
            <ul>
              ${details.timestamp ? `<li>Time: ${new Date(details.timestamp).toLocaleString()}</li>` : ''}
              ${details.ipAddress ? `<li>IP Address: ${details.ipAddress}</li>` : ''}
              ${details.userAgent ? `<li>Device: ${details.userAgent}</li>` : ''}
              ${details.location ? `<li>Location: ${details.location}</li>` : ''}
            </ul>
          </div>
          
          <p>If this was you, you can safely ignore this email. If not, please secure your account immediately by changing your password.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Portfolio Security Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Security alert text template
   */
  getSecurityAlertText(user, alertType, details) {
    const alertTitle = this.getAlertTitle(alertType);
    const alertMessage = this.getAlertMessage(alertType, details);

    return `
      Hello ${user.firstName || user.username},

      SECURITY ALERT: ${alertTitle}

      ${alertMessage}

      Details:
      ${details.timestamp ? `Time: ${new Date(details.timestamp).toLocaleString()}` : ''}
      ${details.ipAddress ? `IP Address: ${details.ipAddress}` : ''}
      ${details.userAgent ? `Device: ${details.userAgent}` : ''}
      ${details.location ? `Location: ${details.location}` : ''}

      If this was you, you can safely ignore this email. If not, please secure your account immediately by changing your password.

      Best regards,
      The Portfolio Security Team
    `;
  }

  /**
   * Welcome email template
   */
  getWelcomeTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Portfolio!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #28a745; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Portfolio!</h1>
          
          <p>Hello ${user.firstName || user.username},</p>
          
          <p>Welcome to Portfolio! We're excited to have you on board.</p>
          
          <p>You can now access your dashboard and start building your amazing portfolio.</p>
          
          <a href="${this.baseUrl}/dashboard" class="button">Go to Dashboard</a>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Portfolio Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome email text template
   */
  getWelcomeText(user) {
    return `
      Hello ${user.firstName || user.username},

      Welcome to Portfolio! We're excited to have you on board.

      You can now access your dashboard and start building your amazing portfolio.

      Visit: ${this.baseUrl}/dashboard

      If you have any questions, feel free to reach out to our support team.

      Best regards,
      The Portfolio Team
    `;
  }

  /**
   * Login notification template
   */
  getLoginNotificationTemplate(user, deviceInfo) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Login to Your Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>New Login to Your Account</h1>
          
          <p>Hello ${user.firstName || user.username},</p>
          
          <p>We detected a new login to your account.</p>
          
          <div class="details">
            <h3>Login Details:</h3>
            <ul>
              <li>Time: ${new Date().toLocaleString()}</li>
              ${deviceInfo.ipAddress ? `<li>IP Address: ${deviceInfo.ipAddress}</li>` : ''}
              ${deviceInfo.userAgent ? `<li>Device: ${deviceInfo.userAgent}</li>` : ''}
              ${deviceInfo.location ? `<li>Location: ${deviceInfo.location}</li>` : ''}
            </ul>
          </div>
          
          <p>If this was you, you can safely ignore this email. If you don't recognize this login, please secure your account immediately.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Portfolio Security Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Login notification text template
   */
  getLoginNotificationText(user, deviceInfo) {
    return `
      Hello ${user.firstName || user.username},

      We detected a new login to your account.

      Login Details:
      Time: ${new Date().toLocaleString()}
      ${deviceInfo.ipAddress ? `IP Address: ${deviceInfo.ipAddress}` : ''}
      ${deviceInfo.userAgent ? `Device: ${deviceInfo.userAgent}` : ''}
      ${deviceInfo.location ? `Location: ${deviceInfo.location}` : ''}

      If this was you, you can safely ignore this email. If you don't recognize this login, please secure your account immediately.

      Best regards,
      The Portfolio Security Team
    `;
  }

  /**
   * Get alert title by type
   */
  getAlertTitle(alertType) {
    const titles = {
      'suspicious_login': 'Suspicious Login Detected',
      'password_changed': 'Password Changed',
      'email_changed': 'Email Address Changed',
      'account_locked': 'Account Locked',
      'oauth_linked': 'OAuth Account Linked',
      'oauth_unlinked': 'OAuth Account Unlinked',
      'api_key_created': 'API Key Created',
      'api_key_revoked': 'API Key Revoked'
    };

    return titles[alertType] || 'Security Event';
  }

  /**
   * Get alert message by type
   */
  getAlertMessage(alertType, details) {
    const messages = {
      'suspicious_login': 'We detected a login from an unusual location or device.',
      'password_changed': 'Your account password was successfully changed.',
      'email_changed': 'Your account email address was changed.',
      'account_locked': 'Your account was locked due to suspicious activity.',
      'oauth_linked': `A ${details.provider} account was linked to your account.`,
      'oauth_unlinked': `A ${details.provider} account was unlinked from your account.`,
      'api_key_created': 'A new API key was created for your account.',
      'api_key_revoked': 'An API key was revoked from your account.'
    };

    return messages[alertType] || 'A security event occurred on your account.';
  }

  /**
   * Verify transporter configuration
   */
  async verifyConfiguration() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email configuration verified' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();