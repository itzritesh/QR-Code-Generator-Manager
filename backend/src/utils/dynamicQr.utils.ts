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

const escapeHtml = (unsafe?: string): string => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Renders an attractive, responsive Light-Theme HTML page for Dynamic Plain Text QR Codes
 */
export const renderTextQrHtml = (data: { name: string; text?: string }): string => {
  const safeName = escapeHtml(data.name || 'Text Message');
  const safeText = escapeHtml(data.text || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} | QR Code Platform</title>
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
      max-width: 480px;
      width: 100%;
      padding: 2.25rem 2rem;
      text-align: center;
    }
    .icon-wrapper {
      width: 4rem;
      height: 4rem;
      background-color: #eef2ff;
      border: 1px solid #e0e7ff;
      color: #4f46e5;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .icon-wrapper svg {
      width: 2rem;
      height: 2rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background-color: #eef2ff;
      color: #4338ca;
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
      margin-bottom: 1rem;
    }
    .text-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      font-size: 0.9375rem;
      color: #1e293b;
      line-height: 1.6;
      text-align: left;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 320px;
      overflow-y: auto;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.875rem 1.25rem;
      background-color: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    .btn-action:hover {
      background-color: #4338ca;
    }
    .btn-action:active {
      transform: scale(0.98);
    }
    .footer-note {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    </div>
    <span class="badge">Text Note</span>
    <h1>${safeName}</h1>
    <div class="text-box" id="textContent">${safeText}</div>
    <button class="btn-action" id="copyBtn" onclick="copyText()">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
      <span>Copy Text</span>
    </button>
    <div class="footer-note">
      Powered by QR Code Generator &amp; Management Platform
    </div>
  </div>
  <script>
    function copyText() {
      const text = document.getElementById('textContent').innerText;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerHTML = '<span>✓ Copied to Clipboard!</span>';
        btn.style.backgroundColor = '#16a34a';
        setTimeout(() => {
          btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span>Copy Text</span>';
          btn.style.backgroundColor = '#4f46e5';
        }, 2500);
      });
    }
  </script>
</body>
</html>`;
};

/**
 * Renders an attractive, responsive Light-Theme HTML page for Dynamic Wi-Fi QR Codes
 */
export const renderWifiQrHtml = (data: {
  name: string;
  ssid?: string;
  password?: string;
  security?: string;
  hidden?: boolean;
}): string => {
  const safeName = escapeHtml(data.name || 'Wi-Fi Network');
  const safeSsid = escapeHtml(data.ssid || 'Wi-Fi Network');
  const safePassword = escapeHtml(data.password || '');
  const securityType = escapeHtml(data.security || 'WPA/WPA2');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSsid} Wi-Fi | QR Code Platform</title>
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
      padding: 2.25rem 2rem;
      text-align: center;
    }
    .icon-wrapper {
      width: 4rem;
      height: 4rem;
      background-color: #ecfdf5;
      border: 1px solid #d1fae5;
      color: #059669;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .icon-wrapper svg {
      width: 2rem;
      height: 2rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background-color: #ecfdf5;
      color: #047857;
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
      margin-bottom: 0.25rem;
    }
    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 1.5rem;
    }
    .info-list {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      color: #0f172a;
      font-weight: 600;
      font-family: monospace;
      font-size: 0.9375rem;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.875rem 1.25rem;
      background-color: #059669;
      color: #ffffff;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    .btn-action:hover {
      background-color: #047857;
    }
    .btn-action:active {
      transform: scale(0.98);
    }
    .tip-box {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background-color: #f0fdf4;
      border: 1px solid #dcfce7;
      border-radius: 0.625rem;
      font-size: 0.75rem;
      color: #166534;
      text-align: left;
      line-height: 1.4;
    }
    .footer-note {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
      </svg>
    </div>
    <span class="badge">Wi-Fi Connection</span>
    <h1>${safeSsid}</h1>
    <div class="subtitle">${safeName}</div>

    <div class="info-list">
      <div class="info-item">
        <span class="info-label">Network Name (SSID)</span>
        <span class="info-value">${safeSsid}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Security</span>
        <span class="info-value">${securityType}</span>
      </div>
      ${
        safePassword
          ? `<div class="info-item">
        <span class="info-label">Password</span>
        <span class="info-value" id="wifiPass">${safePassword}</span>
      </div>`
          : ''
      }
    </div>

    ${
      safePassword
        ? `<button class="btn-action" id="copyBtn" onclick="copyPassword()">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
      <span>Copy Wi-Fi Password</span>
    </button>`
        : ''
    }

    <div class="tip-box">
      💡 <strong>How to connect:</strong> ${
        safePassword
          ? 'Tap "Copy Wi-Fi Password", then open your device Settings &gt; Wi-Fi, select <strong>' +
            safeSsid +
            '</strong>, and paste the password.'
          : 'Open your device Settings &gt; Wi-Fi and select <strong>' + safeSsid + '</strong> to connect.'
      }
    </div>

    <div class="footer-note">
      Powered by QR Code Generator &amp; Management Platform
    </div>
  </div>
  <script>
    function copyPassword() {
      const pass = '${safePassword}';
      navigator.clipboard.writeText(pass).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerHTML = '<span>✓ Password Copied!</span>';
        btn.style.backgroundColor = '#15803d';
        setTimeout(() => {
          btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span>Copy Wi-Fi Password</span>';
          btn.style.backgroundColor = '#059669';
        }, 2500);
      });
    }
  </script>
</body>
</html>`;
};

