# PowerShell Authentication Diagnostic Script
# Author: Test Engineer
# Purpose: Comprehensive authentication system testing

param(
    [string]$BackendUrl = "http://localhost:3001",
    [string]$FrontendUrl = "http://localhost:1313",
    [string]$LogFile = "auth-test-results.log"
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Initialize test results
$TestResults = @{
    Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    BackendUrl = $BackendUrl
    FrontendUrl = $FrontendUrl
    Tests = @{}
    Summary = @{
        Passed = 0
        Failed = 0
        Warnings = 0
    }
}

# Logging function
function Write-TestLog {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$TestName = "GENERAL"
    )
    
    $timestamp = (Get-Date).ToString("HH:mm:ss")
    $logMessage = "[$timestamp] [$Level] [$TestName] $Message"
    
    Write-Host $logMessage -ForegroundColor $(
        switch ($Level) {
            "SUCCESS" { "Green" }
            "ERROR" { "Red" }
            "WARNING" { "Yellow" }
            default { "White" }
        }
    )
    
    Add-Content -Path $LogFile -Value $logMessage
}

# Test function template
function Test-Component {
    param(
        [string]$TestName,
        [scriptblock]$TestScript
    )
    
    Write-TestLog "Starting test: $TestName" "INFO" $TestName
    
    try {
        $result = & $TestScript
        $TestResults.Tests[$TestName] = $result
        
        if ($result.Status -eq "SUCCESS") {
            $TestResults.Summary.Passed++
            Write-TestLog "Test passed: $TestName" "SUCCESS" $TestName
        } elseif ($result.Status -eq "WARNING") {
            $TestResults.Summary.Warnings++
            Write-TestLog "Test warning: $TestName - $($result.Message)" "WARNING" $TestName
        } else {
            $TestResults.Summary.Failed++
            Write-TestLog "Test failed: $TestName - $($result.Message)" "ERROR" $TestName
        }
    } catch {
        $TestResults.Summary.Failed++
        $TestResults.Tests[$TestName] = @{
            Status = "ERROR"
            Message = $_.Exception.Message
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        Write-TestLog "Test exception: $TestName - $($_.Exception.Message)" "ERROR" $TestName
    }
}

# 1. Test API Connection
Test-Component "API_CONNECTION" {
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 10
        
        if ($response.status -eq "healthy") {
            return @{
                Status = "SUCCESS"
                Message = "API is healthy"
                Data = $response
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        } else {
            return @{
                Status = "WARNING"
                Message = "API responding but status is: $($response.status)"
                Data = $response
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    } catch {
        return @{
            Status = "ERROR"
            Message = "Cannot connect to API: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 2. Test Authentication with Valid Credentials
Test-Component "AUTH_VALID_LOGIN" {
    try {
        $credentials = @{
            email = "admin@brandondocumentation.com"
            password = "admin123"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -Body $credentials -ContentType "application/json" -TimeoutSec 10
        
        if ($response.token) {
            # Store token for later tests
            $Global:AuthToken = $response.token
            
            return @{
                Status = "SUCCESS"
                Message = "Authentication successful, token received"
                Data = @{
                    TokenReceived = $true
                    UserData = $response.user
                    TokenLength = $response.token.Length
                }
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        } else {
            return @{
                Status = "ERROR"
                Message = "Authentication successful but no token received"
                Data = $response
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    } catch {
        return @{
            Status = "ERROR"
            Message = "Authentication failed: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 3. Test Authentication with Invalid Credentials
Test-Component "AUTH_INVALID_LOGIN" {
    try {
        $invalidCredentials = @{
            email = "invalid@test.com"
            password = "wrongpassword"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -Body $invalidCredentials -ContentType "application/json" -TimeoutSec 10
            
            # If we get here, the authentication unexpectedly succeeded
            return @{
                Status = "ERROR"
                Message = "SECURITY ISSUE: Invalid credentials were accepted"
                Data = $response
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        } catch {
            # This is expected - invalid credentials should fail
            if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
                return @{
                    Status = "SUCCESS"
                    Message = "Invalid credentials correctly rejected"
                    Data = @{
                        StatusCode = $_.Exception.Response.StatusCode.value__
                        ReasonPhrase = $_.Exception.Response.ReasonPhrase
                    }
                    Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                }
            } else {
                return @{
                    Status = "WARNING"
                    Message = "Invalid credentials rejected but with unexpected status code: $($_.Exception.Response.StatusCode)"
                    Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                }
            }
        }
    } catch {
        return @{
            Status = "ERROR"
            Message = "Test failed due to exception: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 4. Test Protected Endpoint Access
Test-Component "PROTECTED_ENDPOINT_ACCESS" {
    try {
        $headers = @{}
        
        if ($Global:AuthToken) {
            $headers["Authorization"] = "Bearer $Global:AuthToken"
            
            try {
                $response = Invoke-RestMethod -Uri "$BackendUrl/api/portfolios" -Method GET -Headers $headers -TimeoutSec 10
                
                return @{
                    Status = "SUCCESS"
                    Message = "Protected endpoint accessible with valid token"
                    Data = @{
                        ResponseType = $response.GetType().Name
                        ItemCount = if ($response -is [array]) { $response.Count } else { 1 }
                    }
                    Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                }
            } catch {
                if ($_.Exception.Response.StatusCode -eq 401) {
                    return @{
                        Status = "WARNING"
                        Message = "Protected endpoint rejected valid token - possible token expiry or validation issue"
                        Data = @{
                            StatusCode = $_.Exception.Response.StatusCode.value__
                            Token = $Global:AuthToken.Substring(0, [Math]::Min(20, $Global:AuthToken.Length)) + "..."
                        }
                        Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    }
                } else {
                    return @{
                        Status = "ERROR"
                        Message = "Protected endpoint access failed: $($_.Exception.Message)"
                        Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    }
                }
            }
        } else {
            return @{
                Status = "ERROR"
                Message = "No auth token available for testing protected endpoints"
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    } catch {
        return @{
            Status = "ERROR"
            Message = "Test failed: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 5. Test CORS Headers
Test-Component "CORS_HEADERS" {
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/health" -Method OPTIONS -TimeoutSec 10
        
        $corsHeaders = @{
            "Access-Control-Allow-Origin" = $response.Headers["Access-Control-Allow-Origin"]
            "Access-Control-Allow-Methods" = $response.Headers["Access-Control-Allow-Methods"]
            "Access-Control-Allow-Headers" = $response.Headers["Access-Control-Allow-Headers"]
        }
        
        $hasCors = $corsHeaders["Access-Control-Allow-Origin"] -ne $null
        
        return @{
            Status = if ($hasCors) { "SUCCESS" } else { "WARNING" }
            Message = if ($hasCors) { "CORS headers present" } else { "CORS headers missing or incomplete" }
            Data = $corsHeaders
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    } catch {
        return @{
            Status = "WARNING"
            Message = "Could not test CORS headers: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 6. Test Rate Limiting
Test-Component "RATE_LIMITING" {
    try {
        $requests = @()
        
        # Make multiple rapid requests
        for ($i = 1; $i -le 5; $i++) {
            try {
                $response = Invoke-WebRequest -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 5
                $requests += @{
                    Request = $i
                    StatusCode = $response.StatusCode
                    RateLimitRemaining = $response.Headers["X-RateLimit-Remaining"]
                    RateLimitReset = $response.Headers["X-RateLimit-Reset"]
                }
            } catch {
                $requests += @{
                    Request = $i
                    StatusCode = $_.Exception.Response.StatusCode.value__
                    Error = $_.Exception.Message
                }
            }
        }
        
        $rateLimitedRequests = $requests | Where-Object { $_.StatusCode -eq 429 }
        
        if ($rateLimitedRequests.Count -gt 0) {
            return @{
                Status = "SUCCESS"
                Message = "Rate limiting is active"
                Data = $requests
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        } else {
            return @{
                Status = "WARNING"
                Message = "Rate limiting not detected (may not be configured or limits not reached)"
                Data = $requests
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    } catch {
        return @{
            Status = "ERROR"
            Message = "Rate limiting test failed: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 7. Test Frontend Connectivity
Test-Component "FRONTEND_CONNECTIVITY" {
    try {
        $response = Invoke-WebRequest -Uri $FrontendUrl -Method GET -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            $contentType = $response.Headers["Content-Type"]
            $isHtml = $contentType -like "*text/html*"
            
            return @{
                Status = "SUCCESS"
                Message = "Frontend is accessible"
                Data = @{
                    StatusCode = $response.StatusCode
                    ContentType = $contentType
                    IsHtml = $isHtml
                    ContentLength = $response.Content.Length
                }
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        } else {
            return @{
                Status = "WARNING"
                Message = "Frontend responded with status: $($response.StatusCode)"
                Data = @{
                    StatusCode = $response.StatusCode
                    StatusDescription = $response.StatusDescription
                }
                Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    } catch {
        return @{
            Status = "ERROR"
            Message = "Cannot connect to frontend: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# 8. Test Security Headers
Test-Component "SECURITY_HEADERS" {
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 10
        
        $securityHeaders = @{
            "X-Frame-Options" = $response.Headers["X-Frame-Options"]
            "X-Content-Type-Options" = $response.Headers["X-Content-Type-Options"]
            "X-XSS-Protection" = $response.Headers["X-XSS-Protection"]
            "Strict-Transport-Security" = $response.Headers["Strict-Transport-Security"]
            "Content-Security-Policy" = $response.Headers["Content-Security-Policy"]
        }
        
        $presentHeaders = $securityHeaders.GetEnumerator() | Where-Object { $_.Value -ne $null }
        $headerCount = $presentHeaders.Count
        
        return @{
            Status = if ($headerCount -ge 3) { "SUCCESS" } elseif ($headerCount -ge 1) { "WARNING" } else { "ERROR" }
            Message = "$headerCount of 5 security headers present"
            Data = $securityHeaders
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    } catch {
        return @{
            Status = "WARNING"
            Message = "Could not test security headers: $($_.Exception.Message)"
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
}

# Main execution
Write-Host "🔐 Starting Comprehensive Authentication Test Suite" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Gray
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Gray
Write-Host "Log File: $LogFile" -ForegroundColor Gray
Write-Host ""

# Clear log file
if (Test-Path $LogFile) {
    Remove-Item $LogFile
}

# Run all tests
Write-TestLog "Starting authentication test suite" "INFO"

# Generate test report
Write-Host ""
Write-Host "📊 Test Results Summary:" -ForegroundColor Cyan
Write-Host "✅ Passed: $($TestResults.Summary.Passed)" -ForegroundColor Green
Write-Host "⚠️  Warnings: $($TestResults.Summary.Warnings)" -ForegroundColor Yellow
Write-Host "❌ Failed: $($TestResults.Summary.Failed)" -ForegroundColor Red

$totalTests = $TestResults.Summary.Passed + $TestResults.Summary.Warnings + $TestResults.Summary.Failed
if ($totalTests -gt 0) {
    $successRate = [Math]::Round(($TestResults.Summary.Passed / $totalTests) * 100, 1)
    Write-Host "📈 Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })
}

Write-Host ""
Write-Host "📋 Detailed Results:" -ForegroundColor Cyan

foreach ($test in $TestResults.Tests.GetEnumerator()) {
    $status = $test.Value.Status
    $color = switch ($status) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    
    Write-Host "  $($test.Key): $status - $($test.Value.Message)" -ForegroundColor $color
}

# Export results to JSON
$jsonResults = $TestResults | ConvertTo-Json -Depth 10
$jsonFile = "auth-test-results-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
$jsonResults | Out-File -FilePath $jsonFile -Encoding UTF8

Write-Host ""
Write-Host "💾 Results saved to:" -ForegroundColor Cyan
Write-Host "  Log file: $LogFile" -ForegroundColor Gray
Write-Host "  JSON report: $jsonFile" -ForegroundColor Gray

Write-TestLog "Authentication test suite completed" "INFO"

# Return exit code based on results
if ($TestResults.Summary.Failed -gt 0) {
    exit 1
} elseif ($TestResults.Summary.Warnings -gt 0) {
    exit 2
} else {
    exit 0
}