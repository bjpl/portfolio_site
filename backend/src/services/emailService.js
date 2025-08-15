const nodemailer = require('nodemailer');

const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      // Only initialize if email is configured
      if (!config.email.user) {
        logger.info('Email service not configured');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', error);
      this.initialized = false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options) {
    if (!this.initialized) {
      logger.warn('Email service not initialized, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: options.from || config.email.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user, verificationToken) {
    const verificationUrl = `${config.hugo.baseUrl}/verify-email/${verificationToken}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to My Portfolio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome, ${user.firstName || user.username}!</h1>
            </div>
            <div class="content">
              <p>Thank you for joining my portfolio platform. I'm excited to have you here!</p>
              
              <p>Please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
              
              <p>If you didn't create an account, you can safely ignore this email.</p>
              
              <div class="footer">
                <p>Best regards,<br>Portfolio Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.hugo.baseUrl}/reset-password/${resetToken}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6b6b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${user.firstName || user.username},</p>
              
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #ff6b6b;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <div class="footer">
                <p>Best regards,<br>Portfolio Security Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send contact form notification
   */
  async sendContactNotification(contact) {
    return this.sendEmail({
      to: config.portfolio?.contactEmail || config.email.from,
      subject: `New Contact Form: ${contact.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .field { margin: 15px 0; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 5px; }
            .metadata { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${contact.name}</div>
              </div>
              
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${contact.email}">${contact.email}</a></div>
              </div>
              
              ${
                contact.phone
                  ? `
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${contact.phone}</div>
              </div>
              `
                  : ''
              }
              
              ${
                contact.company
                  ? `
              <div class="field">
                <div class="label">Company:</div>
                <div class="value">${contact.company}</div>
              </div>
              `
                  : ''
              }
              
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${contact.subject}</div>
              </div>
              
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${contact.message.replace(/\n/g, '<br>')}</div>
              </div>
              
              ${
                contact.projectType
                  ? `
              <div class="field">
                <div class="label">Project Type:</div>
                <div class="value">${contact.projectType}</div>
              </div>
              `
                  : ''
              }
              
              ${
                contact.budget
                  ? `
              <div class="field">
                <div class="label">Budget:</div>
                <div class="value">${contact.budget}</div>
              </div>
              `
                  : ''
              }
              
              ${
                contact.timeline
                  ? `
              <div class="field">
                <div class="label">Timeline:</div>
                <div class="value">${contact.timeline}</div>
              </div>
              `
                  : ''
              }
              
              <div class="metadata">
                <strong>Submission Details:</strong><br>
                Time: ${new Date().toLocaleString()}<br>
                IP: ${contact.ip}<br>
                User Agent: ${contact.userAgent}
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send contact form auto-reply
   */
  async sendContactAutoReply(contact) {
    return this.sendEmail({
      to: contact.email,
      subject: 'Thank you for contacting me',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Message!</h1>
            </div>
            <div class="content">
              <p>Hi ${contact.name},</p>
              
              <p>Thank you for reaching out! I've received your message and will get back to you as soon as possible, typically within 24-48 hours.</p>
              
              <p><strong>Your message summary:</strong></p>
              <p style="padding: 15px; background: white; border-left: 4px solid #667eea; margin: 20px 0;">
                <strong>Subject:</strong> ${contact.subject}<br>
                <strong>Message:</strong> ${contact.message.substring(0, 200)}${contact.message.length > 200 ? '...' : ''}
              </p>
              
              <p>In the meantime, feel free to:</p>
              <ul>
                <li>Browse my <a href="${config.hugo.baseUrl}/projects">portfolio projects</a></li>
                <li>Read my <a href="${config.hugo.baseUrl}/blog">blog posts</a></li>
                <li>Connect on <a href="${config.portfolio?.linkedin}">LinkedIn</a></li>
              </ul>
              
              <div class="footer">
                <p>Best regards,<br>${config.portfolio?.ownerName || 'Portfolio Owner'}</p>
                <p style="font-size: 12px; margin-top: 20px;">
                  This is an automated response. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send weekly digest to admin
   */
  async sendWeeklyDigest(stats) {
    return this.sendEmail({
      to: config.portfolio?.contactEmail || config.email.from,
      subject: 'Weekly Portfolio Digest',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #17a2b8; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #17a2b8; }
            .stat-label { color: #666; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Weekly Portfolio Digest</h1>
              <p>Week of ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="content">
              <h2>📈 This Week's Stats</h2>
              
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">${stats.totalViews || 0}</div>
                  <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${stats.newContacts || 0}</div>
                  <div class="stat-label">New Contacts</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${stats.projectViews || 0}</div>
                  <div class="stat-label">Project Views</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${stats.blogViews || 0}</div>
                  <div class="stat-label">Blog Views</div>
                </div>
              </div>
              
              ${
                stats.topProjects && stats.topProjects.length > 0
                  ? `
              <h3>🏆 Top Projects</h3>
              <ol>
                ${stats.topProjects.map(p => `<li>${p.title} (${p.views} views)</li>`).join('')}
              </ol>
              `
                  : ''
              }
              
              ${
                stats.topPosts && stats.topPosts.length > 0
                  ? `
              <h3>📖 Top Blog Posts</h3>
              <ol>
                ${stats.topPosts.map(p => `<li>${p.title} (${p.views} views)</li>`).join('')}
              </ol>
              `
                  : ''
              }
              
              ${
                stats.recentContacts && stats.recentContacts.length > 0
                  ? `
              <h3>💬 Recent Contacts</h3>
              <ul>
                ${stats.recentContacts.map(c => `<li><strong>${c.name}</strong>: ${c.subject}</li>`).join('')}
              </ul>
              `
                  : ''
              }
              
              <p style="margin-top: 30px; text-align: center;">
                <a href="${config.hugo.baseUrl}/admin" style="padding: 12px 30px; background: #17a2b8; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Admin Dashboard</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }
}

// Export singleton instance
module.exports = new EmailService();
