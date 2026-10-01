import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

// Unambiguous, URL-safe alphanumeric alphabet (56 characters)
const SHORTCODE_ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a cryptographically secure, URL-safe shortCode
 */
export const generateRandomShortCode = (length = 7): string => {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SHORTCODE_ALPHABET[bytes[i] % SHORTCODE_ALPHABET.length];
  }
  return code;
};

/**
 * Generates a collision-safe, unique shortCode by checking database existence
 */
export const generateUniqueShortCode = async (
  prisma: PrismaClient,
  length = 7,
  maxAttempts = 5
): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateRandomShortCode(length);
    const existing = await prisma.qrCode.findUnique({
      where: { shortCode: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }
  // If exhausted, increase length by 1 for extra entropy
  return generateRandomShortCode(length + 1);
};

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Strong destination URL validation:
 * - Prevents malformed URLs
 * - Prevents dangerous schemes (javascript:, data:, file:, etc.)
 * - Prevents open redirect to arbitrary pseudo-protocols
 * - Allows safe http and https schemes
 */
export const validateDestinationUrl = (inputUrl: string): UrlValidationResult => {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, error: 'Destination URL is required.' };
  }

  const trimmed = inputUrl.trim();
  if (trimmed.length > 2048) {
    return { isValid: false, error: 'URL exceeds maximum allowed length of 2048 characters.' };
  }

  // Explicit check for dangerous protocols before parsing
  const lower = trimmed.toLowerCase();
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'file:',
    'vbscript:',
    'blob:',
    'about:',
    'chrome:',
    'resource:',
  ];

  for (const proto of dangerousProtocols) {
    if (lower.startsWith(proto)) {
      return {
        isValid: false,
        error: `Protocol "${proto}" is not permitted for security reasons.`,
      };
    }
  }

  try {
    let parsed: URL;
    // If user entered address without protocol (e.g. "mywebsite.com/path"), default to https://
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      parsed = new URL(`https://${trimmed}`);
    } else {
      parsed = new URL(trimmed);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS destination protocols are permitted.',
      };
    }

    if (
      !parsed.hostname ||
      parsed.hostname.includes(' ') ||
      parsed.hostname.length < 3 ||
      (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')
    ) {
      return { isValid: false, error: 'Destination URL contains an invalid hostname.' };
    }

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch {
    return { isValid: false, error: 'Malformed URL. Please enter a valid web destination.' };
  }
};

/**
 * Renders an attractive, responsive Light-Theme HTML page for Inactive / Disabled QR Codes
 */
export const renderInactiveQrHtml = (qrName?: string): string => {
  const safeName = qrName ? qrName.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'This QR Code';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Inactive | QR Code Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
      max-width: 440px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .icon-wrapper {
      width: 4rem;
      height: 4rem;
      background-color: #fffbeb;
      border: 1px solid #fef3c7;
      color: #d97706;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    .icon-wrapper svg {
      width: 2rem;
      height: 2rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background-color: #fef3c7;
      color: #92400e;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.5rem;
      line-height: 1.3;
    }
    p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 0.75rem;
      padding: 0.875rem 1rem;
      margin-bottom: 1.5rem;
      font-size: 0.8125rem;
      color: #475569;
    }
    .meta-box strong {
      color: #0f172a;
      display: block;
      margin-bottom: 0.25rem;
    }
    .footer-note {
      font-size: 0.75rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <span class="badge">Temporarily Paused</span>
    <h1>QR Code Inactive</h1>
    <p>This dynamic QR code is currently disabled by its owner and is not accepting scan traffic.</p>
    <div class="meta-box">
      <strong>Target Reference:</strong>
      <span>${safeName}</span>
    </div>
    <div class="footer-note">
      Powered by QR Code Generator &amp; Management Platform
    </div>
  </div>
</body>
</html>`;
};

/**
 * Renders an attractive, responsive Light-Theme HTML page for Not Found QR Codes (404)
 */
export const renderNotFoundQrHtml = (): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Not Found | 404</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
      max-width: 440px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .icon-wrapper {
      width: 4rem;
      height: 4rem;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #64748b;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    .icon-wrapper svg {
      width: 2rem;
      height: 2rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background-color: #f1f5f9;
      color: #475569;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }
    .footer-note {
      font-size: 0.75rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <span class="badge">404 Error</span>
    <h1>QR Code Not Found</h1>
    <p>This QR code does not exist, has expired, or has been permanently removed by its creator.</p>
    <div class="footer-note">
      Powered by QR Code Generator &amp; Management Platform
    </div>
  </div>
</body>
</html>`;
};
