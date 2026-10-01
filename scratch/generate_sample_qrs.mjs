import QRCode from '../frontend/node_modules/qrcode/lib/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, 'sample_qrs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const samples = [
  {
    type: 'URL',
    filename: 'sample_url_qr.png',
    payload: 'https://example.com/summer-sale?promo=SAVE50',
    title: 'URL QR Code',
  },
  {
    type: 'TEXT',
    filename: 'sample_text_qr.png',
    payload: 'Welcome to Antigravity QR Code Platform! Scanned successfully.',
    title: 'Text QR Code',
  },
  {
    type: 'WIFI',
    filename: 'sample_wifi_qr.png',
    payload: 'WIFI:T:WPA;S:CoffeeShop_Guest;P:Latte#2026;H:false;;',
    title: 'Wi-Fi Alliance QR Code',
  },
  {
    type: 'PAYMENT_UPI',
    filename: 'sample_payment_upi_qr.png',
    payload: 'upi://pay?pa=centralstore@okaxis&pn=Central+Store&am=499.00&cu=INR&tn=Invoice+9841',
    title: 'NPCI UPI Payment Deep Link QR Code',
  },
];

async function generateAll() {
  console.log('Generating standards-compliant QR Code samples for camera scanning verification...\n');

  for (const s of samples) {
    const filePath = path.join(outputDir, s.filename);
    await QRCode.toFile(filePath, s.payload, {
      width: 400,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });

    console.log(`[OK] Generated ${s.title}`);
    console.log(`     Payload:  ${s.payload}`);
    console.log(`     Saved to: ${filePath}\n`);
  }
}

generateAll().catch(console.error);
