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
   * Sends a password reset email using Resend API or logs fallback URL if not configured.
   */
  sendPasswordResetEmail: async ({
    to,
    name,
    resetToken,
    resetUrl,
  }: SendPasswordResetEmailParams): Promise<{ delivered: boolean; isDevFallback: boolean }> => {
    const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        logger.info(`[RESEND EMAIL] Dispatching password reset email to ${to}...`);

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #334155; }
    .greeting { font-weight: 600; font-size: 16px; color: #0f172a; margin-bottom: 12px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); }
    .expiry { font-size: 13px; color: #64748b; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 24px 0; }
    .break-url { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 16px; }
    .footer { border-top: 1px solid #f1f5f9; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>QR Code Management Platform</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${name || 'there'},</div>
      <p>We received a request to reset the password for your account (${to}). Click the button below to choose a new password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>

      <div class="expiry">
        ⏱️ <strong>Note:</strong> This link is valid for <strong>1 hour</strong> and can only be used once.
      </div>

      <p style="font-size: 13px; color: #64748b;">If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.</p>

      <div class="break-url">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} QR Manager &bull; All rights reserved.
    </div>
  </div>
</body>
</html>
`;

        const fromAddress = env.RESEND_FROM_EMAIL || 'QR Manager <onboarding@resend.dev>';

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject: 'Reset Your Password - QR Manager',
            html: emailHtml,
          }),
        });

        const data: any = await response.json();

        if (response.ok) {
          logger.info(`[RESEND EMAIL] Successfully delivered password reset email to ${to} (Message ID: ${data?.id})`);
          return { delivered: true, isDevFallback: false };
        } else {
          logger.error(`[RESEND EMAIL] Resend API error: ${JSON.stringify(data)}`);
          // Fall back gracefully so dev is not locked out
          logger.warn(`[EMAIL FALLBACK] Password reset URL for [${to}]: ${resetUrl}`);
          return { delivered: false, isDevFallback: true };
        }
      } catch (err: any) {
        logger.error(`[RESEND EMAIL] Network or API exception sending email: ${err?.message || err}`);
        logger.warn(`[EMAIL FALLBACK] Password reset URL for [${to}]: ${resetUrl}`);
        return { delivered: false, isDevFallback: true };
      }
    }

    // Development & testing fallback: Log the reset link clearly so developers/testers can use it
    logger.warn(
      `[EMAIL SERVICE] No RESEND_API_KEY configured in .env. Password reset URL for [${to}]: ${resetUrl}`
    );

    return { delivered: false, isDevFallback: true };
  },
};
