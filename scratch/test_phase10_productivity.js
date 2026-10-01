const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {}),
      },
    };

    if (postData && !reqOptions.headers['Content-Type']) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }
    if (postData) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let data;
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(buffer.toString('utf8'));
          } catch (e) {
            data = buffer.toString('utf8');
          }
        } else {
          data = buffer;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          rawBuffer: buffer,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 10: ADVANCED PRODUCTIVITY FEATURES E2E TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Register & login a test user
    const timestamp = Date.now();
    const testEmail = `pro_user_${timestamp}@example.com`;
    const testPassword = 'Password123!';

    console.log(`[0] Registering test user: ${testEmail}...`);
    const regRes = await request(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: {
        name: 'Productivity Tester',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });

    assert(regRes.status === 201 || regRes.status === 200, `Registered test user (${regRes.status})`);
    const token = regRes.data.data.token;
    assert(Boolean(token), 'Received JWT auth token');

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    // ==========================================
    // 1. DUPLICATE QR TESTS
    // ==========================================
    console.log('\n[1] Testing QR Duplication Feature...');

    // 1a. Create original dynamic QR code
    const createRes = await request(`${API_BASE}/qr`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'Original Promo Campaign',
        type: 'URL',
        isDynamic: true,
        destinationUrl: 'https://myshop.com/promo-2026',
        metadata: {
          url: 'https://myshop.com/promo-2026',
        },
        design: {
          fgColor: '#4f46e5',
          dotStyle: 'dots',
          eyeFrameStyle: 'rounded',
        },
      },
    });

    assert(createRes.status === 201, `Created original dynamic QR (${createRes.status})`);
    const originalQr = createRes.data.data.qrCode;
    assert(Boolean(originalQr.id), `Original QR ID: ${originalQr.id}`);
    assert(Boolean(originalQr.shortCode), `Original shortCode: ${originalQr.shortCode}`);
    assert(originalQr.scanCount === 0, 'Original QR initial scan count is 0');

    // 1b. Simulate scan on original QR
    console.log(`  Scanning original QR via /q/${originalQr.shortCode}...`);
    const scanRes = await request(`http://localhost:5000/q/${originalQr.shortCode}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      },
    });
    assert(scanRes.status === 302 || scanRes.status === 301, `Scan redirects to destination (${scanRes.status})`);

    // Verify scan was recorded
    const getOrigRes = await request(`${API_BASE}/qr/${originalQr.id}`, {
      headers: authHeaders,
    });
    const refreshedOrig = getOrigRes.data.data.qrCode;
    assert(refreshedOrig.scanCount === 1, `Original QR scan count incremented to 1 (actual: ${refreshedOrig.scanCount})`);

    // 1c. Duplicate QR code with custom rename
    console.log('  Duplicating QR code with custom rename...');
    const dupRes = await request(`${API_BASE}/qr/${originalQr.id}/duplicate`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'Cloned Promo Campaign - Fall Edition',
      },
    });

    assert(dupRes.status === 201, `Duplicate API returned 201 Created (${dupRes.status})`);
    const duplicatedQr = dupRes.data.data.qrCode;

    assert(duplicatedQr.id !== originalQr.id, `New distinct ID created (${duplicatedQr.id} !== ${originalQr.id})`);
    assert(duplicatedQr.shortCode !== originalQr.shortCode, `New distinct shortCode generated (${duplicatedQr.shortCode} !== ${originalQr.shortCode})`);
    assert(duplicatedQr.name === 'Cloned Promo Campaign - Fall Edition', `Custom name applied: "${duplicatedQr.name}"`);
    assert(duplicatedQr.type === originalQr.type, `Preserved QR Type: ${duplicatedQr.type}`);
    assert(duplicatedQr.destinationUrl === originalQr.destinationUrl, `Preserved destination URL: ${duplicatedQr.destinationUrl}`);
    assert(duplicatedQr.design?.dotStyle === 'dots', 'Preserved design customization');

    // Crucial requirement: Do NOT copy old scan history or scan totals
    assert(duplicatedQr.scanCount === 0, `Duplicated QR scanCount is strictly reset to 0 (actual: ${duplicatedQr.scanCount})`);
    assert(duplicatedQr.lastScannedAt === null, 'Duplicated QR lastScannedAt is null');

    // Check analytics scans for duplicated QR (with retry for serverless pooler)
    let dupAnalyticsRes;
    for (let attempt = 1; attempt <= 3; attempt++) {
      dupAnalyticsRes = await request(`${API_BASE}/analytics/qr/${duplicatedQr.id}`, {
        headers: authHeaders,
      });
      if (dupAnalyticsRes.status === 200) break;
      await new Promise((r) => setTimeout(r, 800));
    }
    assert(dupAnalyticsRes.status === 200, `Fetched duplicated QR analytics (${dupAnalyticsRes.status})`);
    if (dupAnalyticsRes.data && dupAnalyticsRes.data.data) {
      const dupTotalScans = dupAnalyticsRes.data.data.metrics?.totalScans ?? dupAnalyticsRes.data.data.totalScans ?? 0;
      assert(dupTotalScans === 0, `Duplicated QR analytics has 0 total scans (actual: ${dupTotalScans})`);
    }

    // Original QR scan count must still be preserved
    const recheckOrigRes = await request(`${API_BASE}/qr/${originalQr.id}`, {
      headers: authHeaders,
    });
    assert(recheckOrigRes.data.data.qrCode.scanCount === 1, 'Original QR scan count remains unchanged at 1');

    // ==========================================
    // 2. CUSTOM BRANDING TESTS
    // ==========================================
    console.log('\n[2] Testing Custom Branding Features...');

    // 2a. Fetch initial branding
    const getBrandRes1 = await request(`${API_BASE}/branding`, {
      headers: authHeaders,
    });
    assert(getBrandRes1.status === 200, `GET /api/branding returns 200 (${getBrandRes1.status})`);
    assert(Boolean(getBrandRes1.data.data.branding), 'Returned initial branding object');

    // 2b. Update branding settings
    const brandPayload = {
      companyName: 'Apex Innovations',
      logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      primaryColor: '#1d4ed8',
      secondaryColor: '#9333ea',
      defaultQrStyle: 'rounded',
      defaultQrSize: 1024,
      defaultCta: 'Scan to connect with Apex',
      defaultFooter: 'Powered by Apex Innovations',
    };

    const putBrandRes = await request(`${API_BASE}/branding`, {
      method: 'PUT',
      headers: authHeaders,
      body: brandPayload,
    });

    assert(putBrandRes.status === 200, `PUT /api/branding updated successfully (${putBrandRes.status})`);
    const savedBrand = putBrandRes.data.data.branding;
    assert(savedBrand.companyName === 'Apex Innovations', `Saved companyName: "${savedBrand.companyName}"`);
    assert(savedBrand.primaryColor === '#1d4ed8', `Saved primaryColor: ${savedBrand.primaryColor}`);
    assert(savedBrand.secondaryColor === '#9333ea', `Saved secondaryColor: ${savedBrand.secondaryColor}`);
    assert(savedBrand.defaultQrStyle === 'rounded', `Saved defaultQrStyle: ${savedBrand.defaultQrStyle}`);
    assert(savedBrand.defaultQrSize === 1024, `Saved defaultQrSize: ${savedBrand.defaultQrSize}`);
    assert(savedBrand.defaultCta === 'Scan to connect with Apex', `Saved defaultCta: "${savedBrand.defaultCta}"`);

    // 2c. Verify persistence with GET /api/branding
    const getBrandRes2 = await request(`${API_BASE}/branding`, {
      headers: authHeaders,
    });
    assert(getBrandRes2.status === 200, 'GET /api/branding re-fetch succeeds');
    assert(getBrandRes2.data.data.branding.companyName === 'Apex Innovations', 'Verified persistent branding state');

    // 2d. Test validation on invalid color format
    const badColorRes = await request(`${API_BASE}/branding`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        primaryColor: 'not-a-valid-hex-code',
      },
    });
    assert(badColorRes.status === 400, `Rejected invalid hex color (${badColorRes.status})`);

    // ==========================================
    // 3. BULK QR GENERATION TESTS
    // ==========================================
    console.log('\n[3] Testing Bulk QR Generation & ZIP Export...');

    // 3a. Download sample template
    const templateRes = await request(`${API_BASE}/qr/bulk/template`, {
      headers: authHeaders,
    });
    assert(templateRes.status === 200, `GET /api/qr/bulk/template returns 200 (${templateRes.status})`);
    const sampleCsv = templateRes.data.toString ? templateRes.data.toString('utf8') : templateRes.data;
    assert(sampleCsv.includes('name,type,content'), 'Template contains CSV headers');

    // 3b. Test CSV with mixed valid and invalid rows
    const mixedCsv = `name,type,content
Corporate Site,URL,https://apex.corp/launch
Tech Support,TEXT,Contact support@apex.corp for assistance
Office Guest WiFi,WIFI,ApexGuest
Cafeteria Pay,PAYMENT,apexstore@okhdfcbank
,URL,https://missingname.com
Bad Protocol,UNKNOWN_TYPE,https://example.com
Malformed Link,URL,javascript:alert(1)
Empty WiFi,WIFI,
Duplicate Row,TEXT,Identical Content
Duplicate Row,TEXT,Identical Content`;

    console.log('  Validating mixed CSV with 10 rows (5 valid, 5 invalid)...');
    const valRes = await request(`${API_BASE}/qr/bulk/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        csvContent: mixedCsv,
      },
    });

    assert(valRes.status === 200, `POST /api/qr/bulk/validate returns 200 (${valRes.status})`);
    const valData = valRes.data.data;
    assert(valData.totalRows === 10, `Total parsed rows: ${valData.totalRows}`);
    assert(valData.validRows.length === 5, `Valid rows count is 5 (actual: ${valData.validRows.length})`);
    assert(valData.invalidRows.length === 5, `Invalid rows count is 5 (actual: ${valData.invalidRows.length})`);

    // Verify row numbers and specific errors
    const missingNameErr = valData.invalidRows.find((r) => r.rowNumber === 6);
    assert(Boolean(missingNameErr && missingNameErr.errors.some((e) => e.includes('Missing required column: "name"'))), `Row 6 identified: "${missingNameErr?.errors?.[0]}"`);

    const badTypeErr = valData.invalidRows.find((r) => r.rowNumber === 7);
    assert(Boolean(badTypeErr && badTypeErr.errors.some((e) => e.includes('Invalid type'))), `Row 7 identified: "${badTypeErr?.errors?.[0]}"`);

    const badUrlErr = valData.invalidRows.find((r) => r.rowNumber === 8);
    assert(Boolean(badUrlErr && badUrlErr.errors.some((e) => e.includes('Protocol'))), `Row 8 identified: "${badUrlErr?.errors?.[0]}"`);

    const emptyWifiErr = valData.invalidRows.find((r) => r.rowNumber === 9);
    assert(Boolean(emptyWifiErr && emptyWifiErr.errors.some((e) => e.includes('WIFI'))), `Row 9 identified: "${emptyWifiErr?.errors?.[0]}"`);

    const dupRowErr = valData.invalidRows.find((r) => r.rowNumber === 11);
    assert(Boolean(dupRowErr && dupRowErr.errors.some((e) => e.includes('Duplicate row'))), `Row 11 identified: "${dupRowErr?.errors?.[0]}"`);

    // 3c. Generate QR codes from valid rows
    console.log('  Generating 5 valid QR codes in bulk...');
    const genRes = await request(`${API_BASE}/qr/bulk/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        rows: valData.validRows,
        design: {
          fgColor: '#1d4ed8',
        },
      },
    });

    assert(genRes.status === 201, `Batch generation created records (${genRes.status})`);
    const genResult = genRes.data.data;
    assert(genResult.createdCount === 5, `Created exactly 5 QR records (actual: ${genResult.createdCount})`);
    assert(genResult.qrCodes.length === 5, `Returned 5 created QR objects`);

    // Verify each generated QR is in the database
    for (const item of genResult.qrCodes) {
      const checkQr = await request(`${API_BASE}/qr/${item.id}`, {
        headers: authHeaders,
      });
      assert(checkQr.status === 200, `Verified database record exists for "${item.name}"`);
    }

    // 3d. Download ZIP of PNG files
    console.log('  Downloading ZIP package of generated PNGs...');
    const zipPngRes = await request(`${API_BASE}/qr/bulk/download-zip`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        rows: valData.validRows,
        format: 'png',
        design: {
          fgColor: '#1d4ed8',
        },
      },
    });

    assert(zipPngRes.status === 200, `ZIP PNG endpoint returned 200 (${zipPngRes.status})`);
    assert(zipPngRes.headers['content-type'] === 'application/zip', `Content-Type is application/zip (${zipPngRes.headers['content-type']})`);
    assert(zipPngRes.rawBuffer.length > 500, `ZIP buffer size is valid (${zipPngRes.rawBuffer.length} bytes)`);

    // Check ZIP magic header bytes (PK\x03\x04)
    const isZip = zipPngRes.rawBuffer[0] === 0x50 && zipPngRes.rawBuffer[1] === 0x4B;
    assert(isZip, 'ZIP file header magic bytes verified (PK)');

    // 3e. Download ZIP of SVG files
    console.log('  Downloading ZIP package of generated SVGs...');
    const zipSvgRes = await request(`${API_BASE}/qr/bulk/download-zip`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        rows: valData.validRows,
        format: 'svg',
      },
    });

    assert(zipSvgRes.status === 200, `ZIP SVG endpoint returned 200 (${zipSvgRes.status})`);
    assert(zipSvgRes.headers['content-type'] === 'application/zip', 'SVG ZIP Content-Type confirmed');
    assert(zipSvgRes.rawBuffer.length > 500, `SVG ZIP buffer size is valid (${zipSvgRes.rawBuffer.length} bytes)`);

    // 3f. Test Batch Limit enforcement (> 100 rows)
    console.log('  Testing batch limit (> 100 rows)...');
    let largeCsv = 'name,type,content\n';
    for (let i = 1; i <= 105; i++) {
      largeCsv += `Batch Item ${i},URL,https://apex.corp/page-${i}\n`;
    }

    const largeValRes = await request(`${API_BASE}/qr/bulk/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        csvContent: largeCsv,
      },
    });
    assert(largeValRes.status === 400, `Large CSV exceeding limit correctly rejected with 400 (${largeValRes.status})`);
    assert(largeValRes.data.message?.includes('100'), `Error message mentions batch limit 100: "${largeValRes.data.message}"`);

    // ==========================================
    // 4. SECURITY & USER ISOLATION TESTS
    // ==========================================
    console.log('\n[4] Testing User Isolation & Authorization...');

    // 4a. Register second user
    const otherEmail = `other_user_${timestamp}@example.com`;
    const regOther = await request(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: {
        name: 'Other User',
        email: otherEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });
    const otherToken = regOther.data.data.token;
    const otherHeaders = { Authorization: `Bearer ${otherToken}` };

    // 4b. Other user attempts to duplicate user 1's QR code -> must fail 404 / 403
    const unauthorizedDup = await request(`${API_BASE}/qr/${originalQr.id}/duplicate`, {
      method: 'POST',
      headers: otherHeaders,
    });
    assert(unauthorizedDup.status === 404, `Unauthorized duplication blocked (${unauthorizedDup.status})`);

    // 4c. Other user's branding is completely isolated
    const otherBrandRes = await request(`${API_BASE}/branding`, {
      headers: otherHeaders,
    });
    assert(otherBrandRes.data.data.branding.companyName !== 'Apex Innovations', 'User isolation preserved: other user has distinct branding');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
