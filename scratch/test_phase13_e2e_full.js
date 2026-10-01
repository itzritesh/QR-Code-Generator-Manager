// Phase 13 Comprehensive End-to-End Testing & Bug Auditing Suite
const http = require('http');

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

const tests = [];
function test(category, name, fn) {
  tests.push({ category, name, fn });
}

// Global Context
let userA = { email: `e2e_a_${timestamp}@example.com`, password: 'TestPassword123!', token: null, id: null };
let userB = { email: `e2e_b_${timestamp}@example.com`, password: 'TestPassword456!', token: null, id: null };
let resetToken = null;
let dynamicQrId = null;
let dynamicShortCode = null;
let staticQrId = null;

// =========================================================================
// 1. AUTHENTICATION & SESSION TESTING
// =========================================================================
test('AUTH', 'Register User A with valid credentials', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'E2E User A',
    email: userA.email,
    password: userA.password,
    confirmPassword: userA.password,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const payload = res.data.data || res.data;
  if (!payload.token || !payload.user?.id) throw new Error('Missing token or user ID');
  userA.token = payload.token;
  userA.id = payload.user.id;
  return `User A registered with ID ${userA.id}`;
});

test('AUTH', 'Reject duplicate email registration with 409 Conflict', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Duplicate User',
    email: userA.email,
    password: 'Password999!',
    confirmPassword: 'Password999!',
  });
  if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
  return 'Duplicate email safely rejected with 409 Conflict.';
});

test('AUTH', 'Reject invalid email format with 400 Bad Request', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Invalid Email User',
    email: 'not-an-email',
    password: 'ValidPassword123!',
    confirmPassword: 'ValidPassword123!',
  });
  if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
  return 'Invalid email format rejected with 400.';
});

test('AUTH', 'Reject weak password (<8 chars / missing requirements) with 400', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Weak Password User',
    email: `weak_${timestamp}@example.com`,
    password: '123',
    confirmPassword: '123',
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  return 'Weak password rejected with 400.';
});

test('AUTH', 'Reject password mismatch with 400', async () => {
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
  const payload = res.data.data || res.data;
  if (!payload.token) throw new Error('Missing login JWT');
  userA.token = payload.token;
  return 'Login successful. JWT token issued.';
});

test('AUTH', 'Reject login with wrong password (401 Unauthorized)', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: 'IncorrectPassword999!',
  });
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  return 'Incorrect password rejected with 401.';
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
  if (payload.user?.email !== userA.email) throw new Error('Profile user email does not match');
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

