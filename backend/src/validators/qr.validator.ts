import { z } from 'zod';

export const wifiSchema = z.object({
  ssid: z.string().min(1, 'Wi-Fi SSID is required.').max(64, 'SSID too long (max 64 characters).'),
  password: z.string().max(128, 'Password too long (max 128 characters).').optional(),
  security: z.enum(['WPA', 'WEP', 'nopass']).default('WPA'),
  hidden: z.boolean().default(false),
}).refine((data) => {
  if (data.security === 'WPA' && data.password && data.password.length < 8) {
    return false;
  }
  return true;
}, {
  message: 'WPA/WPA2 security requires a password of at least 8 characters.',
  path: ['password'],
});

export const paymentSchema = z.object({
  upiId: z.string().max(256).refine((val) => {
    if (!val || !val.trim()) return true;
    return /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val.trim());
  }, 'Invalid UPI ID format. Expected format: name@bank (e.g. merchant@okaxis)').optional(),
  payeeName: z.string().max(128).optional(),
  amount: z.union([z.number().positive(), z.string()]).optional(),
  currency: z.string().max(5).default('INR'),
  note: z.string().max(256).optional(),
  paymentUrl: z.string().url('Invalid payment URL').max(2048).optional(),
}).refine((data) => {
  // Must provide either upiId or paymentUrl
  return Boolean((data.upiId && data.upiId.trim()) || (data.paymentUrl && data.paymentUrl.trim()));
}, {
  message: 'Either a valid UPI ID (VPA) or a Payment URL must be provided.',
  path: ['upiId'],
});

/**
 * Strict URL Validator protecting against:
 * - javascript: schemes
 * - data: schemes
 * - vbscript:, file:, blob:, about:
 * - Malformed redirect targets
 * - Open redirect abuse
 */
export const urlValidator = z.string().max(2048).refine((val) => {
  if (!val || !val.trim()) return false;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();

  const dangerousSchemes = [
    'javascript:',
    'data:',
    'file:',
    'vbscript:',
    'blob:',
    'about:',
    'chrome:',
    'resource:',
  ];

  if (dangerousSchemes.some((scheme) => lower.startsWith(scheme))) {
    return false;
  }

  try {
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(full);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname && parsed.hostname.includes('.') && parsed.hostname.length >= 3)
    );
  } catch {
    return false;
  }
}, 'Invalid website URL format. Must be a valid HTTP or HTTPS destination address.');

/**
 * Safe Image Data URL schema
 * Restricts base64 image uploads to safe image types and verifies SVG sanitization
 */
export const safeImageDataUrlSchema = z
  .string()
  .max(3500000, 'Image payload exceeds maximum allowed size (2MB limit).')
  .refine((val) => {
    if (!val || !val.trim()) return true;
    const trimmed = val.trim();

    // Must match data:image/TYPE;base64,DATA
    const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return false;

    // SVG XSS Protection: decode and check for malicious tags or event handlers
    if (trimmed.startsWith('data:image/svg+xml')) {
      try {
        const decoded = Buffer.from(match[2], 'base64').toString('utf-8');
        if (
          /<script/i.test(decoded) ||
          /onload=/i.test(decoded) ||
          /onerror=/i.test(decoded) ||
          /onclick=/i.test(decoded) ||
          /javascript:/i.test(decoded) ||
          /<iframe/i.test(decoded) ||
          /<embed/i.test(decoded)
        ) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }, 'Invalid or unsafe image data. Supported formats: PNG, JPG, WebP, SVG (no embedded scripts).')
  .optional();

export const designSchema = z.object({
  fgColor: z.string().max(64).optional(),
  bgColor: z.string().max(64).optional(),
  gradient: z.object({
    enabled: z.boolean(),
    type: z.enum(['linear', 'radial', 'diagonal']),
    startColor: z.string().max(64),
    endColor: z.string().max(64),
  }).optional(),
  dotStyle: z.enum(['square', 'dots', 'rounded', 'classy', 'extra-rounded']).optional(),
  eyeFrameStyle: z.enum(['square', 'rounded', 'circle', 'leaf']).optional(),
  eyeBallStyle: z.enum(['square', 'circle', 'rounded', 'diamond']).optional(),
  eyeFrameColor: z.string().max(64).optional(),
  eyeBallColor: z.string().max(64).optional(),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional(),
  margin: z.number().min(0).max(10).optional(),
  size: z.number().min(128).max(4096).optional(),
  logo: z.object({
    dataUrl: safeImageDataUrlSchema,
    size: z.number().min(0.05).max(0.4).optional(),
    bgColor: z.string().max(64).optional(),
    border: z.boolean().optional(),
  }).optional(),
  frame: z.object({
    enabled: z.boolean(),
    text: z.string().max(80).optional(),
    position: z.enum(['top', 'bottom']).optional(),
    bgColor: z.string().max(64).optional(),
    textColor: z.string().max(64).optional(),
  }).optional(),
  templateId: z.string().max(64).optional(),
}).passthrough().optional();

export const createQrSchema = z.object({
  name: z.string().min(1, 'QR Name is required.').max(100, 'QR Name cannot exceed 100 characters.').trim(),
  type: z.enum(['URL', 'TEXT', 'WIFI', 'PAYMENT']),
  isDynamic: z.boolean().optional(),
  destinationUrl: urlValidator.optional(),
  metadata: z.object({
    url: urlValidator.optional(),
    text: z.string().max(2000, 'Text exceeds 2,000 characters.').optional(),
    wifi: wifiSchema.optional(),
    payment: paymentSchema.optional(),
  }).default({}),
  design: designSchema,
}).refine((data) => {
  if (data.type === 'URL') {
    const target = data.destinationUrl || data.metadata?.url;
    if (!target || !target.trim()) return false;
    const lower = target.trim().toLowerCase();
    if (['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'].some((p) => lower.startsWith(p))) {
      return false;
    }
    try {
      const full = /^https?:\/\//i.test(target) ? target : `https://${target}`;
      const parsed = new URL(full);
      return Boolean(parsed.hostname && parsed.hostname.includes('.'));
    } catch {
      return false;
    }
  }
  if (data.type === 'TEXT' && (!data.metadata?.text || !data.metadata.text.trim())) {
    return false;
  }
  if (data.type === 'WIFI' && (!data.metadata?.wifi || !data.metadata.wifi.ssid?.trim())) {
    return false;
  }
  if (data.type === 'PAYMENT' && !data.metadata?.payment) {
    return false;
  }
  return true;
}, {
  message: 'Invalid or missing payload data for the selected QR code type.',
  path: ['metadata'],
});

export const updateQrSchema = z.object({
  name: z.string().min(1, 'QR Name is required.').max(100).trim().optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  isDynamic: z.boolean().optional(),
  destinationUrl: urlValidator.optional(),
  metadata: z.object({
    url: urlValidator.optional(),
    text: z.string().max(2000).optional(),
    wifi: wifiSchema.optional(),
    payment: paymentSchema.optional(),
  }).optional(),
  design: designSchema,
}).refine((data) => {
  if (data.destinationUrl) {
    const lower = data.destinationUrl.trim().toLowerCase();
    if (['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'].some((p) => lower.startsWith(p))) {
      return false;
    }
  }
  return true;
}, {
  message: 'Destination URL contains an unsafe scheme or protocol.',
  path: ['destinationUrl'],
});
