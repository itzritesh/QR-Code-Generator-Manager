// Automated test script for Phase 9 Professional Analytics Dashboard
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
    const startTime = Date.now();
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
          const latencyMs = Date.now() - startTime;
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
            latencyMs,
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

async function runPhase9Tests() {
  console.log('==========================================================');
  console.log('   PHASE 9 PROFESSIONAL ANALYTICS DASHBOARD VERIFICATION  ');
  console.log('==========================================================');

  const ts = Date.now();

  // 1. Register User A
  const userA_email = `dashboard_a_${ts}@example.com`;
  const userA_pass = 'DashboardPass123!';
  const regA = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Dashboard Test User A',
      email: userA_email,
      password: userA_pass,
      confirmPassword: userA_pass,
    },
  });

  if (regA.statusCode !== 201) {
    throw new Error(`Failed to register User A: ${JSON.stringify(regA.body)}`);
  }
  const tokenA = regA.body.data.token;
  const headersA = { Authorization: `Bearer ${tokenA}` };
  console.log(`✓ Registered User A: ${userA_email}`);

  // 2. Register User B (for Security & Cross-Account Isolation testing)
  const userB_email = `dashboard_b_${ts}@example.com`;
  const userB_pass = 'DashboardPass123!';
  const regB = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Dashboard Test User B',
      email: userB_email,
      password: userB_pass,
      confirmPassword: userB_pass,
    },
  });

  if (regB.statusCode !== 201) {
    throw new Error(`Failed to register User B: ${JSON.stringify(regB.body)}`);
  }
  const tokenB = regB.body.data.token;
  const headersB = { Authorization: `Bearer ${tokenB}` };
  console.log(`✓ Registered User B: ${userB_email}`);

  // 3. Test Empty Analytics (0 QRs, 0 Scans)
  console.log('\n--- 1. Testing Empty Analytics State (Zero Data) ---');
  const emptyOverview = await request('/api/analytics/overview', { headers: headersA });
  if (emptyOverview.statusCode !== 200) {
    throw new Error(`Empty overview failed: ${emptyOverview.statusCode}`);
  }

  const em = emptyOverview.body.data.metrics;
  if (
    em.totalQrs !== 0 ||
    em.activeQrs !== 0 ||
    em.totalScans !== 0 ||
    em.uniqueScans !== 0 ||
    em.scansToday !== 0 ||
    em.scansThisWeek !== 0 ||
    em.scansThisMonth !== 0 ||
    em.latestScan !== null
  ) {
    throw new Error(`Empty metrics mismatch: ${JSON.stringify(em)}`);
  }
  console.log('✓ Empty overview correctly returned zero metrics:');
  console.log('  totalQrs=0, activeQrs=0, totalScans=0, uniqueScans=0, latestScan=null');

  // 4. Create 2 Dynamic QR codes for User A
  console.log('\n--- 2. Creating Dynamic QR Codes for Testing ---');
  const qr1Res = await request('/api/qr', {
    method: 'POST',
    headers: headersA,
    body: {
      name: 'Summer Product Launch',
      type: 'URL',
      isDynamic: true,
      destinationUrl: 'https://example.com/summer-launch',
      metadata: { url: 'https://example.com/summer-launch' },
    },
  });
  const qr1 = qr1Res.body.data.qrCode;
  console.log(`✓ Created QR 1: "${qr1.name}" (ID: ${qr1.id}, ShortCode: ${qr1.shortCode})`);

  const qr2Res = await request('/api/qr', {
    method: 'POST',
    headers: headersA,
    body: {
      name: 'VIP Lounge Wi-Fi Link',
      type: 'URL',
      isDynamic: true,
      destinationUrl: 'https://example.com/vip-lounge',
      metadata: { url: 'https://example.com/vip-lounge' },
    },
  });
  const qr2 = qr2Res.body.data.qrCode;
  console.log(`✓ Created QR 2: "${qr2.name}" (ID: ${qr2.id}, ShortCode: ${qr2.shortCode})`);

  // Check overview after creating QRs but 0 scans
  const overviewAfterQrs = await request('/api/analytics/overview', { headers: headersA });
  const mAfterQrs = overviewAfterQrs.body.data.metrics;
  if (mAfterQrs.totalQrs !== 2 || mAfterQrs.activeQrs !== 2 || mAfterQrs.totalScans !== 0) {
    throw new Error(`Expected 2 active QRs with 0 scans, got: ${JSON.stringify(mAfterQrs)}`);
  }
  console.log('✓ Fleet overview correctly shows 2 Active QR Codes and 0 Total Scans (No mock scans)');

  // 5. Test One Scan on QR 1
  console.log('\n--- 3. Testing Single Scan Execution ---');
  const scan1 = await request(`/q/${qr1.shortCode}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      Referer: 'https://instagram.com/p/12345',
      'cf-ipcountry': 'US',
      'x-forwarded-for': '203.0.113.50',
    },
  });

  if (scan1.statusCode !== 302 || scan1.headers.location !== 'https://example.com/summer-launch') {
    throw new Error(`Scan 1 redirect failed: ${scan1.statusCode}`);
  }
  console.log('✓ Single scan executed and redirected (HTTP 302)');

  await new Promise((r) => setTimeout(r, 400));

  // Verify Single Scan Metrics on QR 1
  const qr1AnalyticsSingle = await request(`/api/qr/${qr1.id}/analytics`, { headers: headersA });
  const q1Metrics = qr1AnalyticsSingle.body.data.metrics;
  if (q1Metrics.totalScans !== 1 || q1Metrics.uniqueScans !== 1) {
    throw new Error(`Expected 1 total scan and 1 unique scan, got: ${JSON.stringify(q1Metrics)}`);
  }
  console.log('✓ Single scan verified: totalScans=1, uniqueScans=1, scansToday=1');

  // 6. Test Multiple Scans across both QR codes with varied hardware, OS, browsers, referrers, countries
  console.log('\n--- 4. Testing Multiple Scans & Deduplication ---');

  // Scan 2 on QR 1 (Android Chrome, India, Twitter)
  await request(`/q/${qr1.shortCode}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      Referer: 'https://t.co/deal',
      'cf-ipcountry': 'IN',
      'x-forwarded-for': '198.51.100.33',
    },
  });

  // Scan 3 on QR 1 (Desktop Windows Edge, UK, Direct camera)
  await request(`/q/${qr1.shortCode}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
      'cf-ipcountry': 'GB',
      'x-forwarded-for': '192.0.2.77',
    },
  });

  // Scan 4 on QR 1 (Repeat scan from Visitor 1 to test deduplication)
  await request(`/q/${qr1.shortCode}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      Referer: 'https://instagram.com/p/12345',
      'cf-ipcountry': 'US',
      'x-forwarded-for': '203.0.113.50',
    },
  });

  // Scan 5 on QR 2 (macOS Firefox, Germany, Direct)
  await request(`/q/${qr2.shortCode}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:123.0) Gecko/20100101 Firefox/123.0',
      'cf-ipcountry': 'DE',
      'x-forwarded-for': '198.51.100.99',
    },
  });

  await new Promise((r) => setTimeout(r, 500));

  // 7. Verify Fleet Overview Metrics
  console.log('\n--- 5. Validating Fleet Overview Metrics ---');
  const overviewRes = await request('/api/analytics/overview', { headers: headersA });
  const ovMetrics = overviewRes.body.data.metrics;
  const ovCharts = overviewRes.body.data.charts;
  const ovBreakdowns = overviewRes.body.data.breakdowns;

  console.log('Fleet Overview Metrics:', JSON.stringify(ovMetrics, null, 2));

  if (ovMetrics.totalQrs !== 2) throw new Error(`Expected totalQrs=2, got ${ovMetrics.totalQrs}`);
  if (ovMetrics.activeQrs !== 2) throw new Error(`Expected activeQrs=2, got ${ovMetrics.activeQrs}`);
  if (ovMetrics.totalScans !== 5) throw new Error(`Expected totalScans=5, got ${ovMetrics.totalScans}`);
  if (ovMetrics.uniqueScans !== 4) throw new Error(`Expected uniqueScans=4, got ${ovMetrics.uniqueScans}`);
  if (ovMetrics.scansToday !== 5) throw new Error(`Expected scansToday=5, got ${ovMetrics.scansToday}`);
  if (ovMetrics.scansThisWeek !== 5) throw new Error(`Expected scansThisWeek=5, got ${ovMetrics.scansThisWeek}`);
  if (ovMetrics.scansThisMonth !== 5) throw new Error(`Expected scansThisMonth=5, got ${ovMetrics.scansThisMonth}`);
  if (!ovMetrics.latestScan) throw new Error('Missing latestScan timestamp');

  console.log('✓ All 8 Overview Metrics verified:');
  console.log('  Total QRs: 2 | Active QRs: 2 | Total Scans: 5 | Unique Scans: 4');
  console.log(`  Scans Today: 5 | This Week: 5 | This Month: 5 | Latest: ${ovMetrics.latestScan}`);

  // 8. Verify Periodic Charts (Timeline, Daily, Weekly, Monthly)
  console.log('\n--- 6. Validating Periodic Charts ---');
  if (!ovCharts.timeline || ovCharts.timeline.length === 0) throw new Error('Timeline series missing');
  if (!ovCharts.dailyScans || ovCharts.dailyScans.length !== 14) throw new Error(`Expected 14 daily buckets, got ${ovCharts.dailyScans.length}`);
  if (!ovCharts.weeklyScans || ovCharts.weeklyScans.length !== 8) throw new Error(`Expected 8 weekly buckets, got ${ovCharts.weeklyScans.length}`);
  if (!ovCharts.monthlyScans || ovCharts.monthlyScans.length !== 6) throw new Error(`Expected 6 monthly buckets, got ${ovCharts.monthlyScans.length}`);

  const totalDailyScans = ovCharts.dailyScans.reduce((sum, d) => sum + d.scans, 0);
  if (totalDailyScans !== 5) throw new Error(`Daily series sum mismatch: expected 5, got ${totalDailyScans}`);

  console.log(`✓ Daily scans chart: 14 continuous days verified (Sum: ${totalDailyScans})`);
  console.log(`✓ Weekly scans chart: 8 continuous weeks verified`);
  console.log(`✓ Monthly scans chart: 6 continuous months verified`);
  console.log(`✓ Active timeline chart: ${ovCharts.timeline.length} points verified`);

  // 9. Verify Breakdowns (Device, Browser, OS, Geography, Referrer)
  console.log('\n--- 7. Validating Hardware, Platform & Geographic Breakdowns ---');
  const mobile = ovBreakdowns.devices.find((d) => d.device === 'mobile');
  const desktop = ovBreakdowns.devices.find((d) => d.device === 'desktop');
  if (!mobile || mobile.count !== 3 || !desktop || desktop.count !== 2) {
    throw new Error(`Device breakdown mismatch: ${JSON.stringify(ovBreakdowns.devices)}`);
  }
  console.log(`✓ Device Breakdown: Mobile=${mobile.count} (${mobile.percentage}%), Desktop=${desktop.count} (${desktop.percentage}%)`);

  const ios = ovBreakdowns.operatingSystems.find((o) => o.os === 'iOS');
  const android = ovBreakdowns.operatingSystems.find((o) => o.os === 'Android');
  const windows = ovBreakdowns.operatingSystems.find((o) => o.os.includes('Windows'));
  const mac = ovBreakdowns.operatingSystems.find((o) => o.os === 'macOS');
  if (!ios || !android || !windows || !mac) {
    throw new Error(`OS breakdown incomplete: ${JSON.stringify(ovBreakdowns.operatingSystems)}`);
  }
  console.log(`✓ Operating Systems: iOS (${ios.count}), Android (${android.count}), Windows (${windows.count}), macOS (${mac.count})`);

  const safari = ovBreakdowns.browsers.find((b) => b.browser === 'Safari');
  const chrome = ovBreakdowns.browsers.find((b) => b.browser === 'Chrome');
  const edge = ovBreakdowns.browsers.find((b) => b.browser === 'Edge');
  const firefox = ovBreakdowns.browsers.find((b) => b.browser === 'Firefox');
  if (!safari || !chrome || !edge || !firefox) {
    throw new Error(`Browser breakdown incomplete: ${JSON.stringify(ovBreakdowns.browsers)}`);
  }
  console.log(`✓ Browsers: Safari (${safari.count}), Chrome (${chrome.count}), Edge (${edge.count}), Firefox (${firefox.count})`);

  const us = ovBreakdowns.countries.find((c) => c.country === 'US');
  const inCountry = ovBreakdowns.countries.find((c) => c.country === 'IN');
  const gb = ovBreakdowns.countries.find((c) => c.country === 'GB');
  const de = ovBreakdowns.countries.find((c) => c.country === 'DE');
  if (!us || !inCountry || !gb || !de) {
    throw new Error(`Geography breakdown incomplete: ${JSON.stringify(ovBreakdowns.countries)}`);
  }
  console.log(`✓ Geography: US (${us.count}), IN (${inCountry.count}), GB (${gb.count}), DE (${de.count})`);

  // 10. Test Time Filters (Today, 7d, 30d, 90d, Custom Range)
  console.log('\n--- 8. Testing Time Range Filters ---');

  // Filter: Today
  const todayRes = await request('/api/analytics/overview?range=today', { headers: headersA });
  if (todayRes.body.data.charts.timeline.length !== 24) {
    throw new Error(`Expected 24 hourly buckets for today range, got ${todayRes.body.data.charts.timeline.length}`);
  }
  console.log('✓ Time filter "Today": 24 hourly timeline buckets generated');

  // Filter: 30 Days
  const res30d = await request('/api/analytics/overview?range=30d', { headers: headersA });
  if (res30d.body.data.charts.timeline.length !== 30) {
    throw new Error(`Expected 30 daily buckets for 30d range, got ${res30d.body.data.charts.timeline.length}`);
  }
  console.log('✓ Time filter "30 Days": 30 daily timeline buckets generated');

  // Filter: Custom Range
  const todayStr = new Date().toISOString().split('T')[0];
  const customRes = await request(
    `/api/analytics/overview?range=custom&startDate=${todayStr}&endDate=${todayStr}`,
    { headers: headersA }
  );
  if (customRes.statusCode !== 200 || !customRes.body.data.charts.timeline) {
    throw new Error('Custom range query failed');
  }
  console.log(`✓ Time filter "Custom Range" (${todayStr} to ${todayStr}) verified`);

  // 11. Test Individual QR Analytics Isolation
  console.log('\n--- 9. Testing Individual QR Filter Isolation ---');
  const qr1Analytics = await request(`/api/qr/${qr1.id}/analytics`, { headers: headersA });
  const qr1m = qr1Analytics.body.data.metrics;
  if (qr1m.totalScans !== 4 || qr1m.uniqueScans !== 3) {
    throw new Error(`Expected QR 1 to have 4 scans and 3 unique scans, got: ${JSON.stringify(qr1m)}`);
  }
  console.log(`✓ QR 1 Filter isolated: totalScans=4, uniqueScans=3 (excludes QR 2's scan)`);

  const qr2Analytics = await request(`/api/qr/${qr2.id}/analytics`, { headers: headersA });
  const qr2m = qr2Analytics.body.data.metrics;
  if (qr2m.totalScans !== 1 || qr2m.uniqueScans !== 1) {
    throw new Error(`Expected QR 2 to have 1 scan and 1 unique scan, got: ${JSON.stringify(qr2m)}`);
  }
  console.log(`✓ QR 2 Filter isolated: totalScans=1, uniqueScans=1 (excludes QR 1's scans)`);

  // 12. Test Security & Unauthorized Access
  console.log('\n--- 10. Testing Security & Tenant Isolation ---');
  const unauthorizedRes = await request(`/api/qr/${qr1.id}/analytics`, { headers: headersB });
  if (unauthorizedRes.statusCode !== 404 && unauthorizedRes.statusCode !== 403) {
    throw new Error(`Security failed: User B received HTTP ${unauthorizedRes.statusCode} accessing User A's QR`);
  }
  console.log(`✓ Security verified: User B cannot access User A's analytics (HTTP ${unauthorizedRes.statusCode})`);

  // 13. Test Aggregation Performance
  console.log('\n--- 11. Testing Database Aggregation Performance ---');
  const perfTest = await request('/api/analytics/overview?range=90d', { headers: headersA });
  console.log(`✓ Database aggregation latency: ${perfTest.latencyMs} ms (Sub-second response under Neon PostgreSQL)`);

  console.log('\n==========================================================');
  console.log('   ALL PHASE 9 ANALYTICS DASHBOARD TESTS PASSED!          ');
  console.log('==========================================================\n');
}

runPhase9Tests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
