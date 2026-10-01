# Phase 7 Automated Verification Test Script — Real Dynamic QR System
$baseUrl = "http://localhost:5000"
$apiBase = "$baseUrl/api"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PHASE 7: REAL DYNAMIC QR SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$randSuffix = Get-Random -Minimum 10000 -Maximum 99999
$userEmail = "dynamic_user_$randSuffix@example.com"
$password = "StrongPass@123"

# Helper for API requests
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        $Body = $null
    )
    $jsonBody = if ($Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
    try {
        $params = @{
            Method = $Method
            Uri = $Uri
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($jsonBody) { $params["Body"] = $jsonBody }
        $resp = Invoke-RestMethod @params
        return @{ Success = $true; Data = $resp }
    } catch {
        $status = 0
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        $errBody = $null
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $rawContent = $reader.ReadToEnd()
            try { $errBody = $rawContent | ConvertFrom-Json } catch { $errBody = $rawContent }
        } catch {}
        return @{
            Success = $false
            StatusCode = $status
            Error = $errBody
            Exception = $_.Exception.Message
        }
    }
}

# Helper for testing public dynamic scans using curl.exe
function Invoke-Scan {
    param([string]$ShortCode)
    $tempFile = [System.IO.Path]::GetTempFileName()
    $result = & curl.exe -s -o $tempFile -w "%{http_code}|%{redirect_url}" "$baseUrl/q/$ShortCode"
    $parts = $result.Split('|')
    $statusCode = [int]$parts[0]
    $location = if ($parts.Length -gt 1) { $parts[1] } else { "" }
    $body = Get-Content $tempFile -Raw -ErrorAction SilentlyContinue
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    return @{
        StatusCode = $statusCode
        Location = $location
        Body = $body
    }
}

# 1. Register User
Write-Host "`n[1] Registering test user ($userEmail)..." -ForegroundColor Yellow
$reg = Invoke-Api -Method "POST" -Uri "$apiBase/auth/register" -Body @{
    name = "Dynamic Tester"
    email = $userEmail
    password = $password
    confirmPassword = $password
}
if (-not $reg.Success) {
    Write-Host "Registration failed: $($reg.Exception)" -ForegroundColor Red
    exit 1
}
$token = $reg.Data.data.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "User registered. Token acquired." -ForegroundColor Green

# 2. Test Security: Reject Dangerous Protocols
Write-Host "`n[2] Testing Security: Malformed & Dangerous Destination URLs..." -ForegroundColor Yellow

$badProtocols = @(
    "javascript:alert(document.cookie)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "vbscript:msgbox(1)"
)

foreach ($badUrl in $badProtocols) {
    $res = Invoke-Api -Method "POST" -Uri "$apiBase/qr" -Headers $headers -Body @{
        name = "Exploit Attempt"
        type = "URL"
        isDynamic = $true
        destinationUrl = $badUrl
        metadata = @{ url = $badUrl }
    }
    if (-not $res.Success -and $res.StatusCode -eq 400) {
        Write-Host "SUCCESS: Rejected dangerous URL: $badUrl (Status 400)" -ForegroundColor Green
    } else {
        Write-Host "SECURITY FAILURE: Dangerous URL was accepted: $badUrl" -ForegroundColor Red
        exit 1
    }
}

# 3. Create Dynamic QR Code
Write-Host "`n[3] Creating Dynamic QR Code..." -ForegroundColor Yellow
$initialDest = "https://example.com/summer-sale-2026"
$createResp = Invoke-Api -Method "POST" -Uri "$apiBase/qr" -Headers $headers -Body @{
    name = "Summer Sale Campaign"
    type = "URL"
    isDynamic = $true
    destinationUrl = $initialDest
    metadata = @{ url = $initialDest }
    design = @{ fgColor = "#4f46e5"; bgColor = "#ffffff" }
}

if (-not $createResp.Success) {
    Write-Host "Create Dynamic QR failed: $($createResp.Exception)" -ForegroundColor Red
    exit 1
}

$qr = $createResp.Data.data.qrCode
$qrId = $qr.id
$shortCode = $qr.shortCode
$dynamicUrl = $qr.content

Write-Host "Created Dynamic QR:" -ForegroundColor Green
Write-Host "  ID: $qrId"
Write-Host "  ShortCode: $shortCode"
Write-Host "  Dynamic Scan URL: $dynamicUrl"
Write-Host "  Destination URL: $($qr.destinationUrl)"
Write-Host "  Scan Count: $($qr.scanCount)"

