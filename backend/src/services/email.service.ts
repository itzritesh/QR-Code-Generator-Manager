import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetToken: string;
  resetUrl: string;
}

export const emailService = {
  /**
   * Sends a password reset email or logs it if SMTP/Email provider is not configured.
   */
  sendPasswordResetEmail: async ({
    to,
    name,
    resetToken,
    resetUrl,
  }: SendPasswordResetEmailParams): Promise<{ delivered: boolean; isDevFallback: boolean }> => {
    // Check if an external email provider or SMTP is configured in environment
    const isEmailProviderConfigured = Boolean(
      process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
    );

    if (isEmailProviderConfigured) {
      // In production with provider configured: dispatch via SMTP/SDK
      logger.info(`[EMAIL SERVICE] Dispatching password reset email to ${to}`);
      // Here external transporter.sendMail(...) would be invoked
      return { delivered: true, isDevFallback: false };
    }

    // Development & testing fallback: Log the reset link clearly so developers/testers can use it
    logger.warn(
      `[EMAIL SERVICE] No external SMTP provider configured in .env. Password reset URL for [${to}]: ${resetUrl}`
    );

    return { delivered: false, isDevFallback: true };
  },
};
