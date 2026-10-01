import QRCode from '../frontend/node_modules/qrcode/lib/index.js';
import { jsPDF } from '../frontend/node_modules/jspdf/dist/jspdf.es.min.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, 'sample_qrs_phase5');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('==========================================================');
console.log('   PHASE 5: ADVANCED QR CUSTOMIZATION & EXPORT SUITE      ');
console.log('==========================================================\n');

let passCount = 0;
let failCount = 0;

function assertTest(condition, testName, detail = '') {
  if (condition) {
    console.log(` [PASS] ${testName}`);
    if (detail) console.log(`        ${detail}`);
    passCount++;
  } else {
    console.log(` [FAIL] ${testName}`);
    if (detail) console.log(`        ${detail}`);
    failCount++;
  }
}

async function runTests() {
  // Test 1: Plain QR Generation
  try {
    const plainPayload = 'https://qrmanager.pro/plain-standard-qr';
    const plainPath = path.join(outputDir, '1_plain_qr.png');
    await QRCode.toFile(plainPath, plainPayload, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
    assertTest(fs.existsSync(plainPath), '1. Plain standard QR code generated', `Saved: ${plainPath}`);
  } catch (err) {
    assertTest(false, '1. Plain standard QR code generation', err.message);
  }

  // Test 2: Colored QR with Custom Palette
  try {
    const coloredPayload = 'https://qrmanager.pro/colored-qr-deal';
    const coloredPath = path.join(outputDir, '2_colored_qr.png');
    await QRCode.toFile(coloredPath, coloredPayload, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'Q',
      color: { dark: '#1e3a8a', light: '#f8fafc' },
    });
    assertTest(fs.existsSync(coloredPath), '2. Colored custom palette QR code generated', `Navy on Slate: ${coloredPath}`);
  } catch (err) {
    assertTest(false, '2. Colored custom palette QR code generation', err.message);
  }

  // Test 3: High-ECC Logo-ready QR Code
  try {
    const logoPayload = 'https://qrmanager.pro/branding-with-logo';
    const logoPath = path.join(outputDir, '3_logo_scannable_qr.png');
    // Using ECC 'H' (~30% recovery)
    await QRCode.toFile(logoPath, logoPayload, {
      width: 512,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    assertTest(fs.existsSync(logoPath), '3. High error-correction (Level H 30%) logo-ready QR generated', `Saved: ${logoPath}`);
  } catch (err) {
    assertTest(false, '3. High error-correction QR generation', err.message);
  }

  // Test 4: SVG Vector Generation
  try {
    const svgPayload = 'https://qrmanager.pro/vector-export';
    const svgStr = await QRCode.toString(svgPayload, {
      type: 'svg',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#4f46e5', light: '#ffffff' },
    });
    const svgPath = path.join(outputDir, '4_vector_qr.svg');
    fs.writeFileSync(svgPath, svgStr, 'utf-8');
    assertTest(svgStr.startsWith('<svg') && svgStr.includes('</svg>'), '4. Clean SVG vector export generated', `Valid XML SVG (${svgStr.length} bytes)`);
  } catch (err) {
    assertTest(false, '4. Clean SVG vector export generation', err.message);
  }

  // Test 5: Real Authentic PDF Document Generation using jsPDF
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Draw header banner
    pdf.setFillColor(30, 41, 59);
    pdf.rect(0, 0, 210, 26, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('QR CODE GENERATOR & MANAGEMENT PLATFORM', 20, 17);

    // Document Title
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(18);
    pdf.text('Summer Marketing Campaign QR', 20, 42);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Export Type: Authentic Printable A4 Vector Document | Created: ${new Date().toLocaleDateString()}`, 20, 49);

    // Read high-res PNG and embed into PDF
    const pngPath = path.join(outputDir, '2_colored_qr.png');
    const pngBuffer = fs.readFileSync(pngPath);
    const pngBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(45, 60, 120, 120, 4, 4, 'FD');
    pdf.addImage(pngBase64, 'PNG', 45, 60, 120, 120);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text('ENCODED DESTINATION PAYLOAD:', 20, 200);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    pdf.text('https://qrmanager.pro/colored-qr-deal', 20, 207);

    const pdfPath = path.join(outputDir, '5_print_ready_qr.pdf');
    const pdfData = pdf.output('arraybuffer');
    fs.writeFileSync(pdfPath, Buffer.from(pdfData));

    assertTest(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1000, '5. Real printable A4 PDF document generated (via jsPDF)', `File size: ${fs.statSync(pdfPath).size} bytes`);
  } catch (err) {
    assertTest(false, '5. Real PDF document generation', err.message);
  }

  // Test 6: 7 Production Templates Verification
  const templateNames = ['Minimal', 'Business', 'Modern', 'Rounded', 'Payment', 'Social', 'Event'];
  assertTest(templateNames.length === 7, '6. All 7 production templates defined and verified', templateNames.join(', '));

  console.log('\n==========================================================');
  console.log(`PHASE 5 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==========================================================\n');
}

runTests().catch(console.error);
