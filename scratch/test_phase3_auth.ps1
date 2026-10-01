# Comprehensive Authentication & Security Automated Test Suite
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    PHASE 3: COMPREHENSIVE AUTHENTICATION TEST SUITE      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$testEmail = "jane.doe.$(Get-Random)@example.com"
$originalPassword = "OriginalPass123!"
$newPassword = "UpdatedPass456!"
$resetPassword = "FinalResetPass789!"

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

# 1. Registration with valid payload
try {
    $regBody = @{
        name = "Jane Doe"
        email = $testEmail
        password = $originalPassword
        confirmPassword = $originalPassword
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    $userToken = $res.data.token
    $userId = $res.data.user.id
    
    Assert-Test ($res.success -eq $true -and $userToken -ne $null -and $res.data.user.passwordHash -eq $null) `
        "1. Registration succeeds and never leaks passwordHash" `
        "Created user ID: $userId, Token length: $($userToken.Length)"
} catch {
    Assert-Test $false "1. Registration succeeds" $_.Exception.Message
}

# 2. Duplicate registration rejection (409 Conflict)
try {
    $dupRes = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    Assert-Test $false "2. Duplicate registration rejected" "Expected 409 Conflict, but got 200"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 409) "2. Duplicate registration properly rejected with HTTP 409" "Status: $status"
}