/**
 * Renders an attractive, responsive Light-Theme HTML page for Dynamic UPI Payment QR Codes
 */
export const renderPaymentQrHtml = (data: {
  name: string;
  upiId?: string;
  payeeName?: string;
  amount?: number | string;
  currency?: string;
  note?: string;
  paymentUrl?: string;
}): string => {
  const safeName = escapeHtml(data.name || 'Payment Request');
  const safePayee = escapeHtml(data.payeeName || data.name || 'Merchant');
  const safeUpiId = escapeHtml(data.upiId || '');
  const currency = escapeHtml(data.currency || 'INR');
  const amountStr = data.amount && Number(data.amount) > 0 ? Number(data.amount).toFixed(2) : null;
  const safeNote = escapeHtml(data.note || '');
  const paymentUrl = data.paymentUrl ? escapeHtml(data.paymentUrl) : null;

  // Construct NPCI UPI Intent URI
  let upiUri = '';
  if (data.upiId) {
    const params = new URLSearchParams();
    params.set('pa', data.upiId.trim());
    if (data.payeeName) params.set('pn', data.payeeName.trim());
    if (amountStr) params.set('am', amountStr);
    params.set('cu', currency);
    if (data.note) params.set('tn', data.note.trim());
    upiUri = `upi://pay?${params.toString()}`;
  } else if (paymentUrl) {
    upiUri = paymentUrl;
  }

  const currencySymbol = currency === 'INR' ? '₹' : currency;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pay ${safePayee} | QR Code Platform</title>
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
      padding: 2.25rem 2rem;
      text-align: center;
    }
    .icon-wrapper {
      width: 4rem;
      height: 4rem;
      background-color: #f0fdf4;
      border: 1px solid #dcfce7;
      color: #16a34a;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .icon-wrapper svg {
      width: 2rem;
      height: 2rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background-color: #f0fdf4;
      color: #15803d;
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
      margin-bottom: 0.25rem;
    }
    .payee-box {
      margin-bottom: 1.25rem;
    }
    .amount-display {
      font-size: 2.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 1rem 0;
      letter-spacing: -0.02em;
    }
    .amount-display span {
      font-size: 1.5rem;
      color: #64748b;
      margin-right: 0.25rem;
    }
    .info-list {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      color: #0f172a;
      font-weight: 600;
      font-family: monospace;
      font-size: 0.9375rem;
    }
    .btn-pay {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.9375rem 1.25rem;
      background-color: #16a34a;
      color: #ffffff;
      text-decoration: none;
      border: none;
      border-radius: 0.75rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
      margin-bottom: 0.75rem;
    }
    .btn-pay:hover {
      background-color: #15803d;
    }
    .btn-pay:active {
      transform: scale(0.98);
    }
    .btn-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background-color: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-copy:hover {
      background-color: #f1f5f9;
      color: #0f172a;
    }
    .trust-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 1.25rem;
    }
    .trust-footer svg {
      width: 1rem;
      height: 1rem;
      color: #16a34a;
    }
    .footer-note {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
      </svg>
    </div>
    <span class="badge">UPI Payment</span>
    <div class="payee-box">
      <h1>${safePayee}</h1>
      <div style="font-size: 0.8125rem; color: #64748b;">${safeName}</div>
    </div>

    ${
      amountStr
        ? `<div class="amount-display"><span>${currencySymbol}</span>${amountStr}</div>`
        : ''
    }

    <div class="info-list">
      ${
        safeUpiId
          ? `<div class="info-item">
        <span class="info-label">UPI ID</span>
        <span class="info-value" id="upiIdText">${safeUpiId}</span>
      </div>`
          : ''
      }
      ${
        safeNote
          ? `<div class="info-item">
        <span class="info-label">Note</span>
        <span class="info-value" style="font-family: inherit; font-size: 0.875rem;">${safeNote}</span>
      </div>`
          : ''
      }
    </div>

    ${
      upiUri
        ? `<a href="${upiUri}" class="btn-pay" id="payBtn">
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      <span>Pay via UPI App</span>
    </a>`
        : ''
    }

    ${
      safeUpiId
        ? `<button class="btn-copy" id="copyUpiBtn" onclick="copyUpi()">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
      <span>Copy UPI ID</span>
    </button>`
        : ''
    }

    <div class="trust-footer">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
      <span>Supported on Google Pay, PhonePe, Paytm, BHIM &amp; Banking UPI</span>
    </div>

    <div class="footer-note">
      Powered by QR Code Generator &amp; Management Platform
    </div>
  </div>

  <script>
    function copyUpi() {
      const upi = '${safeUpiId}';
      navigator.clipboard.writeText(upi).then(() => {
        const btn = document.getElementById('copyUpiBtn');
        btn.innerHTML = '<span>✓ UPI ID Copied!</span>';
        btn.style.color = '#15803d';
        btn.style.borderColor = '#86efac';
        setTimeout(() => {
          btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span>Copy UPI ID</span>';
          btn.style.color = '#475569';
          btn.style.borderColor = '#e2e8f0';
        }, 2500);
      });
    }

    // Auto-prompt on mobile browsers if UPI protocol is supported
    window.addEventListener('DOMContentLoaded', () => {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const uri = '${upiUri}';
      if (isMobile && uri && uri.startsWith('upi://')) {
        // Small delay to ensure page renders before intent trigger
        setTimeout(() => {
          window.location.href = uri;
        }, 350);
      }
    });
  </script>
</body>
</html>`;
};
