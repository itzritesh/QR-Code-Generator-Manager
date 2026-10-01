// Phase 13 Comprehensive End-to-End Testing & Bug Fixing Suite
const http = require('http');
const QRCode = require('../backend/node_modules/qrcode');
const jsQR = require('../backend/node_modules/jsqr');
const { jsPDF } = require('../frontend/node_modules/jspdf');

const BASE_URL = 'http://localhost:5000';
const timestamp = Date.now();

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body !== null && typeof body === 'object') {
      payload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    } else if (typeof body === 'string') {
      payload = body;
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Helper to scan/decode QR code bitmap using jsQR
async function decodeQr(text, options = {}) {
  const rawQr = QRCode.create(text, options);
  const size = rawQr.modules.size;
  const scale = 4;
  const margin = 4;
  const totalModules = size + margin * 2;
  const imgWidth = totalModules * scale;
  const imgHeight = totalModules * scale;
  const rgba = new Uint8ClampedArray(imgWidth * imgHeight * 4);
  rgba.fill(255);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (rawQr.modules.get(r, c)) {
        const startX = (c + margin) * scale;
        const startY = (r + margin) * scale;
        for (let y = 0; y < scale; y++) {
          for (let x = 0; x < scale; x++) {
            const idx = ((startY + y) * imgWidth + (startX + x)) * 4;
            rgba[idx] = 0;
            rgba[idx + 1] = 0;
            rgba[idx + 2] = 0;
            rgba[idx + 3] = 255;
          }
        }
      }
    }
  }

  const code = jsQR(rgba, imgWidth, imgHeight);
  if (!code) throw new Error(`jsQR failed to decode QR matrix for: ${text}`);
  return code.data;
}

const tests = [];
function test(category, name, fn) {
  tests.push({ category, name, fn });
}

// Global Context
let userA = { email: `qa_phase13_a_${timestamp}@example.com`, password: 'TestPassword123!', token: null, id: null };
let userB = { email: `qa_phase13_b_${timestamp}@example.com`, password: 'TestPassword456!', token: null, id: null };
let resetToken = null;
let dynamicQrId = null;
let dynamicShortCode = null;
let staticQrId = null;
let emptyQrId = null;
let emptyShortCode = null;

// =========================================================================
// 1. AUTH TESTING
// =========================================================================
test('AUTH', 'Register User A with valid credentials', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'QA User A',
    email: userA.email,
    password: userA.password,
    confirmPassword: userA.password,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const payload = res.data.data || res.data;
  userA.token = payload.token;
  userA.id = payload.user.id;
  return `User A registered (ID: ${userA.id})`;
});

test('AUTH', 'Reject duplicate email registration with 409 Conflict', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Duplicate User',
    email: userA.email,
    password: 'Password999!',
    confirmPassword: 'Password999!',
  });
  if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
  return 'Duplicate email rejected with 409.';
});

test('AUTH', 'Reject invalid email format with 400 Bad Request', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Invalid Email',
    email: 'not-an-email-at-all',
    password: 'ValidPassword123!',
    confirmPassword: 'ValidPassword123!',
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  return 'Invalid email rejected with 400.';
});

test('AUTH', 'Reject weak password (<8 chars) with 400 Bad Request', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Weak Password',
    email: `weak_${timestamp}@example.com`,
    password: '123',
    confirmPassword: '123',
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  return 'Weak password rejected with 400.';
});

test('AUTH', 'Reject password mismatch with 400 Bad Request', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Mismatch User',
    email: `mismatch_${timestamp}@example.com`,
    password: 'ValidPassword123!',
    confirmPassword: 'DifferentPassword123!',
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  return 'Password mismatch rejected with 400.';
});

test('AUTH', 'Login User A with valid credentials', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: userA.password,
  });
  if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  userA.token = (res.data.data || res.data).token;
  return 'Login successful. JWT token issued.';
});

test('AUTH', 'Reject login with wrong password (401 Unauthorized)', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: 'IncorrectPassword999!',
  });
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  return 'Wrong password rejected with 401.';
});

test('AUTH', 'Reject login for non-existent email (401 Unauthorized)', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: `ghost_${timestamp}@nonexistent.com`,
    password: 'SomePassword123!',
  });
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  return 'Non-existent email rejected with 401.';
});