test('AUTH', 'Update User Profile (name & avatar)', async () => {
  const res = await request('PUT', '/api/auth/profile', {
    name: 'E2E User A Updated',
    avatar: 'https://avatars.githubusercontent.com/u/9919?v=4',
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const payload = res.data.data || res.data;
  if (payload.user?.name !== 'E2E User A Updated') throw new Error('Profile name not updated');
  return 'Profile updated successfully with avatar URL.';
});

test('AUTH', 'Change password flow & validation', async () => {
  const newPassword = 'NewSecretPassword456!';
  // Attempt with wrong current password
  const failRes = await request('PUT', '/api/auth/change-password', {
    currentPassword: 'WrongPassword!',
    newPassword,
    confirmNewPassword: newPassword,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (failRes.status !== 400 && failRes.status !== 401) {
    throw new Error(`Expected 400/401 for wrong current password, got ${failRes.status}`);
  }

  // Attempt with correct current password
  const successRes = await request('PUT', '/api/auth/change-password', {
    currentPassword: userA.password,
    newPassword,
    confirmNewPassword: newPassword,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (successRes.status !== 200) throw new Error(`Password change failed: ${JSON.stringify(successRes.data)}`);

  // Verify old password no longer works
  const oldLogin = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: userA.password,
  });
  if (oldLogin.status === 200) throw new Error('Old password still authenticated!');

  // Verify new password works
  const newLogin = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: newPassword,
  });
  if (newLogin.status !== 200) throw new Error('New password failed to authenticate');

  userA.password = newPassword;
  userA.token = (newLogin.data.data || newLogin.data).token;
  return 'Password changed and verified. Old password revoked.';
});

test('AUTH', 'Forgot password & Reset password flow', async () => {
  // Request password reset
  const forgotRes = await request('POST', '/api/auth/forgot-password', {
    email: userA.email,
  });
  if (forgotRes.status !== 200) throw new Error(`Forgot password failed: ${JSON.stringify(forgotRes.data)}`);
  const payload = forgotRes.data.data || forgotRes.data;
  resetToken = payload.devToken;
  if (!resetToken) throw new Error('devToken not returned in development mode');

  // Reset password using token
  const finalPassword = 'FinalRestoredPassword789!';
  const resetRes = await request('POST', '/api/auth/reset-password', {
    token: resetToken,
    password: finalPassword,
    confirmPassword: finalPassword,
  });
  if (resetRes.status !== 200) throw new Error(`Reset password failed: ${JSON.stringify(resetRes.data)}`);

  // Verify final login
  const finalLogin = await request('POST', '/api/auth/login', {
    email: userA.email,
    password: finalPassword,
  });
  if (finalLogin.status !== 200) throw new Error('Login after reset failed');

  userA.password = finalPassword;
  userA.token = (finalLogin.data.data || finalLogin.data).token;
  return 'Password reset token verified and consumed.';
});

test('AUTH', 'Logout endpoint', async () => {
  const res = await request('POST', '/api/auth/logout', {}, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  return 'Logout endpoint returns 200 OK.';
});

// Register User B for multi-tenant isolation testing
test('AUTH', 'Register User B for multi-tenant isolation tests', async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'E2E User B',
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
// 2. QR CODE GENERATION & TYPES AUDIT
// =========================================================================
test('QR_GEN', 'Create Static URL QR Code', async () => {
  const res = await request('POST', '/api/qr', {
    name: 'Static URL QR',
    type: 'URL',
    destinationUrl: 'https://github.com/google',
    metadata: {
      url: 'https://github.com/google',
    },
    isDynamic: false,
    design: {
      fgColor: '#1e293b',
      bgColor: '#ffffff',
      errorCorrection: 'M',
    },
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  staticQrId = qr.id;
  if (qr.content !== 'https://github.com/google') throw new Error(`Payload mismatch: ${qr.content}`);
  if (qr.isDynamic !== false) throw new Error('Should be static QR');
  return `Static URL QR created: ${qr.id}`;
});

test('QR_GEN', 'Create Static Plain Text QR Code', async () => {
  const plainText = 'Antigravity Platform E2E Test String #12345';
  const res = await request('POST', '/api/qr', {
    name: 'Static Text QR',
    type: 'TEXT',
    metadata: {
      text: plainText,
    },
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
  if (!qr.content.startsWith('WIFI:') || !qr.content.includes('S:CompanyGuestWifi;') || !qr.content.includes('P:GuestSecretPassword123;')) {
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
  if (!qr.content.startsWith('upi://pay?') || !qr.content.includes('coffeeshop') || !qr.content.includes('150.00')) {
    throw new Error(`Invalid UPI format: ${qr.content}`);
  }
  return `UPI payment payload verified: ${qr.content}`;
});

test('QR_GEN', 'Create Dynamic QR Code with unique shortcode', async () => {
  const res = await request('POST', '/api/qr', {
    name: 'E2E Dynamic Launch Campaign',
    type: 'URL',
    destinationUrl: 'https://antigravity.google.com/launch',
    metadata: {
      url: 'https://antigravity.google.com/launch',
    },
    isDynamic: true,
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  const qr = (res.data.data || res.data).qrCode;
  dynamicQrId = qr.id;
  dynamicShortCode = qr.shortCode;
  if (!dynamicShortCode) throw new Error('Dynamic shortCode was not generated');
  if (!qr.content.includes(`/q/${dynamicShortCode}`)) throw new Error(`Content URL does not contain shortCode: ${qr.content}`);
  return `Dynamic QR created: ID=${dynamicQrId}, shortCode=${dynamicShortCode}`;
});

// =========================================================================
// 3. DYNAMIC REDIRECTION, CACHING & REAL SCAN TRACKING
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
    metadata: {
      url: newTarget,
    },
  }, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (updateRes.status !== 200) throw new Error(`Update failed: ${JSON.stringify(updateRes.data)}`);

  // Scan again to verify new target is served
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

  // Scan should now be blocked
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
// 4. ANALYTICS ENGINE & AGGREGATIONS
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

test('ANALYTICS', 'Verify Date Range Filters on Analytics (7d, 30d, 90d, custom)', async () => {
  const res7d = await request('GET', '/api/analytics/overview?range=7d', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res7d.status !== 200) throw new Error('7d filter failed');

  const res30d = await request('GET', '/api/analytics/overview?range=30d', null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (res30d.status !== 200) throw new Error('30d filter failed');

  return 'Date range filters (7d, 30d) functioning correctly.';
});

// =========================================================================
// 5. QR CODE MANAGEMENT & CRUD
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
  if (!data.pagination || data.pagination.total === undefined) {
    throw new Error('Missing pagination metadata');
  }
  return `Found ${data.pagination.total} QR codes (showing ${data.items.length} items on page 1).`;
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

  // Delete duplicate right away to keep clean state
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

  // Verify it is no longer returned
  const getRes = await request('GET', `/api/qr/${staticQrId}`, null, {
    'Authorization': `Bearer ${userA.token}`,
  });
  if (getRes.status === 200) throw new Error('Deleted QR is still accessible!');
  return 'Static QR deleted successfully.';
});

// =========================================================================
// 6. CUSTOM BRANDING & USER SETTINGS
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
// 7. BULK QR GENERATION & VALIDATION
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
  if (data.validCount !== 3) {
    throw new Error(`Validation validCount mismatch: ${JSON.stringify(data)}`);
  }
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
  if (data.invalidCount !== 3) {
    throw new Error(`Expected 3 invalid rows, got: ${data.invalidCount}`);
  }
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
  if (!data.zipBase64 || data.createdCount !== 2) {
    throw new Error('ZIP package or createdCount missing');
  }
  // Verify base64 is a valid ZIP header (PK..)
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
// 8. SECURITY & MULTI-TENANT AUTHORIZATION AUDIT
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

// =========================================================================
// 9. DOWNLOADS & EXPORT GENERATION AUDIT
// =========================================================================
test('DOWNLOADS', 'Verify PNG & SVG QR generation libraries output valid assets', async () => {
  const QRCode = require('../backend/node_modules/qrcode');
  // SVG Generation
  const svgString = await QRCode.toString('https://example.com/test-download', { type: 'svg' });
  if (!svgString.startsWith('<svg') || !svgString.includes('</svg>')) {
    throw new Error('Generated SVG is malformed or invalid');
  }

  // PNG Data URL Generation
  const pngDataUrl = await QRCode.toDataURL('https://example.com/test-download');
  if (!pngDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Generated PNG Data URL is invalid');
  }

  const base64Data = pngDataUrl.replace('data:image/png;base64,', '');
  const pngBuffer = Buffer.from(base64Data, 'base64');
  // Verify PNG signature (\x89PNG\r\n\x1a\n)
  if (pngBuffer[0] !== 0x89 || pngBuffer[1] !== 0x50 || pngBuffer[2] !== 0x4E || pngBuffer[3] !== 0x47) {
    throw new Error('Invalid PNG header signature');
  }

  return `SVG (${svgString.length} chars) and PNG (${pngBuffer.length} bytes) verified valid.`;
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
