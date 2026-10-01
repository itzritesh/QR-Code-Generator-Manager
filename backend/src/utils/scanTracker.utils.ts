import { Request } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';

export interface ParsedClientInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  operatingSystem: string;
  country: string;
  referrer: string;
  visitorId: string;
}

/**
 * Extracts and categorizes device type from User-Agent string
 */
export const detectDeviceType = (ua: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' => {
  if (!ua) return 'unknown';

  const lower = ua.toLowerCase();

  // 1. Tablet checks (must precede mobile since some Android tablets have "Android")
  if (
    lower.includes('ipad') ||
    lower.includes('tablet') ||
    lower.includes('playbook') ||
    lower.includes('silk') ||
    (lower.includes('android') && !lower.includes('mobile'))
  ) {
    return 'tablet';
  }

  // 2. Mobile checks
  if (
    lower.includes('mobi') ||
    lower.includes('iphone') ||
    lower.includes('ipod') ||
    lower.includes('android') ||
    lower.includes('blackberry') ||
    lower.includes('windows phone') ||
    lower.includes('opera mini')
  ) {
    return 'mobile';
  }

  // 3. Desktop checks
  if (
    lower.includes('windows nt') ||
    lower.includes('macintosh') ||
    lower.includes('mac os x') ||
    lower.includes('cros') ||
    (lower.includes('linux') && !lower.includes('android'))
  ) {
    return 'desktop';
  }

  return 'unknown';
};

/**
 * Extracts operating system from User-Agent string
 */
export const detectOperatingSystem = (ua: string): string => {
  if (!ua) return 'Unknown';

  const lower = ua.toLowerCase();

  if (lower.includes('iphone os') || lower.includes('ios') || (lower.includes('cpu os') && lower.includes('like mac os'))) {
    return 'iOS';
  }
  if (lower.includes('android')) {
    return 'Android';
  }
  if (lower.includes('windows nt 10.0')) {
    return 'Windows 10/11';
  }
  if (lower.includes('windows nt')) {
    return 'Windows';
  }
  if (lower.includes('mac os x') || lower.includes('macintosh')) {
    return 'macOS';
  }
  if (lower.includes('cros')) {
    return 'Chrome OS';
  }
  if (lower.includes('linux')) {
    return 'Linux';
  }

  return 'Unknown';
};

/**
 * Extracts browser name from User-Agent string
 */
export const detectBrowser = (ua: string): string => {
  if (!ua) return 'Unknown';

  // Order is important because many browsers include "Chrome" or "Safari" in their UA
  if (/Edg(e)?\//i.test(ua)) {
    return 'Edge';
  }
  if (/SamsungBrowser\//i.test(ua)) {
    return 'Samsung Internet';
  }
  if (/OPR\/|Opera\//i.test(ua)) {
    return 'Opera';
  }
  if (/Brave\//i.test(ua)) {
    return 'Brave';
  }
  if (/Firefox\/|FxiOS\//i.test(ua)) {
    return 'Firefox';
  }
  if (/Chrome\/|CriOS\//i.test(ua)) {
    return 'Chrome';
  }
  if (/Safari\//i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) {
    return 'Safari';
  }
  if (/MSIE|Trident\//i.test(ua)) {
    return 'Internet Explorer';
  }

  return 'Unknown';
};

/**
 * Extracts reliable country information from trusted proxy/cloud headers
 */
export const detectCountry = (req: Request): string => {
  const headers = req.headers;

  const countryCandidate =
    (headers['cf-ipcountry'] as string) ||
    (headers['x-country-code'] as string) ||
    (headers['x-vercel-ip-country'] as string) ||
    (headers['cloudfront-viewer-country'] as string) ||
    (headers['x-appengine-country'] as string);

  if (countryCandidate && countryCandidate.trim().length >= 2 && countryCandidate !== 'XX') {
    return countryCandidate.trim().toUpperCase();
  }

  return 'Unknown';
};

/**
 * Cleans and categorizes HTTP Referrer header
 */
export const detectReferrer = (req: Request): string => {
  const raw = (req.headers['referer'] || req.headers['referrer']) as string;
  if (!raw || !raw.trim()) {
    return 'Direct / Camera';
  }

  try {
    const url = new URL(raw.trim());
    return url.hostname || raw.trim().slice(0, 100);
  } catch {
    return raw.trim().slice(0, 100);
  }
};

/**
 * Generates a privacy-conscious, non-reversible visitor ID hash (SHA-256)
 * Never stores or exposes the raw IP address.
 */
export const generateVisitorId = (req: Request): string => {
  const rawIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const ua = (req.headers['user-agent'] as string) || '';

  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${rawIp}:${ua}`)
    .digest('hex')
    .slice(0, 32);
};

/**
 * Combines all request analytics extraction into a single clean helper
 */
export const extractScanMetadata = (req: Request): ParsedClientInfo => {
  const ua = (req.headers['user-agent'] as string) || '';

  return {
    deviceType: detectDeviceType(ua),
    browser: detectBrowser(ua),
    operatingSystem: detectOperatingSystem(ua),
    country: detectCountry(req),
    referrer: detectReferrer(req),
    visitorId: generateVisitorId(req),
  };
};
