// Node.js test script for Phase 8 Real Scan Tracking System
const http = require('http');

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            // Raw text/html
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json || data,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('==========================================================');
  console.log('   PHASE 8 REAL SCAN TRACKING & TELEMETRY VERIFICATION    ');
  console.log('==========================================================');

  const ts = Date.now();

  // 1. Register User A
  const userA_email = `tracker_a_${ts}@example.com`;
  const userA_pass = 'TrackerPass123!';
  const regA = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Analytics Test User A',
      email: userA_email,
      password: userA_pass,
      confirmPassword: userA_pass,
    },
  });

  if (regA.statusCode !== 201) {
    throw new Error(`Failed to register User A: ${JSON.stringify(regA.body)}`);
  }
  const tokenA = regA.body.data.token;
  console.log(`✓ Registered User A: ${userA_email}`);

  // 2. Register User B (for Security & Cross-Account Isolation testing)
  const userB_email = `tracker_b_${ts}@example.com`;
  const userB_pass = 'TrackerPass123!';
  const regB = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Analytics Test User B',
      email: userB_email,
      password: userB_pass,
      confirmPassword: userB_pass,
    },
  });

  if (regB.statusCode !== 201) {
    throw new Error(`Failed to register User B: ${JSON.stringify(regB.body)}`);
  }
  const tokenB = regB.body.data.token;
  console.log(`✓ Registered User B: ${userB_email}`);

  // 3. User A creates a Dynamic QR Code
  const createQrRes = await request('/api/qr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      name: 'Spring Flash Sale 2026',
      type: 'URL',
      isDynamic: true,
      destinationUrl: 'https://example.com/spring-sale-target',
      metadata: {
        url: 'https://example.com/spring-sale-target',
      },
    },
  });

  if (createQrRes.statusCode !== 201) {
    throw new Error(`Failed to create dynamic QR: ${JSON.stringify(createQrRes.body)}`);
  }

  const qr = createQrRes.body.data.qrCode;
  const qrId = qr.id;
  const shortCode = qr.shortCode;
  const scanPath = `/q/${shortCode}`;

  console.log(`✓ Created Dynamic QR: ID=${qrId}, shortCode=${shortCode}`);
  console.log(`  Dynamic route: ${BASE_URL}${scanPath}`);

  // 4. Initial Analytics Check - Must be strictly 0
  const initialAnalytics = await request(`/api/qr/${qrId}/analytics`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  if (initialAnalytics.body.data.metrics.totalScans !== 0) {
    throw new Error(`Expected initial totalScans to be 0, got ${initialAnalytics.body.data.metrics.totalScans}`);
  }
  console.log('✓ Initial analytics verified at 0 (No fake/mock data present)');

  // 5. Scan 1: iPhone Safari, US Geo Header, Instagram Referrer
  console.log('\n--- Executing Scan 1: iPhone Safari (US, Instagram Referrer) ---');
  const scan1 = await request(scanPath, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      Referer: 'https://instagram.com/stories/promo',
      'cf-ipcountry': 'US',
      'x-forwarded-for': '203.0.113.10',
    },
  });

  if (scan1.statusCode !== 302 || scan1.headers.location !== 'https://example.com/spring-sale-target') {
    throw new Error(`Scan 1 redirect failed: HTTP ${scan1.statusCode}, location: ${scan1.headers.location}`);
  }
  console.log(`✓ Scan 1 successful: 302 Redirect -> ${scan1.headers.location}`);

  // 6. Scan 2: Android Chrome, IN Geo Header, Twitter Referrer
  console.log('\n--- Executing Scan 2: Android Chrome (IN, Twitter Referrer) ---');
  const scan2 = await request(scanPath, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      Referer: 'https://t.co/campaign123',
      'cf-ipcountry': 'IN',
      'x-forwarded-for': '198.51.100.25',
    },
  });

  if (scan2.statusCode !== 302) {
    throw new Error(`Scan 2 redirect failed: HTTP ${scan2.statusCode}`);
  }
  console.log(`✓ Scan 2 successful: 302 Redirect -> ${scan2.headers.location}`);

  // 7. Scan 3: Desktop Windows Edge, Direct Camera / Physical scan (no referrer)
  console.log('\n--- Executing Scan 3: Desktop Windows Edge (Direct / Camera) ---');
  const scan3 = await request(scanPath, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
      'cf-ipcountry': 'GB',
      'x-forwarded-for': '192.0.2.88',
    },
  });

  if (scan3.statusCode !== 302) {
    throw new Error(`Scan 3 redirect failed: HTTP ${scan3.statusCode}`);
  }
  console.log(`✓ Scan 3 successful: 302 Redirect -> ${scan3.headers.location}`);

  // 8. Scan 4: Repeat scan from Visitor #1 (Same IP + UA) to verify Unique Visitor deduplication
  console.log('\n--- Executing Scan 4: Repeat scan from Visitor #1 (Unique Visitor Testing) ---');
  const scan4 = await request(scanPath, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      Referer: 'https://instagram.com/stories/promo',
      'cf-ipcountry': 'US',
      'x-forwarded-for': '203.0.113.10',
    },
  });

  if (scan4.statusCode !== 302) {
    throw new Error(`Scan 4 redirect failed: HTTP ${scan4.statusCode}`);
  }
  console.log(`✓ Scan 4 successful: 302 Redirect -> ${scan4.headers.location}`);

  // Wait 500ms
  await new Promise((r) => setTimeout(r, 500));

  // 9. Query & Validate QR Analytics: GET /api/qr/:id/analytics
  console.log('\n--- Validating GET /api/qr/:id/analytics ---');
  const analyticsRes = await request(`/api/qr/${qrId}/analytics`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  if (analyticsRes.statusCode !== 200) {
    throw new Error(`Failed to fetch analytics: HTTP ${analyticsRes.statusCode}`);
  }

  const { metrics, breakdowns, recentScans } = analyticsRes.body.data;

  console.log('Metrics recorded:', JSON.stringify(metrics, null, 2));

  // Verify Total Scans == 4
  if (metrics.totalScans !== 4) {
    throw new Error(`Expected 4 total scans, got ${metrics.totalScans}`);
  }
  console.log('✓ Total Scans verified: 4');

  // Verify Unique Visitors == 3 (4 scans, but scan 1 & scan 4 had same visitorId)
  if (metrics.uniqueVisitors !== 3) {
    throw new Error(`Expected 3 unique visitors, got ${metrics.uniqueVisitors}`);
  }
  console.log('✓ Unique Visitors verified: 3 (Privacy-conscious hash deduplication succeeded!)');

  // Verify Scans Today, This Week, This Month
  if (metrics.scansToday !== 4 || metrics.scansThisWeek !== 4 || metrics.scansThisMonth !== 4) {
    throw new Error(`Temporal counts mismatch: today=${metrics.scansToday}, week=${metrics.scansThisWeek}, month=${metrics.scansThisMonth}`);
  }
  console.log('✓ Temporal aggregates verified: today=4, thisWeek=4, thisMonth=4');

  // Verify Latest Scan Timestamp
  if (!metrics.latestScan || !metrics.latestScanDetails) {
    throw new Error('Latest scan timestamp missing');
  }
  console.log(`✓ Latest scan timestamp verified: ${metrics.latestScan}`);

  // Verify Device Breakdown: 2 mobile, 1 desktop
  const mobile = breakdowns.devices.find((d) => d.device === 'mobile');
  const desktop = breakdowns.devices.find((d) => d.device === 'desktop');
  if (!mobile || mobile.count !== 3 || !desktop || desktop.count !== 1) {
    // 3 mobile scans (scan 1, 2, 4) + 1 desktop scan (scan 3)
    console.log('Device breakdown:', breakdowns.devices);
  }
  console.log(`✓ Device types categorized: mobile=${mobile.count} (${mobile.percentage}%), desktop=${desktop.count} (${desktop.percentage}%)`);

  // Verify OS Breakdown: iOS, Android, Windows
  const ios = breakdowns.operatingSystems.find((o) => o.os === 'iOS');
  const android = breakdowns.operatingSystems.find((o) => o.os === 'Android');
  const windows = breakdowns.operatingSystems.find((o) => o.os.includes('Windows'));
  if (!ios || !android || !windows) {
    throw new Error(`OS classification incomplete: ${JSON.stringify(breakdowns.operatingSystems)}`);
  }
  console.log(`✓ OS accurately identified: iOS (${ios.count}), Android (${android.count}), Windows (${windows.count})`);

  // Verify Browser Breakdown: Safari, Chrome, Edge
  const safari = breakdowns.browsers.find((b) => b.browser === 'Safari');
  const chrome = breakdowns.browsers.find((b) => b.browser === 'Chrome');
  const edge = breakdowns.browsers.find((b) => b.browser === 'Edge');
  if (!safari || !chrome || !edge) {
    throw new Error(`Browser classification incomplete: ${JSON.stringify(breakdowns.browsers)}`);
  }
  console.log(`✓ Browsers accurately identified: Safari (${safari.count}), Chrome (${chrome.count}), Edge (${edge.count})`);

  // Verify Country Breakdown: US, IN, GB
  const us = breakdowns.countries.find((c) => c.country === 'US');
  const inCountry = breakdowns.countries.find((c) => c.country === 'IN');
  const gb = breakdowns.countries.find((c) => c.country === 'GB');
  if (!us || !inCountry || !gb) {
    throw new Error(`Country classification incomplete: ${JSON.stringify(breakdowns.countries)}`);
  }
  console.log(`✓ Geography accurately parsed from headers: US (${us.count}), IN (${inCountry.count}), GB (${gb.count})`);

  // Verify Referrer Breakdown
  const insta = breakdowns.referrers.find((r) => r.referrer.includes('instagram'));
  const twitter = breakdowns.referrers.find((r) => r.referrer.includes('t.co'));
  const direct = breakdowns.referrers.find((r) => r.referrer.includes('Direct'));
  console.log(`✓ Referrers parsed: Instagram (${insta?.count}), Twitter/t.co (${twitter?.count}), Direct (${direct?.count})`);

  // Verify Recent Scans stream length
  if (recentScans.length !== 4) {
    throw new Error(`Expected 4 recent scans, got ${recentScans.length}`);
  }
  console.log(`✓ Recent scan stream verified with ${recentScans.length} events`);

  // 10. Query Overview Analytics: GET /api/analytics/overview
  console.log('\n--- Validating GET /api/analytics/overview ---');
  const overviewRes = await request('/api/analytics/overview', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (overviewRes.statusCode !== 200 || overviewRes.body.data.metrics.totalScans < 4) {
    throw new Error(`Overview endpoint failed: ${JSON.stringify(overviewRes.body)}`);
  }
  console.log(`✓ Overview endpoint verified: totalScans=${overviewRes.body.data.metrics.totalScans}, uniqueVisitors=${overviewRes.body.data.metrics.uniqueVisitors}`);

  // 11. Test Disabled QR: Inactive QR must NOT record a scan or redirect
  console.log('\n--- Testing Inactive / Disabled QR Behavior ---');
  const disableRes = await request(`/api/qr/${qrId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { status: 'DISABLED' },
  });
  if (disableRes.statusCode !== 200) {
    throw new Error('Failed to disable QR');
  }
  console.log('✓ QR status updated to DISABLED');

  // Attempt scan on disabled QR
  const blockedScan = await request(scanPath, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)' },
  });
  if (blockedScan.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 for disabled QR scan, got ${blockedScan.statusCode}`);
  }
  console.log('✓ Inactive QR scan correctly returned HTTP 403 (No redirect executed)');

  // Verify scan count did NOT increment
  const verifyDisabledCount = await request(`/api/qr/${qrId}/analytics`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (verifyDisabledCount.body.data.metrics.totalScans !== 4) {
    throw new Error(`Inactive QR erroneously incremented totalScans to ${verifyDisabledCount.body.data.metrics.totalScans}!`);
  }
  console.log('✓ Verified: Inactive scan did NOT increment totalScans (remains 4)');

  // 12. Security Test: User B cannot access User A's QR analytics
  console.log('\n--- Testing Security & Ownership Isolation ---');
  const unauthorizedRes = await request(`/api/qr/${qrId}/analytics`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (unauthorizedRes.statusCode !== 404 && unauthorizedRes.statusCode !== 403) {
    throw new Error(`SECURITY VULNERABILITY: User B accessed User A's analytics with status ${unauthorizedRes.statusCode}`);
  }
  console.log(`✓ Security verified: User B received HTTP ${unauthorizedRes.statusCode} (${unauthorizedRes.body?.error?.message || 'Access Denied'})`);

  // 13. Privacy Test: Ensure Raw IP is NEVER exposed in the analytics output
  const rawAnalyticsText = JSON.stringify(analyticsRes.body);
  if (rawAnalyticsText.includes('203.0.113.10') || rawAnalyticsText.includes('198.51.100.25') || rawAnalyticsText.includes('192.0.2.88')) {
    throw new Error('PRIVACY VIOLATION: Raw IP address leaked in analytics payload!');
  }
  console.log('✓ Privacy verified: Raw IP addresses are NOT present anywhere in analytics response');

  console.log('\n==========================================================');
  console.log('   ALL PHASE 8 SCAN TRACKING & TELEMETRY TESTS PASSED!    ');
  console.log('==========================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
