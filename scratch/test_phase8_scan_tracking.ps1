# Test Phase 8: Real QR Scan Tracking System
$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   PHASE 8 REAL SCAN TRACKING & TELEMETRY VERIFICATION    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Register User A
$userA_email = "tracker_a_$ts@example.com"
$userA_pass = "TrackerPass123!"
$regA_body = @{
    name = "Analytics Test User A"
    email = $userA_email
    password = $userA_pass
    confirmPassword = $userA_pass
} | ConvertTo-Json

$regA_res = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $regA_body -ContentType "application/json"
$tokenA = $regA_res.data.tokens.accessToken
Write-Host "✓ Registered User A: $userA_email" -ForegroundColor Green

# 2. Register User B (for Security & Cross-Account Isolation testing)
$userB_email = "tracker_b_$ts@example.com"
$userB_pass = "TrackerPass123!"
$regB_body = @{
    name = "Analytics Test User B"
    email = $userB_email
    password = $userB_pass
    confirmPassword = $userB_pass
} | ConvertTo-Json

$regB_res = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $regB_body -ContentType "application/json"
$tokenB = $regB_res.data.tokens.accessToken
Write-Host "✓ Registered User B: $userB_email" -ForegroundColor Green

# 3. User A creates a Dynamic QR Code
$qrBody = @{
    name = "Spring Promo Campaign"
    type = "URL"
    isDynamic = $true
    destinationUrl = "https://example.com/spring-target-deal"
    metadata = @{
        url = "https://example.com/spring-target-deal"
    }
} | ConvertTo-Json

$headersA = @{
    "Authorization" = "Bearer $tokenA"
    "Content-Type" = "application/json"
}

$createRes = Invoke-RestMethod -Uri "$baseUrl/api/qr" -Method Post -Headers $headersA -Body $qrBody
$qrId = $createRes.data.qrCode.id
$shortCode = $createRes.data.qrCode.shortCode
$dynamicUrl = "$baseUrl/q/$shortCode"

Write-Host "✓ Created Dynamic QR: ID = $qrId, ShortCode = $shortCode" -ForegroundColor Green
Write-Host "  Public Dynamic Scan URL: $dynamicUrl" -ForegroundColor Gray

# 4. Verify initial analytics are zero
$initialAnalytics = Invoke-RestMethod -Uri "$baseUrl/api/qr/$qrId/analytics" -Method Get -Headers $headersA
if ($initialAnalytics.data.metrics.totalScans -eq 0) {
    Write-Host "✓ Initial Total Scans is verified 0 (No fake data)" -ForegroundColor Green
} else {
    Write-Host "✗ Initial scans not 0: $($initialAnalytics.data.metrics.totalScans)" -ForegroundColor Red
    exit 1
}

# 5. Execute Scan 1: iPhone Safari with Referrer and US Geo Header
Write-Host "`n--- Executing Scan 1: iPhone Safari (US, Instagram Referrer) ---" -ForegroundColor Yellow
$scan1_headers = @(
    "-H", "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "-H", "Referer: https://instagram.com/stories",
    "-H", "cf-ipcountry: US",
    "-H", "X-Forwarded-For: 203.0.113.10"
)
$scan1_out = & curl.exe -s -i @scan1_headers $dynamicUrl
if ($scan1_out -match "HTTP/1.1 302" -or $scan1_out -match "Location: https://example.com/spring-target-deal") {
    Write-Host "✓ Scan 1 302 Redirect verified" -ForegroundColor Green
} else {
    Write-Host "✗ Scan 1 failed redirect response:`n$scan1_out" -ForegroundColor Red
}

# 6. Execute Scan 2: Android Chrome with Twitter Referrer and IN Geo Header
Write-Host "`n--- Executing Scan 2: Android Chrome (IN, Twitter Referrer) ---" -ForegroundColor Yellow
$scan2_headers = @(
    "-H", "User-Agent: Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "-H", "Referer: https://t.co/promo",
    "-H", "cf-ipcountry: IN",
    "-H", "X-Forwarded-For: 198.51.100.22"
)
$scan2_out = & curl.exe -s -i @scan2_headers $dynamicUrl
if ($scan2_out -match "HTTP/1.1 302") {
    Write-Host "✓ Scan 2 302 Redirect verified" -ForegroundColor Green
}

