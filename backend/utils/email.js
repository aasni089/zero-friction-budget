// utils/email.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a magic link via email (Legacy)
 */
exports.sendMagicLink = async (email, token, name = '') => {
  try {
    // Create magic link URL
    const magicLinkUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
    
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'auth@yourdomain.com',
      to: email,
      subject: 'Sign in to your PropTech account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to your PropTech account</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Click the button below to sign in to your account. This link will expire in 15 minutes.</p>
          <div style="margin: 30px 0;">
            <a href="${magicLinkUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign in to your account</a>
          </div>
          <p>If you didn't request this email, you can safely ignore it.</p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${magicLinkUrl}</p>
        </div>
      `
    });
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a login code via email (New primary method)
 */
exports.sendLoginCode = async (email, code, name = '') => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'auth@yourdomain.com',
      to: email,
      subject: 'Your PropTech Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Login Code</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Use the following code to sign in to your PropTech account:</p>
          <div style="margin: 30px 0; text-align: center;">
            <div style="font-size: 36px; letter-spacing: 8px; font-weight: bold; background-color: #f3f4f6; padding: 16px; border-radius: 4px;">${code}</div>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
        </div>
      `
    });
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending login code email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a verification code via email (2FA or other verification)
 */
exports.sendVerificationCode = async (email, code, name = '') => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'auth@yourdomain.com',
      to: email,
      subject: 'Your PropTech Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Verification Code</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Use the following verification code to complete your request:</p>
          <div style="margin: 30px 0; text-align: center;">
            <div style="font-size: 36px; letter-spacing: 8px; font-weight: bold; background-color: #f3f4f6; padding: 16px; border-radius: 4px;">${code}</div>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email or contact support if you have concerns about your account security.</p>
        </div>
      `
    });
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending verification code email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new users
 */
exports.sendWelcomeEmail = async (email, name = '') => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'welcome@yourdomain.com',
      to: email,
      subject: 'Welcome to PropTech',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to PropTech</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Thank you for creating an account with PropTech. We're excited to have you on board!</p>
          <p>With PropTech, you can:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Find properties that match your specific needs</li>
            <li>Access comprehensive zoning information</li>
            <li>Save on commissions with our direct buyer-seller connection</li>
            <li>Manage your entire property portfolio in one place</li>
          </ul>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Get Started</a>
          </div>
          <p>If you have any questions, don't hesitate to reach out to our support team.</p>
          <p>Best regards,<br>The PropTech Team</p>
        </div>
      `
    });
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send account security notification
 */
exports.sendSecurityNotification = async (email, action, name = '', ipAddress = '', deviceInfo = '') => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'security@yourdomain.com',
      to: email,
      subject: 'PropTech Account Security Update',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Security Update</h2>
          <p>Hello ${name || 'there'},</p>
          <p>We're contacting you to let you know about recent activity on your PropTech account:</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 4px;">
            <p style="margin: 0;"><strong>Action:</strong> ${action}</p>
            <p style="margin: 8px 0 0;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
            ${ipAddress ? `<p style="margin: 8px 0 0;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
            ${deviceInfo ? `<p style="margin: 8px 0 0;"><strong>Device:</strong> ${deviceInfo}</p>` : ''}
          </div>
          <p>If you didn't perform this action, please secure your account immediately by:</p>
          <ol style="margin: 20px 0; padding-left: 20px;">
            <li>Changing your password</li>
            <li>Enabling two-factor authentication if not already enabled</li>
            <li>Contacting our support team</li>
          </ol>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/account/security" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Account Security</a>
          </div>
          <p>Security is our top priority. Thank you for helping keep your account safe.</p>
        </div>
      `
    });
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending security notification:', error);
    return { success: false, error: error.message };
  }
};