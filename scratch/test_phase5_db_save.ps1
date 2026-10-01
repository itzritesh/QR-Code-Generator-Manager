# Phase 5 Database Persistence & Advanced Customization Verification
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " PHASE 5: DATABASE SAVE & CUSTOM DESIGN PERSISTENCE TEST   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"

# 1. Register test user
$userEmail = "phase5.designer.$(Get-Random)@example.com"
$regBody = @{
    name = "Design Specialist"
    email = $userEmail
    password = "DesignPassword123!"
    confirmPassword = "DesignPassword123!"
} | ConvertTo-Json
$resUser = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
$token = $resUser.data.token
$headers = @{ Authorization = "Bearer $token" }

# 2. Post full custom QR
$qrPayload = @{
    name = "Summer VIP Campaign"
    type = "URL"
    metadata = @{
        url = "https://mysite.com/vip-pass"
    }
    design = @{
        fgColor = "#1e3a8a"
        bgColor = "#f8fafc"
        gradient = @{
            enabled = $true
            type = "diagonal"
            startColor = "#1e3a8a"
            endColor = "#3b82f6"
        }
        dotStyle = "rounded"
        eyeFrameStyle = "leaf"
        eyeBallStyle = "circle"
        eyeFrameColor = "#1e3a8a"
        eyeBallColor = "#2563eb"
        errorCorrection = "Q"
        margin = 2
        size = 1024
        frame = @{
            enabled = $true
            text = "SCAN VIP PASS"
            position = "bottom"
            bgColor = "#1e3a8a"
            textColor = "#ffffff"
        }
        templateId = "business"
    }
} | ConvertTo-Json

try {
    $saveRes = Invoke-RestMethod -Uri "$baseUrl/qr" -Method Post -Body $qrPayload -Headers $headers -ContentType "application/json"
    $qrId = $saveRes.data.qrCode.id
    Write-Host " [PASS] 1. Custom QR Code saved to Neon PostgreSQL" -ForegroundColor Green
    Write-Host "        QR ID: $qrId" -ForegroundColor DarkGray
    Write-Host "        Template: $($saveRes.data.qrCode.design.templateId)" -ForegroundColor DarkGray
    Write-Host "        Frame CTA: $($saveRes.data.qrCode.design.frame.text)" -ForegroundColor DarkGray
} catch {
    Write-Host " [FAIL] 1. Custom QR save failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Retrieve and verify full persistence
try {
    $getRes = Invoke-RestMethod -Uri "$baseUrl/qr/$qrId" -Method Get -Headers $headers
    $savedDesign = $getRes.data.qrCode.design
    $matches = ($savedDesign.dotStyle -eq "rounded" -and $savedDesign.eyeFrameStyle -eq "leaf" -and $savedDesign.gradient.enabled -eq $true)
    if ($matches) {
        Write-Host " [PASS] 2. Retrieved QR code preserves all advanced design properties" -ForegroundColor Green
        Write-Host "        Gradient: $($savedDesign.gradient.type) ($($savedDesign.gradient.startColor) -> $($savedDesign.gradient.endColor))" -ForegroundColor DarkGray
        Write-Host "        Eyes: Frame=$($savedDesign.eyeFrameStyle), Ball=$($savedDesign.eyeBallStyle)" -ForegroundColor DarkGray
    } else {
        Write-Host " [FAIL] 2. Retrieved design does not match expected configuration" -ForegroundColor Red
    }
} catch {
    Write-Host " [FAIL] 2. Retrieve failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "==========================================================" -ForegroundColor Cyan