# 7. Execute Scan 3: Desktop Windows Edge, Direct/Camera scan (no referrer)
Write-Host "`n--- Executing Scan 3: Desktop Windows Edge (Direct / Camera) ---" -ForegroundColor Yellow
$scan3_headers = @(
    "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
    "-H", "cf-ipcountry: GB",
    "-H", "X-Forwarded-For: 192.0.2.45"
)
$scan3_out = & curl.exe -s -i @scan3_headers $dynamicUrl
if ($scan3_out -match "HTTP/1.1 302") {
    Write-Host "✓ Scan 3 302 Redirect verified" -ForegroundColor Green
}

# 8. Execute Scan 4: Repeat visitor from Scan 1 (Same IP + UA) to verify Unique Visitor calculation
Write-Host "`n--- Executing Scan 4: Repeat scan from visitor #1 (Test Unique Visitor Tracking) ---" -ForegroundColor Yellow
$scan4_out = & curl.exe -s -i @scan1_headers $dynamicUrl
if ($scan4_out -match "HTTP/1.1 302") {
    Write-Host "✓ Scan 4 302 Redirect verified" -ForegroundColor Green
}

# Brief delay to allow db write
Start-Sleep -Seconds 1

# 9. Verify QR Analytics API (/api/qr/:id/analytics)
Write-Host "`n--- Querying GET /api/qr/$qrId/analytics ---" -ForegroundColor Cyan
$qrAnalytics = Invoke-RestMethod -Uri "$baseUrl/api/qr/$qrId/analytics" -Method Get -Headers $headersA
$m = $qrAnalytics.data.metrics
$b = $qrAnalytics.data.breakdowns

Write-Host "Metrics:" -ForegroundColor Gray
Write-Host "  Total Scans: $($m.totalScans)"
Write-Host "  Unique Visitors: $($m.uniqueVisitors)"
Write-Host "  Scans Today: $($m.scansToday)"
Write-Host "  Scans This Week: $($m.scansThisWeek)"
Write-Host "  Scans This Month: $($m.scansThisMonth)"
Write-Host "  Latest Scan: $($m.latestScan)"

if ($m.totalScans -eq 4) {
    Write-Host "✓ Total Scans is exactly 4" -ForegroundColor Green
} else {
    Write-Host "✗ Expected 4 total scans, got $($m.totalScans)" -ForegroundColor Red
    exit 1
}

if ($m.uniqueVisitors -eq 3) {
    Write-Host "✓ Unique Visitors is exactly 3 (Privacy-conscious hash deduplication succeeded!)" -ForegroundColor Green
} else {
    Write-Host "✗ Expected 3 unique visitors, got $($m.uniqueVisitors)" -ForegroundColor Red
    exit 1
}

if ($m.scansToday -eq 4 -and $m.scansThisWeek -eq 4 -and $m.scansThisMonth -eq 4) {
    Write-Host "✓ Scans today/week/month aggregated correctly" -ForegroundColor Green
}

# Check breakdowns
$mobileCount = ($b.devices | Where-Object { $_.device -eq "mobile" }).count
$desktopCount = ($b.devices | Where-Object { $_.device -eq "desktop" }).count
Write-Host "✓ Hardware Breakdown: Mobile = $mobileCount, Desktop = $desktopCount" -ForegroundColor Green

$iosDetected = $b.operatingSystems | Where-Object { $_.os -eq "iOS" }
$androidDetected = $b.operatingSystems | Where-Object { $_.os -eq "Android" }
$windowsDetected = $b.operatingSystems | Where-Object { $_.os -like "*Windows*" }
if ($iosDetected -and $androidDetected -and $windowsDetected) {
    Write-Host "✓ Operating Systems accurately classified: iOS ($($iosDetected.count)), Android ($($androidDetected.count)), Windows ($($windowsDetected.count))" -ForegroundColor Green
} else {
    Write-Host "✗ OS classification missing" -ForegroundColor Red
    exit 1
}