# 3. Registration with invalid email format (400 Bad Request)
try {
    $badEmailBody = @{
        name = "Jane Bad"
        email = "not-an-email"
        password = "ValidPassword123!"
        confirmPassword = "ValidPassword123!"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $badEmailBody -ContentType "application/json"
    Assert-Test $false "3. Invalid email format rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "3. Invalid email format properly rejected with HTTP 400" "Status: $status"
}

# 4. Registration with weak password (400 Bad Request)
try {
    $weakPassBody = @{
        name = "Jane Weak"
        email = "jane.weak@example.com"
        password = "weak"
        confirmPassword = "weak"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $weakPassBody -ContentType "application/json"
    Assert-Test $false "4. Weak password rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "4. Weak password rejected with HTTP 400" "Status: $status"
}

# 5. Registration with mismatched password (400 Bad Request)
try {
    $mismatchBody = @{
        name = "Jane Mismatch"
        email = "jane.mismatch@example.com"
        password = "Password123!"
        confirmPassword = "DifferentPassword456!"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $mismatchBody -ContentType "application/json"
    Assert-Test $false "5. Mismatched passwords rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "5. Mismatched passwords rejected with HTTP 400" "Status: $status"
}

# 6. Login with correct credentials
try {
    $loginBody = @{
        email = $testEmail
        password = $originalPassword
    } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Assert-Test ($loginRes.success -eq $true -and $loginRes.data.token -ne $null) `
        "6. Login with valid credentials succeeds and returns JWT" `
        "User: $($loginRes.data.user.email)"
} catch {
    Assert-Test $false "6. Login with valid credentials" $_.Exception.Message
}

# 7. Login with wrong password (401 Unauthorized)
try {
    $wrongPassBody = @{
        email = $testEmail
        password = "WrongPassword999!"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $wrongPassBody -ContentType "application/json"
    Assert-Test $false "7. Wrong password rejected" "Expected 401 Unauthorized"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 401) "7. Wrong password rejected with HTTP 401" "Status: $status"
}

# 8. Login with non-existent email (401 Unauthorized with safe generic error)
try {
    $noEmailBody = @{
        email = "nonexistent.user.9999@example.com"
        password = "SomePassword123!"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $noEmailBody -ContentType "application/json"
    Assert-Test $false "8. Non-existent email rejected" "Expected 401 Unauthorized"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 401) "8. Non-existent email returns safe HTTP 401" "Status: $status"
}

# 9. Protected endpoint access without token (401 Unauthorized)
try {
    Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get
    Assert-Test $false "9. Unauthenticated access blocked" "Expected 401 Unauthorized"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 401) "9. Unauthenticated access blocked with HTTP 401" "Status: $status"
}

# 10. Protected endpoint access with invalid / forged token (401 Unauthorized)
try {
    $badHeaders = @{ Authorization = "Bearer invalid.jwt.token.string" }
    Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $badHeaders
    Assert-Test $false "10. Invalid token rejected" "Expected 401 Unauthorized"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 401) "10. Invalid/forged token rejected with HTTP 401" "Status: $status"
}

# 11. Protected endpoint access with valid token (200 OK)
try {
    $authHeaders = @{ Authorization = "Bearer $userToken" }
    $meRes = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $authHeaders
    Assert-Test ($meRes.success -eq $true -and $meRes.data.user.email -eq $testEmail) `
        "11. GET /api/auth/me returns current authenticated user" `
        "Authenticated as: $($meRes.data.user.name)"
} catch {
    Assert-Test $false "11. GET /api/auth/me" $_.Exception.Message
}

# 12. Profile update (PUT /api/auth/profile)
try {
    $updateProfileBody = @{
        name = "Jane Developer Pro"
        avatar = "https://example.com/avatar.png"
    } | ConvertTo-Json
    $profileRes = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method Put -Body $updateProfileBody -Headers $authHeaders -ContentType "application/json"
    Assert-Test ($profileRes.success -eq $true -and $profileRes.data.user.name -eq "Jane Developer Pro") `
        "12. Profile updated successfully" `
        "New Name: $($profileRes.data.user.name)"
} catch {
    Assert-Test $false "12. Profile update" $_.Exception.Message
}

# 13. Change password with wrong current password (401 Unauthorized)
try {
    $wrongCurrentBody = @{
        currentPassword = "IncorrectCurrentPassword123!"
        newPassword = $newPassword
        confirmNewPassword = $newPassword
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/change-password" -Method Put -Body $wrongCurrentBody -Headers $authHeaders -ContentType "application/json"
    Assert-Test $false "13. Change password wrong current password rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400 -or $status -eq 401) "13. Change password validates current password (rejected with HTTP 400/401)" "Status: $status"
}

# 14. Change password with correct current password (200 OK)
try {
    $changePassBody = @{
        currentPassword = $originalPassword
        newPassword = $newPassword
        confirmNewPassword = $newPassword
    } | ConvertTo-Json
    $cpRes = Invoke-RestMethod -Uri "$baseUrl/auth/change-password" -Method Put -Body $changePassBody -Headers $authHeaders -ContentType "application/json"
    Assert-Test ($cpRes.success -eq $true) `
        "14. Password changed successfully" `
        "Message: $($cpRes.message)"
} catch {
    Assert-Test $false "14. Change password" $_.Exception.Message
}

# 15. Verify old password no longer works
try {
    $oldPassBody = @{
        email = $testEmail
        password = $originalPassword
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $oldPassBody -ContentType "application/json"
    Assert-Test $false "15. Old password invalidated" "Expected 401 Unauthorized"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 401) "15. Old password can no longer authenticate (HTTP 401)" "Status: $status"
}

# 16. Verify new password logs in successfully
try {
    $newPassBody = @{
        email = $testEmail
        password = $newPassword
    } | ConvertTo-Json
    $newLoginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $newPassBody -ContentType "application/json"
    $newAuthToken = $newLoginRes.data.token
    Assert-Test ($newLoginRes.success -eq $true -and $newAuthToken -ne $null) `
        "16. New password successfully logs in" `
        "Received refreshed JWT token"
} catch {
    Assert-Test $false "16. Login with new password" $_.Exception.Message
}

# 17. Forgot password flow (POST /api/auth/forgot-password)
try {
    $forgotBody = @{ email = $testEmail } | ConvertTo-Json
    $forgotRes = Invoke-RestMethod -Uri "$baseUrl/auth/forgot-password" -Method Post -Body $forgotBody -ContentType "application/json"
    $devResetToken = $forgotRes.data.devToken
    Assert-Test ($forgotRes.success -eq $true -and $devResetToken -ne $null) `
        "17. Forgot password generates secure cryptographic token" `
        "Token: $($devResetToken.Substring(0, 16))..."
} catch {
    Assert-Test $false "17. Forgot password flow" $_.Exception.Message
}

# 18. Reset password with invalid / tampered token (400 Bad Request)
try {
    $badResetBody = @{
        token = "invalid-token-string-12345"
        password = $resetPassword
        confirmPassword = $resetPassword
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/reset-password" -Method Post -Body $badResetBody -ContentType "application/json"
    Assert-Test $false "18. Tampered reset token rejected" "Expected 400 Bad Request"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert-Test ($status -eq 400) "18. Tampered or expired reset token rejected with HTTP 400" "Status: $status"
}

# 19. Reset password with valid token (200 OK)
try {
    $validResetBody = @{
        token = $devResetToken
        password = $resetPassword
        confirmPassword = $resetPassword
    } | ConvertTo-Json
    $resetRes = Invoke-RestMethod -Uri "$baseUrl/auth/reset-password" -Method Post -Body $validResetBody -ContentType "application/json"
    Assert-Test ($resetRes.success -eq $true) `
        "19. Reset password completes successfully with valid token" `
        "Message: $($resetRes.message)"
} catch {
    Assert-Test $false "19. Reset password" $_.Exception.Message
}

# 20. Verify login with the reset password
try {
    $finalLoginBody = @{
        email = $testEmail
        password = $resetPassword
    } | ConvertTo-Json
    $finalLoginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $finalLoginBody -ContentType "application/json"
    Assert-Test ($finalLoginRes.success -eq $true -and $finalLoginRes.data.token -ne $null) `
        "20. Login with reset password succeeds" `
        "User confirmed: $($finalLoginRes.data.user.email)"
} catch {
    Assert-Test $false "20. Login with reset password" $_.Exception.Message
}

# 21. Logout endpoint (200 OK)
try {
    $logoutRes = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method Post -Headers @{ Authorization = "Bearer $($finalLoginRes.data.token)" }
    Assert-Test ($logoutRes.success -eq $true) `
        "21. Logout endpoint succeeds and responds with 200 OK" `
        "Message: $($logoutRes.message)"
} catch {
    Assert-Test $false "21. Logout endpoint" $_.Exception.Message
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY: $passCount PASSED, $failCount FAILED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan
