# Phase 6 Automated Verification Test Script
$baseUrl = "http://localhost:5000/api"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PHASE 6: CENTRAL QR MANAGEMENT SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$randSuffix = Get-Random -Minimum 10000 -Maximum 99999
$userA_Email = "usera_$randSuffix@example.com"
$userB_Email = "userb_$randSuffix@example.com"
$password = "StrongPassword@123"

# Helper for HTTP requests
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        $Body = $null
    )
    $jsonBody = if ($Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
    try {
        if ($jsonBody) {
            $resp = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -Body $jsonBody -ErrorAction Stop
        } else {
            $resp = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -ErrorAction Stop
        }
        return @{ Success = $true; Data = $resp }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $errBody = $null
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd() | ConvertFrom-Json
        } catch {}
        return @{ Success = $false; StatusCode = $status; Error = $errBody; Exception = $_.Exception.Message }
    }
}

# 1. Register & Login User A
Write-Host "`n[1] Registering User A ($userA_Email)..." -ForegroundColor Yellow
$regA = Invoke-Api -Method "POST" -Uri "$baseUrl/auth/register" -Body @{
    name = "User Alpha"
    email = $userA_Email
    password = $password
    confirmPassword = $password
}
if (-not $regA.Success) {
    Write-Host "User A registration failed: $($regA.Exception)" -ForegroundColor Red
    exit 1
}
$tokenA = $regA.Data.data.token
$headersA = @{ Authorization = "Bearer $tokenA" }
Write-Host "User A registered successfully. Token acquired." -ForegroundColor Green

# 2. Register & Login User B
Write-Host "`n[2] Registering User B ($userB_Email)..." -ForegroundColor Yellow
$regB = Invoke-Api -Method "POST" -Uri "$baseUrl/auth/register" -Body @{
    name = "User Beta"
    email = $userB_Email
    password = $password
    confirmPassword = $password
}
if (-not $regB.Success) {
    Write-Host "User B registration failed: $($regB.Exception)" -ForegroundColor Red
    exit 1
}
$tokenB = $regB.Data.data.token
$headersB = @{ Authorization = "Bearer $tokenB" }
Write-Host "User B registered successfully. Token acquired." -ForegroundColor Green

# 3. Verify Empty State Metrics for User A
Write-Host "`n[3] Testing Empty State Dashboard Metrics for User A..." -ForegroundColor Yellow
$metricsEmpty = Invoke-Api -Method "GET" -Uri "$baseUrl/qr/dashboard/metrics" -Headers $headersA
if ($metricsEmpty.Success -and $metricsEmpty.Data.data.totalQrs -eq 0 -and $metricsEmpty.Data.data.totalScans -eq 0) {
    Write-Host "SUCCESS: Initial metrics are 0 (no fake numbers!). totalQrs=0, totalScans=0" -ForegroundColor Green
} else {
    Write-Host "FAILURE: Unexpected initial metrics: $($metricsEmpty | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

# 4. Create 4 Distinct QR Codes for User A
Write-Host "`n[4] Creating QR Codes for User A..." -ForegroundColor Yellow

# QR 1: URL
$qr1Resp = Invoke-Api -Method "POST" -Uri "$baseUrl/qr" -Headers $headersA -Body @{
    name = "Alpha Website Link"
    type = "URL"
    metadata = @{ url = "https://alpha.example.com" }
    design = @{ fgColor = "#4f46e5"; bgColor = "#ffffff"; dotStyle = "rounded" }
}
$qr1Id = $qr1Resp.Data.data.qrCode.id
Write-Host "Created QR 1 (URL): ID $qr1Id, content: $($qr1Resp.Data.data.qrCode.content)" -ForegroundColor Green

# QR 2: Text
$qr2Resp = Invoke-Api -Method "POST" -Uri "$baseUrl/qr" -Headers $headersA -Body @{
    name = "Alpha Conference Pass Text"
    type = "TEXT"
    metadata = @{ text = "Conference Pass ID: CONF-2026-ALPHA" }
    design = @{ fgColor = "#059669"; bgColor = "#ffffff"; dotStyle = "square" }
}
$qr2Id = $qr2Resp.Data.data.qrCode.id
Write-Host "Created QR 2 (TEXT): ID $qr2Id" -ForegroundColor Green

# QR 3: Wi-Fi
$qr3Resp = Invoke-Api -Method "POST" -Uri "$baseUrl/qr" -Headers $headersA -Body @{
    name = "Alpha Office Guest WiFi"
    type = "WIFI"
    metadata = @{
        wifi = @{
            ssid = "AlphaOffice_5G"
            password = "SuperSecretWiFi"
            security = "WPA"
            hidden = $false
        }
    }
}
$qr3Id = $qr3Resp.Data.data.qrCode.id
Write-Host "Created QR 3 (WIFI): ID $qr3Id" -ForegroundColor Green

# QR 4: Payment
$qr4Resp = Invoke-Api -Method "POST" -Uri "$baseUrl/qr" -Headers $headersA -Body @{
    name = "Alpha Store UPI Checkout"
    type = "PAYMENT"
    metadata = @{
        payment = @{
            upiId = "alphastore@okaxis"
            payeeName = "Alpha Superstore"
            amount = "250.00"
            currency = "INR"
            note = "Invoice #908"
        }
    }
}
$qr4Id = $qr4Resp.Data.data.qrCode.id
Write-Host "Created QR 4 (PAYMENT): ID $qr4Id" -ForegroundColor Green

# 5. Verify Dashboard Metrics after Creation
Write-Host "`n[5] Verifying Dashboard Metrics from Database..." -ForegroundColor Yellow
$metricsPost = Invoke-Api -Method "GET" -Uri "$baseUrl/qr/dashboard/metrics" -Headers $headersA
$m = $metricsPost.Data.data
Write-Host "Metrics summary: totalQrs=$($m.totalQrs), activeQrs=$($m.activeQrs), disabledQrs=$($m.disabledQrs), totalScans=$($m.totalScans), recentCount=$($m.recentQrs.Count)"
if ($m.totalQrs -eq 4 -and $m.activeQrs -eq 4 -and $m.disabledQrs -eq 0 -and $m.recentQrs.Count -eq 4) {
    Write-Host "SUCCESS: Database metrics aggregated accurately from PostgreSQL records." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Metrics do not match created records." -ForegroundColor Red
    exit 1
}

# 6. Test Search
Write-Host "`n[6] Testing Server-Side Search..." -ForegroundColor Yellow
# Search by name
$searchName = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?search=WiFi" -Headers $headersA
if ($searchName.Data.data.items.Count -eq 1 -and $searchName.Data.data.items[0].id -eq $qr3Id) {
    Write-Host "SUCCESS: Search by name 'WiFi' found QR 3 correctly." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Search by name failed." -ForegroundColor Red
    exit 1
}

# Search by content
$searchContent = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?search=alpha.example.com" -Headers $headersA
if ($searchContent.Data.data.items.Count -eq 1 -and $searchContent.Data.data.items[0].id -eq $qr1Id) {
    Write-Host "SUCCESS: Search by content 'alpha.example.com' found QR 1 correctly." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Search by content failed." -ForegroundColor Red
    exit 1
}

# 7. Test Filters (Type & Status)
Write-Host "`n[7] Testing Server-Side Filters..." -ForegroundColor Yellow
$filterType = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?type=PAYMENT" -Headers $headersA
if ($filterType.Data.data.items.Count -eq 1 -and $filterType.Data.data.items[0].type -eq "PAYMENT") {
    Write-Host "SUCCESS: Filter by type=PAYMENT returned exactly 1 PAYMENT QR." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Filter by type failed." -ForegroundColor Red
    exit 1
}

$filterActive = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?status=ACTIVE" -Headers $headersA
if ($filterActive.Data.data.items.Count -eq 4) {
    Write-Host "SUCCESS: Filter by status=ACTIVE returned 4 active QRs." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Filter by status=ACTIVE failed." -ForegroundColor Red
    exit 1
}

# 8. Test Sorting
Write-Host "`n[8] Testing Server-Side Sorting..." -ForegroundColor Yellow
$sortName = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?sort=name" -Headers $headersA
$names = $sortName.Data.data.items | ForEach-Object { $_.name }
Write-Host "Sorted by name: $($names -join ' | ')"
if ($names[0] -le $names[1] -and $names[1] -le $names[2]) {
    Write-Host "SUCCESS: Sorting by name returned items in alphabetical order." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Sorting by name failed." -ForegroundColor Red
    exit 1
}

# 9. Test Server-Side Pagination
Write-Host "`n[9] Testing Server-Side Pagination..." -ForegroundColor Yellow
$page1 = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?page=1&limit=2" -Headers $headersA
$page2 = Invoke-Api -Method "GET" -Uri "$baseUrl/qr?page=2&limit=2" -Headers $headersA
if ($page1.Data.data.items.Count -eq 2 -and $page2.Data.data.items.Count -eq 2 -and $page1.Data.data.pagination.totalPages -eq 2) {
    Write-Host "SUCCESS: Server-side pagination verified (page 1: 2 items, page 2: 2 items, totalPages: 2)." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Pagination failed." -ForegroundColor Red
    exit 1
}

# 10. Test Duplicate
Write-Host "`n[10] Testing QR Duplication..." -ForegroundColor Yellow
$dupResp = Invoke-Api -Method "POST" -Uri "$baseUrl/qr/$qr1Id/duplicate" -Headers $headersA
if ($dupResp.Success) {
    $dupQr = $dupResp.Data.data.qrCode
    Write-Host "Duplicated QR ID: $($dupQr.id), Name: $($dupQr.name), Scans: $($dupQr.scanCount)"
    if ($dupQr.id -ne $qr1Id -and $dupQr.name -like "*Copy*" -and $dupQr.scanCount -eq 0) {
        Write-Host "SUCCESS: Duplicate created distinct database record with scanCount=0 and copy naming." -ForegroundColor Green
        $dupId = $dupQr.id
    } else {
        Write-Host "FAILURE: Duplicate properties invalid." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "FAILURE: Duplicate endpoint failed: $($dupResp.Exception)" -ForegroundColor Red
    exit 1
}

# 11. Test Enable / Disable Status Toggle
Write-Host "`n[11] Testing Enable/Disable Status Toggle..." -ForegroundColor Yellow
# Disable QR 1
$disableResp = Invoke-Api -Method "PATCH" -Uri "$baseUrl/qr/$qr1Id/status" -Headers $headersA -Body @{ status = "DISABLED" }
if ($disableResp.Success -and $disableResp.Data.data.qrCode.status -eq "DISABLED") {
    Write-Host "SUCCESS: QR 1 updated status to DISABLED in database." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Disable status toggle failed." -ForegroundColor Red
    exit 1
}

# Verify metrics reflect 1 disabled QR
$metricsDisabled = Invoke-Api -Method "GET" -Uri "$baseUrl/qr/dashboard/metrics" -Headers $headersA
if ($metricsDisabled.Data.data.disabledQrs -eq 1 -and $metricsDisabled.Data.data.activeQrs -eq 4) { # (4 active: qr2, qr3, qr4, plus duplicated QR)
    Write-Host "SUCCESS: Dashboard metrics updated real-time: activeQrs=4, disabledQrs=1." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Metrics did not reflect disabled QR status." -ForegroundColor Red
    exit 1
}

# Re-enable QR 1
$enableResp = Invoke-Api -Method "PATCH" -Uri "$baseUrl/qr/$qr1Id/status" -Headers $headersA -Body @{ status = "ACTIVE" }
if ($enableResp.Success -and $enableResp.Data.data.qrCode.status -eq "ACTIVE") {
    Write-Host "SUCCESS: QR 1 re-enabled status to ACTIVE in database." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Enable status toggle failed." -ForegroundColor Red
    exit 1
}

# 12. Test Edit / Update
Write-Host "`n[12] Testing QR Edit / Update..." -ForegroundColor Yellow
$updateResp = Invoke-Api -Method "POST" -Uri "$baseUrl/qr" -Headers $headersA # Verify update via PUT
$updateResp = Invoke-Api -Method "PUT" -Uri "$baseUrl/qr/$qr1Id" -Headers $headersA -Body @{
    name = "Alpha Website Link (Updated)"
    metadata = @{ url = "https://alpha-updated.example.com" }
    design = @{ fgColor = "#1e3a8a"; bgColor = "#ffffff"; dotStyle = "classy" }
}
if ($updateResp.Success -and $updateResp.Data.data.qrCode.name -eq "Alpha Website Link (Updated)" -and $updateResp.Data.data.qrCode.content -eq "https://alpha-updated.example.com") {
    Write-Host "SUCCESS: QR 1 successfully updated in database with recomputed content." -ForegroundColor Green
} else {
    Write-Host "FAILURE: QR update failed: $($updateResp | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

# 13. Test Ownership Security (Tamper ID Prevention)
Write-Host "`n[13] Testing Strict Ownership Security (User B accessing User A's QR)..." -ForegroundColor Yellow

# User B tries GET User A's QR
$tamperGet = Invoke-Api -Method "GET" -Uri "$baseUrl/qr/$qr1Id" -Headers $headersB
if (-not $tamperGet.Success -and ($tamperGet.StatusCode -eq 404 -or $tamperGet.StatusCode -eq 403)) {
    Write-Host "SUCCESS: User B GET on User A's QR blocked (Status $($tamperGet.StatusCode))." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Security vulnerability! User B was able to read User A's QR code!" -ForegroundColor Red
    exit 1
}

# User B tries PUT User A's QR
$tamperPut = Invoke-Api -Method "PUT" -Uri "$baseUrl/qr/$qr1Id" -Headers $headersB -Body @{ name = "Hacked by User B" }
if (-not $tamperPut.Success -and ($tamperPut.StatusCode -eq 404 -or $tamperPut.StatusCode -eq 403)) {
    Write-Host "SUCCESS: User B PUT on User A's QR blocked (Status $($tamperPut.StatusCode))." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Security vulnerability! User B was able to modify User A's QR code!" -ForegroundColor Red
    exit 1
}

# User B tries PATCH status on User A's QR
$tamperPatch = Invoke-Api -Method "PATCH" -Uri "$baseUrl/qr/$qr1Id/status" -Headers $headersB -Body @{ status = "DISABLED" }
if (-not $tamperPatch.Success -and ($tamperPatch.StatusCode -eq 404 -or $tamperPatch.StatusCode -eq 403)) {
    Write-Host "SUCCESS: User B PATCH status on User A's QR blocked (Status $($tamperPatch.StatusCode))." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Security vulnerability! User B was able to change status of User A's QR code!" -ForegroundColor Red
    exit 1
}

# User B tries DUPLICATE on User A's QR
$tamperDup = Invoke-Api -Method "POST" -Uri "$baseUrl/qr/$qr1Id/duplicate" -Headers $headersB
if (-not $tamperDup.Success -and ($tamperDup.StatusCode -eq 404 -or $tamperDup.StatusCode -eq 403)) {
    Write-Host "SUCCESS: User B duplicate of User A's QR blocked (Status $($tamperDup.StatusCode))." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Security vulnerability! User B was able to duplicate User A's QR code!" -ForegroundColor Red
    exit 1
}

# User B tries DELETE on User A's QR
$tamperDel = Invoke-Api -Method "DELETE" -Uri "$baseUrl/qr/$qr1Id" -Headers $headersB
if (-not $tamperDel.Success -and ($tamperDel.StatusCode -eq 404 -or $tamperDel.StatusCode -eq 403)) {
    Write-Host "SUCCESS: User B DELETE on User A's QR blocked (Status $($tamperDel.StatusCode))." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Security vulnerability! User B was able to delete User A's QR code!" -ForegroundColor Red
    exit 1
}

# User B queries their own list
$listB = Invoke-Api -Method "GET" -Uri "$baseUrl/qr" -Headers $headersB
if ($listB.Data.data.items.Count -eq 0) {
    Write-Host "SUCCESS: User B's QR list is completely isolated and empty." -ForegroundColor Green
} else {
    Write-Host "FAILURE: User B list leaked items from another user!" -ForegroundColor Red
    exit 1
}

# 14. Test Delete
Write-Host "`n[14] Testing QR Deletion for User A..." -ForegroundColor Yellow
$deleteResp = Invoke-Api -Method "DELETE" -Uri "$baseUrl/qr/$dupId" -Headers $headersA
if ($deleteResp.Success) {
    Write-Host "SUCCESS: Duplicate QR deleted successfully." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Delete QR failed." -ForegroundColor Red
    exit 1
}

# Verify it's gone
$verifyGone = Invoke-Api -Method "GET" -Uri "$baseUrl/qr/$dupId" -Headers $headersA
if (-not $verifyGone.Success -and $verifyGone.StatusCode -eq 404) {
    Write-Host "SUCCESS: Verified deleted QR returns 404 Not Found." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Deleted QR is still accessible!" -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  ALL PHASE 6 VERIFICATIONS PASSED WITH 100% SUCCESS!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
