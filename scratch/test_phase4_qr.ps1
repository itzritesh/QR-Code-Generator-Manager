# Phase 4: QR Code Engine & Privacy Isolation Test Suite
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     PHASE 4: REAL QR GENERATOR ENGINE TEST SUITE         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$passCount = 0
$failCount = 0

function Assert-Test($condition, $testName, $detail = "") {
    if ($condition) {
        Write-Host " [PASS] $testName" -ForegroundColor Green
        if ($detail) { Write-Host "        $detail" -ForegroundColor DarkGray }
        $global:passCount++
    } else {
        Write-Host " [FAIL] $testName" -ForegroundColor Red
        if ($detail) { Write-Host "        $detail" -ForegroundColor DarkYellow }
        $global:failCount++
    }
}

# 1. Setup User A
$userAEmail = "qr.tester.a.$(Get-Random)@example.com"
$regA = @{
    name = "Tester A"
    email = $userAEmail
    password = "TesterPassword123!"
    confirmPassword = "TesterPassword123!"
} | ConvertTo-Json
$resA = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regA -ContentType "application/json"
$tokenA = $resA.data.token
$headersA = @{ Authorization = "Bearer $tokenA" }

# Setup User B
$userBEmail = "qr.tester.b.$(Get-Random)@example.com"
$regB = @{
    name = "Tester B"
    email = $userBEmail
    password = "TesterPassword123!"
    confirmPassword = "TesterPassword123!"
} | ConvertTo-Json
$resB = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regB -ContentType "application/json"
$tokenB = $resB.data.token
$headersB = @{ Authorization = "Bearer $tokenB" }

Assert-Test ($tokenA -ne $null -and $tokenB -ne $null) "0. Test accounts created successfully"

# 2. Test URL QR Code Generation
try {
    $urlPayload = @{
        name = "Product Launch Website"
        type = "URL"
        metadata = @{
            url = "https://mysite.com/launch-2026?ref=qr_poster"
        }
        design = @{
            fgColor = "#1e1b4b"
            bgColor = "#ffffff"
            errorCorrection = "H"
            margin = 2
        }
    } | ConvertTo-Json

    $qrUrlRes = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $urlPayload -Headers $headersA -ContentType "application/json"
    $urlQrId = $qrUrlRes.data.qrCode.id
    $encodedUrl = $qrUrlRes.data.qrCode.content

    Assert-Test ($qrUrlRes.success -eq $true -and $encodedUrl -eq "https://mysite.com/launch-2026?ref=qr_poster") `
        "1. URL QR code generated and saved" `
        "Encoded URL: $encodedUrl"
} catch {
    Assert-Test $false "1. URL QR code generation" $_.Exception.Message
}

# 3. Test Text QR Code Generation
try {
    $textPayload = @{
        name = "Facility Instructions"
        type = "TEXT"
        metadata = @{
            text = "Emergency Exit: Stairwell B. Call +1-555-0199 for assistance."
        }
    } | ConvertTo-Json

    $qrTextRes = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $textPayload -Headers $headersA -ContentType "application/json"
    $textQrId = $qrTextRes.data.qrCode.id
    $encodedText = $qrTextRes.data.qrCode.content

    Assert-Test ($qrTextRes.success -eq $true -and $encodedText -match "Emergency Exit") `
        "2. Text QR code generated and saved" `
        "Encoded Text length: $($encodedText.Length)"
} catch {
    Assert-Test $false "2. Text QR code generation" $_.Exception.Message
}

# 4. Test Wi-Fi QR Code Generation with Character Escaping
try {
    $wifiPayload = @{
        name = "Guest Wi-Fi"
        type = "WIFI"
        metadata = @{
            wifi = @{
                ssid = "Acme_Guest;HQ"
                password = 'Secret:Pass;123'
                security = "WPA"
                hidden = $false
            }
        }
    } | ConvertTo-Json

    $qrWifiRes = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $wifiPayload -Headers $headersA -ContentType "application/json"
    $wifiQrId = $qrWifiRes.data.qrCode.id
    $encodedWifi = $qrWifiRes.data.qrCode.content

    # Check that semicolon and colon are properly escaped
    $expectedWifi = 'WIFI:T:WPA;S:Acme_Guest\;HQ;P:Secret\:Pass\;123;;'
    Assert-Test ($encodedWifi -eq $expectedWifi) `
        "3. Wi-Fi QR code correctly encodes and escapes reserved characters" `
        "Payload: $encodedWifi"
} catch {
    Assert-Test $false "3. Wi-Fi QR code generation" $_.Exception.Message
}

# 5. Test Payment / UPI QR Code Generation
try {
    $paymentPayload = @{
        name = "Bakery Counter UPI"
        type = "PAYMENT"
        metadata = @{
            payment = @{
                upiId = "bakery@okhdfcbank"
                payeeName = "Acme Bakery"
                amount = 250.00
                currency = "INR"
                note = "Order 42"
            }
        }
    } | ConvertTo-Json

    $qrPayRes = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $paymentPayload -Headers $headersA -ContentType "application/json"
    $payQrId = $qrPayRes.data.qrCode.id
    $encodedPay = $qrPayRes.data.qrCode.content

    Assert-Test ($encodedPay -match "^upi:\/\/pay\?" -and $encodedPay -match "pa=bakery%40okhdfcbank" -and $encodedPay -match "am=250.00") `
        "4. Payment/UPI QR code correctly formatted according to NPCI spec" `
        "URI: $encodedPay"
} catch {
    Assert-Test $false "4. Payment/UPI QR code generation" $_.Exception.Message
}

# 6. Test Validation: Invalid URL
try {
    $badUrlPayload = @{
        name = "Bad URL"
        type = "URL"
        metadata = @{ url = "not_a_valid_url" }
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $badUrlPayload -Headers $headersA -ContentType "application/json"
    Assert-Test $false "5. Invalid URL rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "5. Invalid URL properly rejected with HTTP 400" "Status: $status"
}

# 7. Test Validation: Missing Wi-Fi SSID
try {
    $badWifiPayload = @{
        name = "Bad Wi-Fi"
        type = "WIFI"
        metadata = @{
            wifi = @{
                ssid = ""
                security = "WPA"
            }
        }
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $badWifiPayload -Headers $headersA -ContentType "application/json"
    Assert-Test $false "6. Missing SSID rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "6. Missing Wi-Fi SSID rejected with HTTP 400" "Status: $status"
}

# 8. Test Validation: Weak WPA password (< 8 chars)
try {
    $weakWpaPayload = @{
        name = "Weak WPA Wi-Fi"
        type = "WIFI"
        metadata = @{
            wifi = @{
                ssid = "MyHome"
                password = "short"
                security = "WPA"
            }
        }
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $weakWpaPayload -Headers $headersA -ContentType "application/json"
    Assert-Test $false "7. WPA password < 8 chars rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "7. Weak WPA password (< 8 chars) rejected with HTTP 400" "Status: $status"
}

# 9. Test Validation: Invalid UPI ID
try {
    $badUpiPayload = @{
        name = "Bad UPI"
        type = "PAYMENT"
        metadata = @{
            payment = @{
                upiId = "notanupiid"
            }
        }
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $badUpiPayload -Headers $headersA -ContentType "application/json"
    Assert-Test $false "8. Invalid UPI ID rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "8. Invalid UPI ID format rejected with HTTP 400" "Status: $status"
}

# 10. Test Privacy & User Isolation: User B cannot access User A's QR Code
try {
    Invoke-RestMethod -Uri "$baseUrl/qr/$urlQrId" -Method Get -Headers $headersB
    Assert-Test $false "9. Privacy rule: User B blocked from accessing User A's QR" "Expected 404 Not Found"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 404) "9. Privacy rule enforced: User B receives HTTP 404 when querying User A's QR" "Status: $status"
}

# 11. Test Privacy & User Isolation: User B cannot update User A's QR Code
try {
    $tamperPayload = @{ name = "Hacked Name" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/qr/$urlQrId" -Method Put -Body $tamperPayload -Headers $headersB -ContentType "application/json"
    Assert-Test $false "10. Privacy rule: User B blocked from modifying User A's QR" "Expected 404 Not Found"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 404) "10. Privacy rule enforced: User B cannot modify User A's QR (HTTP 404)" "Status: $status"
}

# 12. Test Privacy & User Isolation: User B cannot delete User A's QR Code
try {
    Invoke-RestMethod -Uri "$baseUrl/qr/$urlQrId" -Method Delete -Headers $headersB
    Assert-Test $false "11. Privacy rule: User B blocked from deleting User A's QR" "Expected 404 Not Found"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 404) "11. Privacy rule enforced: User B cannot delete User A's QR (HTTP 404)" "Status: $status"
}

# 13. Test QR List & User Isolation
try {
    $listA = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Get -Headers $headersA
    $listB = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Get -Headers $headersB

    Assert-Test ($listA.data.items.Count -eq 4 -and $listB.data.items.Count -eq 0) `
        "12. User isolation in QR listings verified" `
        "User A sees $($listA.data.items.Count) items; User B sees $($listB.data.items.Count) items"
} catch {
    Assert-Test $false "12. QR listing isolation" $_.Exception.Message
}

# 14. Test Updating QR Code by Owner
try {
    $updatePayload = @{
        name = "Product Launch Website 2.0"
        metadata = @{
            url = "https://mysite.com/v2-launch"
        }
    } | ConvertTo-Json
    $updatedRes = Invoke-RestMethod -Uri "$baseUrl/qr/$urlQrId" -Method Put -Body $updatePayload -Headers $headersA -ContentType "application/json"
    Assert-Test ($updatedRes.data.qrCode.name -eq "Product Launch Website 2.0" -and $updatedRes.data.qrCode.content -eq "https://mysite.com/v2-launch") `
        "13. Owner can successfully update QR Code metadata & payload" `
        "Updated Content: $($updatedRes.data.qrCode.content)"
} catch {
    Assert-Test $false "13. Update QR code" $_.Exception.Message
}

# 15. Test Deleting QR Code by Owner
try {
    $delRes = Invoke-RestMethod -Uri "$baseUrl/qr/$urlQrId" -Method Delete -Headers $headersA
    Assert-Test ($delRes.success -eq $true) `
        "14. Owner can successfully delete their QR Code" `
        "Message: $($delRes.message)"
} catch {
    Assert-Test $false "14. Delete QR code" $_.Exception.Message
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PHASE 4 TEST SUMMARY: $passCount PASSED, $failCount FAILED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan
