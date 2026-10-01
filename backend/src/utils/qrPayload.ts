import { AppError } from '../middleware/errorHandler.js';

export interface WifiPayloadOptions {
  ssid: string;
  password?: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface PaymentPayloadOptions {
  upiId?: string;
  payeeName?: string;
  amount?: number | string;
  currency?: string;
  note?: string;
  paymentUrl?: string;
}

/**
 * Escapes reserved characters in Wi-Fi SSID and Password strings:
 * Special characters '\', ';', ':', ',', and '"' must be escaped with a backslash.
 */
export const escapeWifiString = (str: string): string => {
  return str.replace(/([\\;:,"])/g, '\\$1');
};

/**
 * Builds standard Wi-Fi Alliance QR string:
 * Format: WIFI:T:<security>;S:<ssid>;P:<password>;H:<hidden>;;
 */
export const buildWifiPayload = (options: WifiPayloadOptions): string => {
  const { ssid, password = '', security = 'WPA', hidden = false } = options;
  if (!ssid || !ssid.trim()) {
    throw new AppError('Wi-Fi SSID is required.', 400);
  }

  const escapedSsid = escapeWifiString(ssid.trim());
  const secType = security === 'nopass' ? 'nopass' : security;
  let payload = `WIFI:T:${secType};S:${escapedSsid};`;

  if (secType !== 'nopass' && password) {
    payload += `P:${escapeWifiString(password)};`;
  }

  if (hidden) {
    payload += `H:true;`;
  }

  payload += `;`;
  return payload;
};

/**
 * Builds standard NPCI UPI Deep Link / Payment URI:
 * Format: upi://pay?pa=<vpa>&pn=<payeeName>&am=<amount>&cu=<currency>&tn=<note>
 * Or returns validated payment URL directly.
 */
export const buildPaymentPayload = (options: PaymentPayloadOptions): string => {
  if (options.paymentUrl && options.paymentUrl.trim()) {
    const raw = options.paymentUrl.trim();
    if (!/^https?:\/\/|^upi:\/\//i.test(raw)) {
      throw new AppError('Payment URL must begin with http://, https://, or upi://', 400);
    }
    return raw;
  }

  const { upiId, payeeName, amount, currency = 'INR', note } = options;
  if (!upiId || !upiId.trim()) {
    throw new AppError('UPI ID (VPA) or Payment URL is required.', 400);
  }

  const vpa = upiId.trim();
  // Basic VPA validation: handle@bank
  if (!/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(vpa)) {
    throw new AppError('Invalid UPI ID / VPA format. Expected format: name@bank (e.g. merchant@okaxis)', 400);
  }

  const params = new URLSearchParams();
  params.set('pa', vpa);

  if (payeeName && payeeName.trim()) {
    params.set('pn', payeeName.trim());
  }

  if (amount !== undefined && amount !== null && amount !== '') {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new AppError('Amount must be a positive number.', 400);
    }
    params.set('am', num.toFixed(2));
  }

  params.set('cu', (currency || 'INR').trim().toUpperCase());

  if (note && note.trim()) {
    params.set('tn', note.trim());
  }

  return `upi://pay?${params.toString()}`;
};

/**
 * Builds and normalizes URL QR payload
 */
export const buildUrlPayload = (rawUrl: string): string => {
  let url = (rawUrl || '').trim();
  if (!url) {
    throw new AppError('Website URL is required.', 400);
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      throw new AppError('Please enter a valid domain name (e.g., example.com)', 400);
    }
  } catch (err: any) {
    throw new AppError(err.message || 'Invalid website URL format.', 400);
  }

  return url;
};

/**
 * Builds and normalizes Text QR payload
 */
export const buildTextPayload = (rawText: string): string => {
  const text = (rawText || '').trim();
  if (!text) {
    throw new AppError('Text content is required.', 400);
  }
  if (text.length > 2000) {
    throw new AppError('Text exceeds maximum supported QR limit of 2,000 characters.', 400);
  }
  return text;
};

/**
 * Universal payload builder by QR type
 */
export const generateQrPayload = (
  type: 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT',
  data: {
    url?: string;
    text?: string;
    wifi?: WifiPayloadOptions;
    payment?: PaymentPayloadOptions;
  }
): string => {
  switch (type) {
    case 'URL':
      return buildUrlPayload(data.url || '');
    case 'TEXT':
      return buildTextPayload(data.text || '');
    case 'WIFI':
      if (!data.wifi) throw new AppError('Wi-Fi parameters are required.', 400);
      return buildWifiPayload(data.wifi);
    case 'PAYMENT':
      if (!data.payment) throw new AppError('Payment parameters are required.', 400);
      return buildPaymentPayload(data.payment);
    default:
      throw new AppError(`Unsupported QR type: ${type}`, 400);
  }
};