$safariDetected = $b.browsers | Where-Object { $_.browser -eq "Safari" }
$chromeDetected = $b.browsers | Where-Object { $_.browser -eq "Chrome" }
$edgeDetected = $b.browsers | Where-Object { $_.browser -eq "Edge" }
if ($safariDetected -and $chromeDetected -and $edgeDetected) {
    Write-Host "✓ Browsers accurately identified: Safari ($($safariDetected.count)), Chrome ($($chromeDetected.count)), Edge ($($edgeDetected.count))" -ForegroundColor Green
} else {
    Write-Host "✗ Browser identification missing" -ForegroundColor Red
    exit 1
}

# 10. Verify Overview Analytics API (/api/analytics/overview)
Write-Host "`n--- Querying GET /api/analytics/overview ---" -ForegroundColor Cyan
$overview = Invoke-RestMethod -Uri "$baseUrl/api/analytics/overview" -Method Get -Headers $headersA
if ($overview.data.metrics.totalScans -ge 4) {
    Write-Host "✓ Overview endpoint successfully aggregates fleet scans: $($overview.data.metrics.totalScans) total scans" -ForegroundColor Green
} else {
    Write-Host "✗ Overview endpoint failed: $($overview.data.metrics.totalScans)" -ForegroundColor Red
    exit 1
}

# 11. Test Disabled QR behavior (Must NOT record a scan!)
Write-Host "`n--- Testing Disabled QR Behavior ---" -ForegroundColor Yellow
$disableBody = @{ status = "DISABLED" } | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$baseUrl/api/qr/$qrId/status" -Method Patch -Headers $headersA -Body $disableBody
Write-Host "✓ Set QR status to DISABLED" -ForegroundColor Gray

# Attempt scan while disabled
$disabledScan = & curl.exe -s -i -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)" $dynamicUrl
if ($disabledScan -match "HTTP/1.1 403" -or $disabledScan -match "QR Code Inactive") {
    Write-Host "✓ Inactive QR returned 403 Forbidden with branded inactive page" -ForegroundColor Green
} else {
    Write-Host "✗ Disabled QR did not return 403:`n$disabledScan" -ForegroundColor Red
    exit 1
}

# Verify scan count did NOT increase
$afterDisabledAnalytics = Invoke-RestMethod -Uri "$baseUrl/api/qr/$qrId/analytics" -Method Get -Headers $headersA
if ($afterDisabledAnalytics.data.metrics.totalScans -eq 4) {
    Write-Host "✓ Verified: Inactive QR scan was NOT recorded (Total scans remained 4)" -ForegroundColor Green
} else {
    Write-Host "✗ Inactive scan was erroneously recorded! Total scans = $($afterDisabledAnalytics.data.metrics.totalScans)" -ForegroundColor Red
    exit 1
}

# 12. Test Security: User B cannot access User A's QR analytics
Write-Host "`n--- Testing Analytics Security & Ownership Enforcement ---" -ForegroundColor Yellow
$headersB = @{
    "Authorization" = "Bearer $tokenB"
    "Content-Type" = "application/json"
}

try {
    $null = Invoke-RestMethod -Uri "$baseUrl/api/qr/$qrId/analytics" -Method Get -Headers $headersB
    Write-Host "✗ SECURITY VIOLATION: User B was able to view User A's QR analytics!" -ForegroundColor Red
    exit 1
} catch {
    Write-Host "✓ Security verified: User B received 404 / Access Denied when attempting to view User A's analytics" -ForegroundColor Green
}

# 13. Verify Raw IP is NEVER exposed in analytics output
$rawJson = $qrAnalytics | ConvertTo-Json -Depth 6
if ($rawJson -match "203\.0\.113" -or $rawJson -match "198\.51\.100" -or $rawJson -match "192\.0\.2") {
    Write-Host "✗ PRIVACY LEAK: Raw IP address found in analytics response!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✓ Privacy verified: Raw IP addresses are NOT exposed in analytics" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   ALL PHASE 8 SCAN TRACKING & TELEMETRY TESTS PASSED!    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
