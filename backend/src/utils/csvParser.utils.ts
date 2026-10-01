import { generateQrPayload } from './qrPayload.js';
import { validateDestinationUrl } from './dynamicQr.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export interface RawCsvRow {
  rowNumber: number;
  name?: string;
  type?: string;
  content?: string;
  isDynamic?: string | boolean;
  destinationUrl?: string;
  ssid?: string;
  password?: string;
  security?: string;
  hidden?: string | boolean;
  upiId?: string;
  payeeName?: string;
  amount?: string | number;
  note?: string;
  [key: string]: any;
}

export interface ValidatedBulkRow {
  rowNumber: number;
  name: string;
  type: 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT';
  content: string;
  isDynamic: boolean;
  destinationUrl?: string;
  metadata: Record<string, any>;
}

export interface InvalidBulkRow {
  rowNumber: number;
  raw: Record<string, any>;
  errors: string[];
}

export interface BulkValidationResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  validRows: ValidatedBulkRow[];
  invalidRows: InvalidBulkRow[];
}

/**
 * Neutralizes CSV formula injection characters (=, +, -, @, \t, \r)
 */
export const sanitizeCsvField = (value: string): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    if (/^-\d+(\.\d+)?$/.test(trimmed)) {
      return trimmed;
    }
    return `'${trimmed}`;
  }
  return trimmed;
};

/**
 * Standard RFC 4180 CSV parser supporting quotes, commas, and newlines inside quoted values
 */
export const parseCsvText = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        // Only push non-empty rows
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push remainder
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

/**
 * Parses and validates CSV content for Bulk QR Generation
 */
