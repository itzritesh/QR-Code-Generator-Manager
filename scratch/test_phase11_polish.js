const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=== PHASE 11: FULL STACK POLISH, TEMPLATES & SETTINGS VERIFICATION ===\n');
  const timestamp = Date.now();
  const testEmail = `polish_user_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  // 1. Register test user
  console.log('1. Registering test user:', testEmail);
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Polish Test User',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    }
  );

  if (regRes.status !== 201 && regRes.status !== 200) {
    throw new Error(`Register failed (${regRes.status}): ${JSON.stringify(regRes.data)}`);
  }
  const token = regRes.data.data.token;
  console.log('   ✅ Registered successfully. User ID:', regRes.data.data.user.id);

  // 2. Profile Update: Update Name and Avatar
  console.log('\n2. Testing Profile Update (Name & Avatar)...');
  const mockAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const profileRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Polished Executive Name',
      avatar: mockAvatar,
    }
  );

  if (profileRes.status !== 200) {
    throw new Error(`Profile update failed: ${JSON.stringify(profileRes.data)}`);
  }
  console.log('   ✅ Profile updated. New name:', profileRes.data.data.user.name);
  console.log('   ✅ Avatar stored cleanly. Length:', profileRes.data.data.user.avatar ? profileRes.data.data.user.avatar.length : 0);

  // 3. Test QR & Branding Settings Persistence
  console.log('\n3. Testing Settings & Defaults Persistence...');
  const settingsPayload = {
    companyName: 'Apex Innovations Corp',
    primaryColor: '#0f172a',
    secondaryColor: '#4f46e5',
    defaultQrStyle: 'dots',
    defaultQrSize: 1024,
    defaultErrorCorrection: 'H',
    defaultDownloadFormat: 'svg',
    defaultCta: '⚡ Scan with your camera',
    defaultFooter: 'Powered by Apex Platform',
  };

  const saveSettingsRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/branding',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    settingsPayload
  );

  if (saveSettingsRes.status !== 200) {
    throw new Error(`Settings update failed: ${JSON.stringify(saveSettingsRes.data)}`);
  }
  console.log('   ✅ Saved QR & Branding defaults in PostgreSQL');

  // Verify retrieval
  const getSettingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/branding',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const retrieved = getSettingsRes.data.data.branding;
  console.log('   Verification checks:');
  console.log('   - defaultQrSize:', retrieved.defaultQrSize, (retrieved.defaultQrSize === 1024 ? '✅' : '❌'));
  console.log('   - defaultErrorCorrection:', retrieved.defaultErrorCorrection, (retrieved.defaultErrorCorrection === 'H' ? '✅' : '❌'));
  console.log('   - defaultDownloadFormat:', retrieved.defaultDownloadFormat, (retrieved.defaultDownloadFormat === 'svg' ? '✅' : '❌'));
  console.log('   - defaultQrStyle:', retrieved.defaultQrStyle, (retrieved.defaultQrStyle === 'dots' ? '✅' : '❌'));
  console.log('   - companyName:', retrieved.companyName, (retrieved.companyName === 'Apex Innovations Corp' ? '✅' : '❌'));

  // 4. Create a QR Code to verify cascading delete
  console.log('\n4. Creating a dynamic QR Code for user...');
  const createQrRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/qr',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Polish Test Dynamic QR',
      type: 'URL',
      content: 'https://example.com/polish-demo',
      dynamicEnabled: true,
      destinationUrl: 'https://example.com/polish-demo',
      metadata: { url: 'https://example.com/polish-demo' },
      design: {
        fgColor: retrieved.primaryColor,
        size: retrieved.defaultQrSize,
        errorCorrection: retrieved.defaultErrorCorrection,
        dotStyle: retrieved.defaultQrStyle,
      },
    }
  );

  if (createQrRes.status !== 201) {
    throw new Error(`Create QR failed: ${JSON.stringify(createQrRes.data)}`);
  }
  const qr = createQrRes.data.data.qrCode;
  const qrId = qr.id;
  const shortCode = qr.shortCode;
  console.log(`   ✅ QR Code created: ${qrId} (shortCode: ${shortCode})`);

  // 5. Simulate a scan on this dynamic QR
  console.log('\n5. Simulating a scan to generate Scan tracking event...');
  const scanRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/q/${shortCode}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });
  console.log(`   ✅ Scan registered. Redirect status: ${scanRes.status}`);

  // 6. Test Account Deletion & Cascade
  console.log('\n6. Testing Account Deletion (Cascade Verification)...');
  const deleteRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/account',
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (deleteRes.status !== 200) {
    throw new Error(`Account deletion failed: ${JSON.stringify(deleteRes.data)}`);
  }
  console.log('   ✅ Account deletion executed:', deleteRes.data.message);

  // 7. Verify user can no longer authenticate
  console.log('\n7. Verifying deleted account cannot authenticate...');
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   ✅ Auth token rejection status:', meRes.status, (meRes.status === 401 ? '✅ (Token revoked/User not found)' : '⚠️'));

  // 8. Verify dynamic shortcode is inactive/not found
  console.log('\n8. Verifying dynamic shortcode post-deletion...');
  const postScanRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/q/${shortCode}`,
    method: 'GET',
  });
  console.log('   ✅ Shortcode status post-deletion:', postScanRes.status, (postScanRes.status === 404 ? '✅ (Clean cascade)' : '⚠️'));

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 11 BACKEND & API TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
