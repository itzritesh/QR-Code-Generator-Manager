/**
 * Standards-compliant QR Code payload builder and client-side validators.
 * Strictly adheres to Wi-Fi Alliance QR specifications and NPCI UPI specifications.
 */

export interface WifiData {
  ssid: string;
  password?: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface PaymentData {
  upiId?: string;
  payeeName?: string;
  amount?: number | string;
  currency?: string;
  note?: string;
  paymentUrl?: string;
}

export const escapeWifi = (str: string): string => {
  return str.replace(/([\\;:,"])/g, '\\$1');
};

export const buildWifiString = (data: WifiData): string => {
  const ssid = data.ssid ? data.ssid.trim() : '';
  const escapedSsid = escapeWifi(ssid);
  const sec = data.security || 'WPA';
  let result = `WIFI:T:${sec};S:${escapedSsid};`;

  if (sec !== 'nopass' && data.password) {
    result += `P:${escapeWifi(data.password)};`;
  }

  if (data.hidden) {
    result += `H:true;`;
  }

  result += `;`;
  return result;
};

export const buildPaymentString = (data: PaymentData): string => {
  if (data.paymentUrl && data.paymentUrl.trim()) {
    return data.paymentUrl.trim();
  }

  const vpa = (data.upiId || '').trim();
  if (!vpa) return 'upi://pay';

  const params = new URLSearchParams();
  params.set('pa', vpa);

  if (data.payeeName && data.payeeName.trim()) {
    params.set('pn', data.payeeName.trim());
  }

  if (data.amount && Number(data.amount) > 0) {
    params.set('am', Number(data.amount).toFixed(2));
  }

  params.set('cu', (data.currency || 'INR').trim().toUpperCase());

  if (data.note && data.note.trim()) {
    params.set('tn', data.note.trim());
  }

  return `upi://pay?${params.toString()}`;
};

export const buildUrlString = (rawUrl: string): string => {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
};

export const computeQrPayload = (
  type: 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT',
  metadata: {
    url?: string;
    text?: string;
    wifi?: WifiData;
    payment?: PaymentData;
  }
): string => {
  switch (type) {
    case 'URL':
      return buildUrlString(metadata.url || '');
    case 'TEXT':
      return (metadata.text || '').trim();
    case 'WIFI':
      return metadata.wifi ? buildWifiString(metadata.wifi) : 'WIFI:S:Guest;;';
    case 'PAYMENT':
      return metadata.payment ? buildPaymentString(metadata.payment) : 'upi://pay';
    default:
      return '';
  }
};

/**
 * Validation helpers
 */
export const validateQrForm = (
  name: string,
  type: 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT',
  metadata: {
    url?: string;
    text?: string;
    wifi?: WifiData;
    payment?: PaymentData;
  }
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!name.trim()) {
    errors.name = 'QR Code Name is required.';
  } else if (name.length > 100) {
    errors.name = 'Name cannot exceed 100 characters.';
  }

  if (type === 'URL') {
    const raw = (metadata.url || '').trim();
    if (!raw) {
      errors.url = 'Destination URL is required.';
    } else {
      const fullUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        const parsed = new URL(fullUrl);
        if (!parsed.hostname || !parsed.hostname.includes('.')) {
          errors.url = 'Please enter a valid web domain (e.g., example.com).';
        }
      } catch {
        errors.url = 'Invalid website URL format.';
      }
    }
  }

  if (type === 'TEXT') {
    const text = (metadata.text || '').trim();
    if (!text) {
      errors.text = 'Text content is required.';
    } else if (text.length > 2000) {
      errors.text = 'Text exceeds 2,000 character maximum for optimal scanning.';
    }
  }

  if (type === 'WIFI') {
    const wifi = metadata.wifi || { ssid: '', security: 'WPA' };
    if (!wifi.ssid.trim()) {
      errors.ssid = 'Network name (SSID) is required.';
    }
    if (wifi.security === 'WPA' && wifi.password && wifi.password.length < 8) {
      errors.password = 'WPA/WPA2 passwords must be at least 8 characters.';
    }
    if (wifi.security === 'WEP' && wifi.password && wifi.password.length < 5) {
      errors.password = 'WEP passwords must be at least 5 characters.';
    }
  }

  if (type === 'PAYMENT') {
    const pay = metadata.payment || {};
    const hasUpi = Boolean(pay.upiId && pay.upiId.trim());
    const hasUrl = Boolean(pay.paymentUrl && pay.paymentUrl.trim());

    if (!hasUpi && !hasUrl) {
      errors.upiId = 'Please enter a UPI ID (VPA) or a Payment URL.';
    } else if (hasUpi) {
      const vpa = (pay.upiId || '').trim();
      if (!/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(vpa)) {
        errors.upiId = 'Invalid UPI ID format. Expected format: name@bank (e.g. merchant@okaxis)';
      }
    } else if (hasUrl) {
      const pUrl = (pay.paymentUrl || '').trim();
      if (!/^https?:\/\/|^upi:\/\//i.test(pUrl)) {
        errors.paymentUrl = 'Payment URL must begin with http://, https://, or upi://';
      }
    }

    if (pay.amount !== undefined && pay.amount !== '' && pay.amount !== null) {
      const num = Number(pay.amount);
      if (isNaN(num) || num <= 0) {
        errors.amount = 'Amount must be a positive number.';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