if (-not $shortCode -or -not $dynamicUrl.Contains("/q/$shortCode") -or $qr.destinationUrl -ne $initialDest) {
    Write-Host "FAILURE: Dynamic QR properties invalid." -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Dynamic QR record created with unique shortCode and scan URL." -ForegroundColor Green

# 4. Scan Dynamic QR (Simulate mobile camera scan via GET /q/:shortCode)
Write-Host "`n[4] Scanning Dynamic QR (GET /q/$shortCode)..." -ForegroundColor Yellow
$scan1 = Invoke-Scan -ShortCode $shortCode

Write-Host "Scan 1 HTTP Status: $($scan1.StatusCode)"
Write-Host "Redirect Location: $($scan1.Location)"

if ($scan1.StatusCode -eq 302 -and $scan1.Location -eq $initialDest) {
    Write-Host "SUCCESS: Dynamic QR redirected via 302 to destination: $initialDest" -ForegroundColor Green
} else {
    Write-Host "FAILURE: Expected 302 redirect to $initialDest, got $($scan1.StatusCode) -> $($scan1.Location)" -ForegroundColor Red
    exit 1
}

# Verify scan count incremented in database
$info1 = Invoke-Api -Method "GET" -Uri "$apiBase/qr/$qrId" -Headers $headers
$currentScans = $info1.Data.data.qrCode.scanCount
$lastScanned = $info1.Data.data.qrCode.lastScannedAt
Write-Host "Updated Database Scan Count: $currentScans, LastScannedAt: $lastScanned"
if ($currentScans -eq 1 -and $lastScanned) {
    Write-Host "SUCCESS: Scan processed and counter incremented to 1." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Scan counter did not increment properly." -ForegroundColor Red
    exit 1
}

# 5. Edit Destination URL without altering QR Image / Shortcode
Write-Host "`n[5] Editing Destination URL without changing QR image..." -ForegroundColor Yellow
$newDest = "https://example.com/autumn-clearance-special"
$updateResp = Invoke-Api -Method "PUT" -Uri "$apiBase/qr/$qrId" -Headers $headers -Body @{
    name = "Summer Sale (Now Autumn)"
    destinationUrl = $newDest
    metadata = @{ url = $newDest }
}

if (-not $updateResp.Success) {
    Write-Host "Update destination failed: $($updateResp.Exception)" -ForegroundColor Red
    exit 1
}

$updatedQr = $updateResp.Data.data.qrCode
Write-Host "Updated QR details:"
Write-Host "  New Destination: $($updatedQr.destinationUrl)"
Write-Host "  ShortCode: $($updatedQr.shortCode)"
Write-Host "  Dynamic Content URL: $($updatedQr.content)"

if ($updatedQr.shortCode -ne $shortCode -or $updatedQr.content -ne $dynamicUrl) {
    Write-Host "FAILURE: QR image content or shortCode changed upon destination edit! It must remain identical!" -ForegroundColor Red
    exit 1
}
if ($updatedQr.destinationUrl -ne $newDest) {
    Write-Host "FAILURE: Destination URL was not updated in database." -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Destination updated to '$newDest' while QR image scan URL remained 100% identical!" -ForegroundColor Green

# 6. Scan Again: Verify redirect to NEW destination
Write-Host "`n[6] Scanning Again: Verifying redirect to new destination..." -ForegroundColor Yellow
$scan2 = Invoke-Scan -ShortCode $shortCode

Write-Host "Scan 2 HTTP Status: $($scan2.StatusCode)"
Write-Host "New Redirect Location: $($scan2.Location)"

if ($scan2.StatusCode -eq 302 -and $scan2.Location -eq $newDest) {
    Write-Host "SUCCESS: Printed QR code immediately redirected to new destination: $newDest" -ForegroundColor Green
} else {
    Write-Host "FAILURE: Did not redirect to updated destination." -ForegroundColor Red
    exit 1
}

# Verify scan count is now 2
$info2 = Invoke-Api -Method "GET" -Uri "$apiBase/qr/$qrId" -Headers $headers
if ($info2.Data.data.qrCode.scanCount -eq 2) {
    Write-Host "SUCCESS: Scan count incremented to 2." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Scan count expected 2, got $($info2.Data.data.qrCode.scanCount)" -ForegroundColor Red
    exit 1
}

# 7. Disable QR Code
Write-Host "`n[7] Disabling Dynamic QR Code..." -ForegroundColor Yellow
$disableResp = Invoke-Api -Method "PATCH" -Uri "$apiBase/qr/$qrId/status" -Headers $headers -Body @{
    status = "DISABLED"
}

if ($disableResp.Success -and $disableResp.Data.data.qrCode.status -eq "DISABLED") {
    Write-Host "SUCCESS: QR Code status updated to DISABLED in database." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Failed to disable QR code." -ForegroundColor Red
    exit 1
}

# 8. Scan Disabled QR Code: Verify Inactive Page and NO redirect
Write-Host "`n[8] Scanning Disabled QR Code..." -ForegroundColor Yellow
$scanDisabled = Invoke-Scan -ShortCode $shortCode

Write-Host "Disabled Scan HTTP Status: $($scanDisabled.StatusCode)"
if ($scanDisabled.Location) {
    Write-Host "FAILURE: Disabled QR performed a redirect to $($scanDisabled.Location)! Must not redirect!" -ForegroundColor Red
    exit 1
}

if ($scanDisabled.StatusCode -eq 403 -and $scanDisabled.Body -like "*QR Code Inactive*") {
    Write-Host "SUCCESS: Disabled QR returned 403 Inactive HTML page without redirecting." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Did not receive expected inactive page response." -ForegroundColor Red
    exit 1
}

# Verify scan count did NOT increment while disabled
$info3 = Invoke-Api -Method "GET" -Uri "$apiBase/qr/$qrId" -Headers $headers
if ($info3.Data.data.qrCode.scanCount -eq 2) {
    Write-Host "SUCCESS: Scan count remained 2 (scans on disabled codes are not counted)." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Scan count incremented while disabled!" -ForegroundColor Red
    exit 1
}

# 9. Test Invalid / Non-Existent ShortCode
Write-Host "`n[9] Testing Invalid ShortCode..." -ForegroundColor Yellow
$scanInvalid = Invoke-Scan -ShortCode "nonExistentCode999"

Write-Host "Invalid Scan HTTP Status: $($scanInvalid.StatusCode)"
if ($scanInvalid.StatusCode -eq 404 -and $scanInvalid.Body -like "*QR Code Not Found*") {
    Write-Host "SUCCESS: Non-existent shortCode returned 404 Not Found HTML page." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Expected 404 for invalid shortCode." -ForegroundColor Red
    exit 1
}

# 10. Test Deleted QR Code
Write-Host "`n[10] Testing Deleted QR Code..." -ForegroundColor Yellow
$delResp = Invoke-Api -Method "DELETE" -Uri "$apiBase/qr/$qrId" -Headers $headers
if ($delResp.Success) {
    Write-Host "Deleted QR from database." -ForegroundColor Green
} else {
    Write-Host "Delete failed." -ForegroundColor Red
    exit 1
}

$scanDeleted = Invoke-Scan -ShortCode $shortCode
Write-Host "Deleted QR Scan HTTP Status: $($scanDeleted.StatusCode)"
if ($scanDeleted.StatusCode -eq 404 -and $scanDeleted.Body -like "*QR Code Not Found*") {
    Write-Host "SUCCESS: Deleted QR returned 404 Not Found HTML page." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Expected 404 for deleted QR code." -ForegroundColor Red
    exit 1
}

# 11. Test Dynamic QR Duplication
Write-Host "`n[11] Testing Dynamic QR Duplication..." -ForegroundColor Yellow
$sourceDest = "https://example.com/original-campaign"
$createDyn = Invoke-Api -Method "POST" -Uri "$apiBase/qr" -Headers $headers -Body @{
    name = "Original Campaign"
    type = "URL"
    isDynamic = $true
    destinationUrl = $sourceDest
    metadata = @{ url = $sourceDest }
}
$origQr = $createDyn.Data.data.qrCode
$origId = $origQr.id
$origShortCode = $origQr.shortCode

# Duplicate it
$dupResp = Invoke-Api -Method "POST" -Uri "$apiBase/qr/$origId/duplicate" -Headers $headers
if ($dupResp.Success) {
    $dupQr = $dupResp.Data.data.qrCode
    Write-Host "Original ShortCode: $origShortCode"
    Write-Host "Duplicated ShortCode: $($dupQr.shortCode)"
    Write-Host "Duplicated Content: $($dupQr.content)"
    Write-Host "Duplicated Destination: $($dupQr.destinationUrl)"
    Write-Host "Duplicated Scans: $($dupQr.scanCount)"

    if ($dupQr.shortCode -and $dupQr.shortCode -ne $origShortCode -and $dupQr.scanCount -eq 0 -and $dupQr.isDynamic) {
        Write-Host "SUCCESS: Duplicate generated its own independent shortCode with scanCount 0." -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Duplicate dynamic QR failed validation." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "FAILURE: Duplication API failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  ALL PHASE 7 DYNAMIC QR TESTS PASSED WITH 100% SUCCESS!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