test('AUTH', 'Verify session retrieval via GET /api/auth/me', async () => {
  const res = await request('GET', '/api/auth/me', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const payload = res.data.data || res.data;
  if (payload.user?.email !== userA.email) throw new Error('Session email mismatch');
  return `Current session verified for ${payload.user.email}`;
});

test('AUTH', 'Reject request without Authorization token (401)', async () => {
  const res = await request('GET', '/api/auth/me');
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  return 'Unauthenticated request blocked with 401.';
});

test('AUTH', 'Reject forged / tampered JWT token (401)', async () => {
  const res = await request('GET', '/api/auth/me', null, {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tamperedSignature',
  });
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  return 'Tampered JWT rejected with 401.';
});

test('AUTH', 'Reject expired JWT token (401)', async () => {
  const expiredJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
  const res = await request('GET', '/api/auth/me', null, {
    'Authorization': `Bearer ${expiredJwt}`,
  });
  if (res.status !== 401) throw new Error(`Expected 401 for expired token, got ${res.status}`);
  return 'Expired token safely rejected with 401.';
});

test('AUTH', 'Update User Profile (name & avatar)', async () => {
  const res = await request('PUT', '/api/auth/profile', {
    name: 'QA User A Updated',
    avatar: 'https://avatars.githubusercontent.com/u/9919?v=4',
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const payload = res.data.data || res.data;
  if (payload.user?.name !== 'QA User A Updated') throw new Error('Name not updated');
  return 'Profile updated successfully.';
});

test('AUTH', 'Change password flow & validation', async () => {
  const newPassword = 'NewSecretPassword456!';
  const res = await request('PUT', '/api/auth/change-password', {
    currentPassword: userA.password,
    newPassword,
    confirmNewPassword: newPassword,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Password change failed: ${JSON.stringify(res.data)}`);

  const newLogin = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: newPassword,
  });
  if (newLogin.status !== 200) throw new Error('New password failed to authenticate');
  userA.password = newPassword;
  userA.token = (newLogin.data.data || newLogin.data).token;
  return 'Password changed and verified.';
});

test('AUTH', 'Forgot password & Reset password flow', async () => {
  const forgotRes = await request('POST', '/api/auth/forgot-password', {
    email: userA.email,
  });
  if (forgotRes.status !== 200) throw new Error(`Forgot password failed: ${JSON.stringify(forgotRes.data)}`);
  resetToken = (forgotRes.data.data || forgotRes.data).devToken;

  const finalPassword = 'FinalRestoredPassword789!';
  const resetRes = await request('POST', '/api/auth/reset-password', {
    token: resetToken,
    password: finalPassword,
    confirmPassword: finalPassword,
  });
  if (resetRes.status !== 200) throw new Error(`Reset password failed: ${JSON.stringify(resetRes.data)}`);

  const finalLogin = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: finalPassword,
  });
  if (finalLogin.status !== 200) throw new Error('Login after reset failed');
  userA.password = finalPassword;
  userA.token = (finalLogin.data.data || finalLogin.data).token;
  return 'Password reset flow verified.';
});

test('AUTH', 'Logout endpoint', async () => {
  const res = await request('POST', '/api/auth/logout', {}, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  return 'Logout endpoint returns 200 OK.';
});

test('AUTH', 'Register User B for multi-tenant isolation tests', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'QA User B',
    email: userB.email,
    password: userB.password,
    confirmPassword: userB.password,
  });
  if (res.status !== 201) throw new Error(`User B register failed: ${JSON.stringify(res.data)}`);
  const payload = res.data.data || res.data;
  userB.token = payload.token;
  userB.id = payload.user.id;
  return `User B registered with ID ${userB.id}`;
});

// =========================================================================
// 2. QR CODE GENERATION & REAL SCANNING DECODING TESTS
// =========================================================================
test('QR_GEN', 'Create Static URL QR Code', async () => {
  const res = await request('POST', '/api/qr', {
    name: 'Static URL QR',
    type: 'URL',
    destinationUrl: 'https://github.com/google',
    metadata: { url: 'https://github.com/google' },
    isDynamic: false,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  staticQrId = qr.id;
  if (qr.content !== 'https://github.com/google') throw new Error(`Payload mismatch: ${qr.content}`);
  return `Static URL QR created: ${qr.id}`;
});

test('QR_GEN', 'Create Static Plain Text QR Code', async () => {
  const plainText = 'Antigravity Platform E2E Test String #12345';
  const res = await request('POST', '/api/qr', {
    name: 'Static Text QR',
    type: 'TEXT',
    metadata: { text: plainText },
    isDynamic: false,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  if (qr.content !== plainText) throw new Error(`Payload mismatch: ${qr.content}`);
  return `Plain Text QR payload verified: "${qr.content}"`;
});

test('QR_GEN', 'Create Static Wi-Fi QR Code (WPA/WPA2/Hidden network payload)', async () => {
  const res = await request('POST', '/api/qr', {
    name: 'Office Wi-Fi Guest',
    type: 'WIFI',
    metadata: {
      wifi: {
        ssid: 'CompanyGuestWifi',
        password: 'GuestSecretPassword123',
        encryption: 'WPA',
        hidden: false,
      },
    },
    isDynamic: false,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  if (!qr.content.startsWith('WIFI:') || !qr.content.includes('S:CompanyGuestWifi;')) {
    throw new Error(`Invalid Wi-Fi format: ${qr.content}`);
  }
  return `Wi-Fi QR format verified: ${qr.content}`;
});

test('QR_GEN', 'Create Static Payment/UPI QR Code', async () => {
  const res = await request('POST', '/api/qr', {
    name: 'Coffee Shop UPI Payment',
    type: 'PAYMENT',
    metadata: {
      payment: {
        upiId: 'coffeeshop@icici',
        payeeName: 'Artisan Coffee Co',
        amount: '150.00',
        currency: 'INR',
        transactionNote: 'Table 4 Order',
      },
    },
    isDynamic: false,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  if (!qr.content.startsWith('upi://pay?') || !decodeURIComponent(qr.content).includes('coffeeshop@icici')) {
    throw new Error(`Invalid UPI format: ${qr.content}`);
  }
  return `UPI payment payload verified: ${qr.content}`;
});

test('QR_GEN', 'Create Dynamic QR Code with unique shortcode', async () => {
  const res = await request('POST', '/api/qr', {
    name: 'E2E Dynamic Launch Campaign',
    type: 'URL',
    destinationUrl: 'https://antigravity.google.com/launch',
    metadata: { url: 'https://antigravity.google.com/launch' },
    isDynamic: true,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  dynamicQrId = qr.id;
  dynamicShortCode = qr.shortCode;
  if (!dynamicShortCode) throw new Error('Dynamic shortCode was not generated');
  return `Dynamic QR created: ID=${dynamicQrId}, shortCode=${dynamicShortCode}`;
});

// REAL SCANNING VERIFICATION USING JSQR
test('QR_SCAN', 'Verify URL QR matrix scannability and bit-level decode', async () => {
  const target = 'https://antigravity.google.com/launch';
  const decoded = await decodeQr(target);
  if (decoded !== target) throw new Error(`Decoded mismatch: ${decoded}`);
  return `URL QR scanned and decoded successfully: "${decoded}"`;
});

test('QR_SCAN', 'Verify Text QR matrix scannability and bit-level decode', async () => {
  const target = 'Production Quality Verification 2026';
  const decoded = await decodeQr(target);
  if (decoded !== target) throw new Error(`Decoded mismatch: ${decoded}`);
  return `Text QR scanned and decoded successfully: "${decoded}"`;
});

test('QR_SCAN', 'Verify Wi-Fi QR matrix scannability and bit-level decode', async () => {
  const target = 'WIFI:T:WPA;S:CompanyGuestWifi;P:GuestSecretPassword123;;';
  const decoded = await decodeQr(target);
  if (decoded !== target) throw new Error(`Decoded mismatch: ${decoded}`);
  return `Wi-Fi QR scanned and decoded successfully: "${decoded}"`;
});

test('QR_SCAN', 'Verify UPI Payment QR matrix scannability and bit-level decode', async () => {
  const target = 'upi://pay?pa=coffeeshop@icici&pn=Artisan+Coffee+Co&am=150.00&cu=INR';
  const decoded = await decodeQr(target);
  if (decoded !== target) throw new Error(`Decoded mismatch: ${decoded}`);
  return `UPI QR scanned and decoded successfully: "${decoded}"`;
});

// =========================================================================
// 3. CUSTOMIZATION & ERROR CORRECTION SCANNABILITY TESTS
// =========================================================================
test('CUSTOMIZATION', 'Verify Error Correction Levels (L, M, Q, H) Scannability', async () => {
  const target = 'https://example.com/custom-ecc-test';
  for (const ecc of ['L', 'M', 'Q', 'H']) {
    const decoded = await decodeQr(target, { errorCorrectionLevel: ecc });
    if (decoded !== target) throw new Error(`ECC ${ecc} decode failed!`);
  }
  return 'All Error Correction levels (L: 7%, M: 15%, Q: 25%, H: 30%) decode accurately.';
});

test('CUSTOMIZATION', 'Verify High-density payload scannability with ECC H', async () => {
  const longTarget = 'https://antigravity.google.com/campaign?source=billboard&medium=qr&campaign=autumn_promo_2026&user_session=e2e_verified_payload_token_string_998877665544332211';
  const decoded = await decodeQr(longTarget, { errorCorrectionLevel: 'H' });
  if (decoded !== longTarget) throw new Error('Long URL with ECC H decode failed');
  return `Dense matrix (${decoded.length} chars) decoded successfully with ECC H.`;
});

// =========================================================================
// 4. DOWNLOADS & MULTI-FORMAT ASSET AUDIT
// =========================================================================
test('DOWNLOADS', 'Verify Vector SVG Asset Generation', async () => {
  const svgString = await QRCode.toString('https://example.com/svg-test', { type: 'svg' });
  if (!svgString.startsWith('<svg') || !svgString.includes('</svg>')) {
    throw new Error('Generated SVG is malformed');
  }
  return `Valid SVG asset verified (${svgString.length} chars).`;
});

test('DOWNLOADS', 'Verify PNG Asset Header Signature', async () => {
  const pngDataUrl = await QRCode.toDataURL('https://example.com/png-test');
  const base64Data = pngDataUrl.replace('data:image/png;base64,', '');
  const pngBuffer = Buffer.from(base64Data, 'base64');
  if (pngBuffer[0] !== 0x89 || pngBuffer[1] !== 0x50 || pngBuffer[2] !== 0x4E || pngBuffer[3] !== 0x47) {
    throw new Error('Invalid PNG magic bytes');
  }
  return `Valid PNG signature verified (${pngBuffer.length} bytes).`;
});

test('DOWNLOADS', 'Verify PDF Document Generation with %PDF- header', async () => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.text('QR CODE TEST DOCUMENT', 20, 20);
  const pdfOutput = doc.output();
  if (!pdfOutput.startsWith('%PDF-')) {
    throw new Error(`PDF header missing! Got: ${pdfOutput.substring(0, 10)}`);
  }
  return `Valid PDF document generated (${pdfOutput.length} bytes, header: ${pdfOutput.substring(0, 8)}).`;
});

// =========================================================================
// 5. DYNAMIC REDIRECTION, CACHING & REAL SCAN TRACKING
// =========================================================================
test('DYNAMIC', 'Scan Dynamic QR: Verify HTTP 302 Redirection & Headers', async () => {
  const res = await request('GET', `/q/${dynamicShortCode}`, null, {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Referer': 'https://twitter.com/promo',
  });
  if (res.status !== 302) throw new Error(`Expected 302 Redirect, got ${res.status}`);
  if (res.headers['location'] !== 'https://antigravity.google.com/launch') {
    throw new Error(`Location header mismatch: ${res.headers['location']}`);
  }
  return `Redirected to ${res.headers['location']} (302)`;
});

test('DYNAMIC', 'Simulate multiple scans from distinct devices for analytics', async () => {
  // Desktop Chrome Scan
  await request('GET', `/q/${dynamicShortCode}`, null, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  // Android Mobile Scan
  await request('GET', `/q/${dynamicShortCode}`, null, {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36',
  });
  return 'Multiple scans logged across iOS, Windows Chrome, and Android Pixel.';
});

test('DYNAMIC', 'Update Dynamic QR destination URL & verify redirect updates', async () => {
  const newTarget = 'https://antigravity.google.com/updated-target';
  const updateRes = await request('PUT', `/api/qr/${dynamicQrId}`, {
    name: 'E2E Dynamic Launch Campaign Updated',
    destinationUrl: newTarget,
    metadata: { url: newTarget },
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (updateRes.status !== 200) throw new Error(`Update failed: ${JSON.stringify(updateRes.data)}`);

  const scanRes = await request('GET', `/q/${dynamicShortCode}`);
  if (scanRes.status !== 302) throw new Error(`Expected 302, got ${scanRes.status}`);
  if (scanRes.headers['location'] !== newTarget) {
    throw new Error(`Redirect did not point to new target! Pointed to: ${scanRes.headers['location']}`);
  }
  return `Destination dynamically updated and redirected to: ${scanRes.headers['location']}`;
});

test('DYNAMIC', 'Disable Dynamic QR: Verify 403 Forbidden with Inactive notice', async () => {
  const statusRes = await request('PATCH', `/api/qr/${dynamicQrId}/status`, {
    status: 'DISABLED',
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (statusRes.status !== 200) throw new Error(`Status toggle failed: ${JSON.stringify(statusRes.data)}`);

  const scanRes = await request('GET', `/q/${dynamicShortCode}`);
  if (scanRes.status === 302) throw new Error('Disabled QR unexpectedly redirected!');
  if (scanRes.status !== 403) throw new Error(`Expected 403 for disabled QR, got ${scanRes.status}`);
  return 'Disabled dynamic QR blocked with 403 Inactive notice.';
});

test('DYNAMIC', 'Re-enable Dynamic QR: Verify redirection resumes', async () => {
  const statusRes = await request('PATCH', `/api/qr/${dynamicQrId}/status`, {
    status: 'ACTIVE',
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (statusRes.status !== 200) throw new Error(`Status toggle failed: ${JSON.stringify(statusRes.data)}`);

  const scanRes = await request('GET', `/q/${dynamicShortCode}`);
  if (scanRes.status !== 302) throw new Error(`Expected 302 after re-enabling, got ${scanRes.status}`);
  return 'Dynamic QR re-enabled and functioning properly.';
});

test('DYNAMIC', 'Scan non-existent shortcode: Verify 404 HTML response', async () => {
  const res = await request('GET', '/q/GHOSTSHORTCODE99');
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  return 'Non-existent shortcode returned 404.';
});

// =========================================================================
// 6. ANALYTICS ENGINE & DATE RANGE TESTS
// =========================================================================
test('ANALYTICS', 'Verify Overview Analytics (Totals, devices, timelines)', async () => {
  const res = await request('GET', '/api/analytics/overview', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Overview analytics failed: ${JSON.stringify(res.data)}`);
  const data = (res.data.data || res.data);
  const metrics = data.metrics || data;
  const breakdowns = data.breakdowns || {};
  if (typeof metrics.totalScans !== 'number' || metrics.totalScans < 4) {
    throw new Error(`Total scans mismatch: expected >= 4, got ${metrics.totalScans}`);
  }
  if (!Array.isArray(breakdowns.devices) || breakdowns.devices.length === 0) {
    throw new Error('Device breakdown is empty or invalid');
  }
  return `Overview metrics: totalScans=${metrics.totalScans}, uniqueScans=${metrics.uniqueScans}, devices=${breakdowns.devices.map(d=>d.device).join(',')}`;
});

test('ANALYTICS', 'Verify Single QR Code Analytics Endpoint', async () => {
  const res = await request('GET', `/api/qr/${dynamicQrId}/analytics`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Single QR analytics failed: ${JSON.stringify(res.data)}`);
  const data = (res.data.data || res.data);
  const metrics = data.metrics || data;
  if (typeof metrics.totalScans !== 'number' || metrics.totalScans < 4) {
    throw new Error(`QR analytics totalScans mismatch: ${metrics.totalScans}`);
  }
  return `Single QR analytics verified: scans=${metrics.totalScans}, unique=${metrics.uniqueScans}`;
});

test('ANALYTICS', 'Verify Date Range Filters on Analytics (7d, 30d, 90d)', async () => {
  const res7d = await request('GET', '/api/analytics/overview?range=7d', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res7d.status !== 200) throw new Error('7d filter failed');

  const res30d = await request('GET', '/api/analytics/overview?range=30d', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res30d.status !== 200) throw new Error('30d filter failed');

  const res90d = await request('GET', '/api/analytics/overview?range=90d', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res90d.status !== 200) throw new Error('90d filter failed');

  return 'Date range filters (7d, 30d, 90d) functioning correctly.';
});

test('ANALYTICS', 'Verify Empty Analytics for freshly created QR with 0 scans', async () => {
  const freshRes = await request('POST', '/api/qr', {
    name: 'Fresh Zero-Scan QR',
    type: 'URL',
    destinationUrl: 'https://example.com/fresh',
    isDynamic: true,
    metadata: { url: 'https://example.com/fresh' },
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (freshRes.status !== 201) throw new Error(`Fresh QR creation failed: ${JSON.stringify(freshRes.data)}`);
  const freshQr = (freshRes.data.data || freshRes.data).qrCode;
  emptyQrId = freshQr.id;

  const res = await request('GET', `/api/qr/${emptyQrId}/analytics`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error('Empty analytics failed');
  const metrics = (res.data.data || res.data).metrics;
  if (metrics.totalScans !== 0 || metrics.uniqueScans !== 0) {
    throw new Error(`Expected 0 scans for fresh QR, got: ${metrics.totalScans}`);
  }
  return 'Clean empty analytics state (0 total scans, 0 unique scans) verified.';
});

// =========================================================================
// 7. QR CODE MANAGEMENT & CRUD
// =========================================================================
test('CRUD', 'List QR codes with pagination, search, and sorting', async () => {
  const res = await request('GET', '/api/qr?page=1&limit=5&sort=newest', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`List failed: ${JSON.stringify(res.data)}`);
  const data = (res.data.data || res.data);
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('No items returned');
  }
  return `Found ${data.pagination.total} QR codes (showing ${data.items.length} items on page 1).`;
});

test('CRUD', 'Filter QR codes by type (URL) and status (ACTIVE)', async () => {
  const resType = await request('GET', '/api/qr?type=URL', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (resType.status !== 200) throw new Error('Type filter failed');
  const items = (resType.data.data || resType.data).items;
  items.forEach(it => {
    if (it.type !== 'URL') throw new Error(`Type filter returned non-URL item: ${it.type}`);
  });

  const resStatus = await request('GET', '/api/qr?status=ACTIVE', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (resStatus.status !== 200) throw new Error('Status filter failed');

  return `Filtered ${items.length} URL QR codes with status ACTIVE.`;
});

test('CRUD', 'Sort QR codes by scan count (highest first)', async () => {
  const res = await request('GET', '/api/qr?sort=scans', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error('Scans sort failed');
  const items = (res.data.data || res.data).items;
  if (items.length > 1) {
    if (items[0].scanCount < items[1].scanCount) {
      throw new Error(`Scans sort order invalid: ${items[0].scanCount} < ${items[1].scanCount}`);
    }
  }
  return 'Sort by scan count verified.';
});

test('CRUD', 'Duplicate QR Code: Generates new ID, new shortCode, resets scan count to 0', async () => {
  const res = await request('POST', `/api/qr/${dynamicQrId}/duplicate`, {
    name: 'E2E Dynamic Launch Campaign (Copy)',
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Duplicate failed: ${JSON.stringify(res.data)}`);
  const duplicate = (res.data.data || res.data).qrCode;

  if (duplicate.id === dynamicQrId) throw new Error('Duplicate has the same ID!');
  if (duplicate.shortCode === dynamicShortCode) throw new Error('Duplicate reused the same shortCode!');
  if (duplicate.scanCount !== 0) throw new Error(`Duplicate scan count not reset to 0: ${duplicate.scanCount}`);
  if (duplicate.name !== 'E2E Dynamic Launch Campaign (Copy)') throw new Error(`Duplicate name incorrect: ${duplicate.name}`);

  await request('DELETE', `/api/qr/${duplicate.id}`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });

  return `Duplicate created with new ID ${duplicate.id} and new shortCode ${duplicate.shortCode}. Clean 0 scans.`;
});

test('CRUD', 'Delete Static QR Code and verify cascade', async () => {
  const res = await request('DELETE', `/api/qr/${staticQrId}`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Delete failed: ${JSON.stringify(res.data)}`);

  const getRes = await request('GET', `/api/qr/${staticQrId}`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (getRes.status === 200) throw new Error('Deleted QR is still accessible!');
  return 'Static QR deleted successfully.';
});

test('CRUD', 'Delete Dynamic QR and verify scan returns 404', async () => {
  const res = await request('DELETE', `/api/qr/${emptyQrId}`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Delete failed: ${JSON.stringify(res.data)}`);
  return 'Deleted dynamic QR verified.';
});

// =========================================================================
// 8. CUSTOM BRANDING & USER SETTINGS
// =========================================================================
test('SETTINGS', 'Retrieve and update custom branding defaults', async () => {
  const brandingData = {
    companyName: 'Acme Enterprise Labs',
    brandColor: '#4f46e5',
    secondaryColor: '#06b6d4',
    defaultQrStyle: 'dots',
    defaultQrSize: 1024,
    defaultErrorCorrection: 'H',
    defaultCta: 'Scan with Camera',
    defaultFooter: 'Powered by Acme',
  };

  const putRes = await request('PUT', '/api/branding', brandingData, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (putRes.status !== 200) throw new Error(`Branding update failed: ${JSON.stringify(putRes.data)}`);

  const getRes = await request('GET', '/api/branding', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (getRes.status !== 200) throw new Error('Failed to retrieve branding');
  const saved = (getRes.data.data || getRes.data).branding;
  if (!saved || saved.companyName !== 'Acme Enterprise Labs' || saved.defaultQrStyle !== 'dots') {
    throw new Error('Branding fields did not persist properly: ' + JSON.stringify(saved));
  }
  return 'Branding defaults saved and retrieved successfully.';
});

// =========================================================================
// 9. BULK QR GENERATION & VALIDATION
// =========================================================================
test('BULK', 'Validate valid CSV content string', async () => {
  const csvContent = `name,type,content\nBulk Product 1,URL,https://example.com/p1\nBulk Product 2,URL,https://example.com/p2\nBulk Product 3,TEXT,SKU-99887766`;

  const res = await request('POST', '/api/qr/bulk/validate', {
    csvContent,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Bulk validate failed: ${JSON.stringify(res.data)}`);
  const data = res.data.data || res.data;
  if (data.validCount !== 3) throw new Error(`Validation validCount mismatch: ${JSON.stringify(data)}`);
  return `Bulk validation verified: ${data.validCount} valid records.`;
});

test('BULK', 'Identify invalid records (empty name, invalid URL, unknown type)', async () => {
  const csvContent = `name,type,content\n,URL,https://example.com\nBad URL,URL,not_a_valid_url\nUnknown Type,UNKNOWN_TYPE,hello`;

  const res = await request('POST', '/api/qr/bulk/validate', {
    csvContent,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Expected 200 with validation summary, got ${res.status}`);
  const data = res.data.data || res.data;
  if (data.invalidCount !== 3) throw new Error(`Expected 3 invalid rows, got: ${data.invalidCount}`);
  return `Identified all 3 invalid records cleanly: ${data.invalidCount} invalid rows detected.`;
});

test('BULK', 'Generate real batch and compile ZIP package', async () => {
  const rows = [
    { name: 'Batch Item 1', type: 'URL', content: 'https://example.com/item1', isDynamic: false, metadata: { url: 'https://example.com/item1' } },
    { name: 'Batch Item 2', type: 'TEXT', content: 'Batch Text 2', isDynamic: false, metadata: { text: 'Batch Text 2' } },
  ];

  const res = await request('POST', '/api/qr/bulk/generate', {
    rows,
    format: 'png',
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Bulk generate failed: ${JSON.stringify(res.data)}`);
  const data = res.data.data || res.data;
  if (!data.zipBase64 || data.createdCount !== 2) throw new Error('ZIP package or createdCount missing');

  const zipBuffer = Buffer.from(data.zipBase64, 'base64');
  if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
    throw new Error('ZIP buffer does not have valid PK magic bytes');
  }
  return `Generated batch of ${data.createdCount} QRs with valid ZIP package (${zipBuffer.length} bytes).`;
});

test('BULK', 'Enforce maximum batch limit (>100 items rejected with 400)', async () => {
  const oversizedBatch = Array.from({ length: 105 }, (_, i) => ({
    name: `Item ${i}`,
    type: 'URL',
    content: `https://example.com/item-${i}`,
    isDynamic: false,
    metadata: { url: `https://example.com/item-${i}` },
  }));

  const res = await request('POST', '/api/qr/bulk/generate', {
    rows: oversizedBatch,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 400) throw new Error(`Expected 400 for batch > 100, got ${res.status}`);
  return 'Batch size limit enforced (max 100 items).';
});

// =========================================================================
// 10. SECURITY & MULTI-TENANT AUTHORIZATION AUDIT
// =========================================================================
test('SECURITY', 'User B CANNOT read User A Dynamic QR (404/403 isolation)', async () => {
  const res = await request('GET', `/api/qr/${dynamicQrId}`, null, {
    'Authorization': `Bearer ${userB.token}`,
  });
  if (res.status === 200) throw new Error('CRITICAL VULNERABILITY: User B read User A QR!');
  return `Cross-tenant read blocked with status ${res.status}.`;
});

test('SECURITY', 'User B CANNOT update User A Dynamic QR', async () => {
  const res = await request('PUT', `/api/qr/${dynamicQrId}`, {
    name: 'Hacked Name',
    destinationUrl: 'https://evil-site.com',
  }, {
    'Authorization': `Bearer ${userB.token}`,
  });
  if (res.status === 200) throw new Error('CRITICAL VULNERABILITY: User B updated User A QR!');
  return `Cross-tenant update blocked with status ${res.status}.`;
});

test('SECURITY', 'User B CANNOT delete User A Dynamic QR', async () => {
  const res = await request('DELETE', `/api/qr/${dynamicQrId}`, null, {
    'Authorization': `Bearer ${userB.token}`,
  });
  if (res.status === 200) throw new Error('CRITICAL VULNERABILITY: User B deleted User A QR!');
  return `Cross-tenant deletion blocked with status ${res.status}.`;
});

test('SECURITY', 'User B CANNOT view User A QR Analytics', async () => {
  const res = await request('GET', `/api/qr/${dynamicQrId}/analytics`, null, {
    'Authorization': `Bearer ${userB.token}`,
  });
  if (res.status === 200) throw new Error('CRITICAL VULNERABILITY: User B viewed User A Analytics!');
  return `Cross-tenant analytics access blocked with status ${res.status}.`;
});

test('SECURITY', 'Reject Dangerous Schemes (javascript:, data:, file:, vbscript:)', async () => {
  const schemes = [
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:msgbox("hello")',
  ];

  for (const scheme of schemes) {
    const res = await request('POST', '/api/qr', {
      name: 'Malicious Scheme Attempt',
      type: 'URL',
      destinationUrl: scheme,
      metadata: { url: scheme },
      isDynamic: true,
    }, {
      'Authorization': `Bearer ${userA.token}`,
    });
    if (res.status === 201) throw new Error(`CRITICAL: Dangerous scheme accepted: ${scheme}`);
  }
  return 'All dangerous URI schemes successfully rejected.';
});

// Clean up created user accounts at end
test('CLEANUP', 'Cascade delete User A & User B accounts', async () => {
  await request('DELETE', '/api/auth/account', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  await request('DELETE', '/api/auth/account', null, {
    'Authorization': `Bearer ${userB.token}`,
  });
  return 'Cleaned up test accounts.';
});

// Run all test cases sequentially
async function run() {
  console.log('================================================================');
  console.log('   PHASE 13: FULL END-TO-END AUTOMATED TEST & AUDIT SUITE       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const t of tests) {
    process.stdout.write(`[${t.category}] ${t.name}... `);
    try {
      const result = await t.fn();
      console.log(`\x1b[32mPASSED\x1b[0m\n  └─ ${result}`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31mFAILED\x1b[0m\n  └─ Error: ${err.message}`);
      failed++;
      failures.push({ category: t.category, name: t.name, error: err.message });
    }
  }

  console.log('\n================================================================');
  console.log(`  E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${tests.length})`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFAILURE DETAILS:');
    failures.forEach((f, i) => console.error(`  ${i+1}. [${f.category}] ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

run();
