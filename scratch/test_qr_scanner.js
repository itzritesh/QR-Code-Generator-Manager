const QRCode = require('../backend/node_modules/qrcode');
const jsQR = require('../backend/node_modules/jsqr');

async function testScan(payload, options = {}) {
  // Generate raw pixel data using qrcode library
  const rawQr = QRCode.create(payload, options);
  const size = rawQr.modules.size;
  const data = rawQr.modules.data; // Uint8Array of 0s and 1s

  // Scale up to e.g. 4 pixels per module with 4-module quiet zone
  const scale = 4;
  const margin = 4;
  const totalModules = size + margin * 2;
  const imgWidth = totalModules * scale;
  const imgHeight = totalModules * scale;
  const rgba = new Uint8ClampedArray(imgWidth * imgHeight * 4);

  // Fill white background
  rgba.fill(255);

  // Draw dark modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (rawQr.modules.get(r, c)) {
        const startX = (c + margin) * scale;
        const startY = (r + margin) * scale;
        for (let y = 0; y < scale; y++) {
          for (let x = 0; x < scale; x++) {
            const idx = ((startY + y) * imgWidth + (startX + x)) * 4;
            rgba[idx] = 0;     // R
            rgba[idx + 1] = 0; // G
            rgba[idx + 2] = 0; // B
            rgba[idx + 3] = 255; // A
          }
        }
      }
    }
  }

  // Scan with jsQR
  const code = jsQR(rgba, imgWidth, imgHeight);
  if (!code) {
    throw new Error(`Failed to decode QR code for payload: ${payload}`);
  }
  if (code.data !== payload) {
    throw new Error(`Decoded payload mismatch! Expected: ${payload}, Got: ${code.data}`);
  }
  return code.data;
}

async function run() {
  console.log('Testing QR Code Real Scanning Verification:');
  const payloads = [
    { type: 'URL', text: 'https://antigravity.google.com/launch' },
    { type: 'TEXT', text: 'Production Grade QR Testing 2026' },
    { type: 'WIFI', text: 'WIFI:T:WPA;S:OfficeNet;P:Secret123;;' },
    { type: 'UPI', text: 'upi://pay?pa=store@icici&pn=Store&am=99.00&cu=INR' },
  ];

  for (const p of payloads) {
    const decoded = await testScan(p.text);
    console.log(`✓ [${p.type}] Scanned & Decoded successfully: "${decoded}"`);
  }

  // Test with Error Correction levels L, M, Q, H
  for (const ecc of ['L', 'M', 'Q', 'H']) {
    const decoded = await testScan('https://example.com/ecc-test', { errorCorrectionLevel: ecc });
    console.log(`✓ [ECC ${ecc}] Scanned & Decoded successfully: "${decoded}"`);
  }

  console.log('\nAll QR Scanner tests passed!');
}

run().catch(console.error);