export const validateBulkCsv = (csvText: string): BulkValidationResult => {
  if (!csvText || !csvText.trim()) {
    throw new AppError('CSV file is empty. Please upload a CSV containing QR records.', 400);
  }

  const parsed = parseCsvText(csvText.trim());
  if (parsed.length === 0) {
    throw new AppError('No readable data rows found in CSV.', 400);
  }

  // Header row
  const rawHeaders = parsed[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const dataRows = parsed.slice(1);

  if (dataRows.length === 0) {
    throw new AppError('CSV has header but no data rows.', 400);
  }

  const MAX_BATCH_LIMIT = 100;
  if (dataRows.length > MAX_BATCH_LIMIT) {
    throw new AppError(`Batch size exceeds the maximum limit of ${MAX_BATCH_LIMIT} rows. Uploaded ${dataRows.length} rows.`, 400);
  }

  const validRows: ValidatedBulkRow[] = [];
  const invalidRows: InvalidBulkRow[] = [];

  // Track duplicates within the batch
  const seenSignatures = new Set<string>();

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // 1-indexed, accounting for header
    const rowObj: Record<string, string> = {};

    rawHeaders.forEach((header, colIndex) => {
      rowObj[header] = row[colIndex] || '';
    });

    const errors: string[] = [];

    // 1. Validate Name
    const rawName = (rowObj['name'] || '').trim();
    const name = sanitizeCsvField(rawName);
    if (!name) {
      errors.push('Missing required column: "name"');
    } else if (name.length > 100) {
      errors.push('QR name cannot exceed 100 characters');
    }

    // 2. Validate Type
    const rawType = (rowObj['type'] || '').trim().toUpperCase();
    const allowedTypes = ['URL', 'TEXT', 'WIFI', 'PAYMENT'];
    if (!rawType) {
      errors.push('Missing required column: "type"');
    } else if (!allowedTypes.includes(rawType)) {
      errors.push(`Invalid type "${rawType}". Supported types: URL, TEXT, WIFI, PAYMENT`);
    }

    const type = rawType as 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT';

    // 3. Dynamic Flag
    const isDynamicRaw = (rowObj['isdynamic'] || rowObj['dynamic'] || '').toLowerCase();
    const isDynamic = isDynamicRaw === 'true' || isDynamicRaw === '1' || isDynamicRaw === 'yes';

    let content = (rowObj['content'] || '').trim();
    let destinationUrl = (rowObj['destinationurl'] || '').trim();
    const metadata: Record<string, any> = {};

    // 4. Type-Specific Validation
    if (type === 'URL') {
      const urlCandidate = destinationUrl || content || rowObj['url'] || '';
      if (!urlCandidate) {
        errors.push('URL QR requires a valid website URL in "content" or "destinationUrl"');
      } else {
        const val = validateDestinationUrl(urlCandidate);
        if (!val.isValid || !val.normalizedUrl) {
          errors.push(val.error || 'Invalid destination URL format');
        } else {
          content = val.normalizedUrl;
          destinationUrl = val.normalizedUrl;
          metadata.url = val.normalizedUrl;
        }
      }
    } else if (type === 'TEXT') {
      const textCandidate = content || rowObj['text'] || '';
      if (!textCandidate) {
        errors.push('TEXT QR requires text message in "content"');
      } else if (textCandidate.length > 2000) {
        errors.push('TEXT content exceeds maximum length of 2000 characters');
      } else {
        content = textCandidate;
        metadata.text = textCandidate;
      }
    } else if (type === 'WIFI') {
      const ssid = (rowObj['ssid'] || (!content.startsWith('WIFI:') ? content : '')).trim();
      const password = rowObj['password'] || '';
      const rawSec = (rowObj['security'] || 'WPA').trim().toUpperCase();
      const security = rawSec === 'WEP' || rawSec === 'NOPASS' ? rawSec : 'WPA';
      const hidden = rowObj['hidden'] === 'true' || rowObj['hidden'] === '1';

      if (!content && !ssid) {
        errors.push('WIFI QR requires either network "ssid" or formatted WiFi content');
      } else {
        try {
          if (content.startsWith('WIFI:')) {
            metadata.wifi = {
              ssid: 'Imported-WiFi',
              security: 'WPA',
            };
          } else {
            metadata.wifi = {
              ssid: ssid || 'Guest-WiFi',
              password,
              security,
              hidden,
            };
            content = generateQrPayload('WIFI', metadata);
          }
        } catch (err: any) {
          errors.push(err.message || 'Invalid Wi-Fi parameters');
        }
      }
    } else if (type === 'PAYMENT') {
      const upiId = (
        rowObj['upiid'] ||
        rowObj['upi'] ||
        (content.includes('@') && !content.includes('://') ? content : '')
      ).trim();
      const payeeName = sanitizeCsvField((rowObj['payeename'] || rowObj['payee'] || '').trim());
      const amount = rowObj['amount'] ? parseFloat(rowObj['amount']) : undefined;
      const note = sanitizeCsvField((rowObj['note'] || rowObj['description'] || '').trim());
      const paymentUrl = (
        rowObj['paymenturl'] ||
        (content.startsWith('http://') || content.startsWith('https://') ? content : '')
      ).trim();

      if (!content && !upiId && !paymentUrl) {
        errors.push('PAYMENT QR requires "upiId", "paymentUrl", or formatted payment content');
      } else if (upiId && !/^[a-zA-Z0-9_.-]+@[a-zA-Z0-9]+$/.test(upiId)) {
        errors.push(`Invalid UPI ID format: "${upiId}" (e.g. merchant@bank)`);
      } else if (amount !== undefined && (isNaN(amount) || amount < 0)) {
        errors.push(`Invalid amount value: "${rowObj['amount']}"`);
      } else {
        try {
          if (content.startsWith('upi://')) {
            metadata.payment = {
              paymentUrl: content,
            };
          } else {
            metadata.payment = {
              upiId: upiId || undefined,
              payeeName: payeeName || name,
              amount: amount,
              currency: 'INR',
              note: note || undefined,
              paymentUrl: paymentUrl || undefined,
            };
            content = generateQrPayload('PAYMENT', metadata);
          }
        } catch (err: any) {
          errors.push(err.message || 'Invalid payment parameters');
        }
      }
    }

    // 5. Check Duplicate row within batch
    const signature = `${name.toLowerCase()}|${type}|${content.toLowerCase()}`;
    if (seenSignatures.has(signature)) {
      errors.push(`Duplicate row: record with identical name, type, and content already exists in this batch`);
    } else {
      seenSignatures.add(signature);
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        raw: rowObj,
        errors,
      });
    } else {
      validRows.push({
        rowNumber,
        name,
        type,
        content,
        isDynamic,
        destinationUrl: isDynamic ? (destinationUrl || content) : undefined,
        metadata,
      });
    }
  });

  return {
    totalRows: dataRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
  };
};

/**
 * Generates sample CSV template for download
 */
export const getSampleCsvTemplate = (): string => {
  return [
    'name,type,content,isDynamic,ssid,password,security,upiId,payeeName,amount,note',
    'Company Homepage,URL,https://example.com,true,,,,,,,',
    'Customer Support Hotline,TEXT,Call us at 1-800-555-0199 for 24/7 assistance.,false,,,,,,,',
    'Guest Lounge Wi-Fi,WIFI,,false,OfficeGuest,SecurePassword123,WPA,,,,',
    'Coffee Bar Payment,PAYMENT,,false,,,,coffeebar@okaxis,Coffee Bar,4.50,Morning Espresso',
    'Product Launch Event,URL,https://example.com/launch-2026,true,,,,,,,',
  ].join('\n');
};
