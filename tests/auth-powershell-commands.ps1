# PowerShell Commands for Authentication Testing
# Usage: .\auth-powershell-commands.ps1 [-BackendUrl "http://localhost:3001"]

param(
    [string]$BackendUrl = "http://localhost:3001"
)

$ApiBase = "$BackendUrl/api"
$ErrorActionPreference = "Continue"

Write-Host "🔐 Authentication Testing with PowerShell" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Gray
Write-Host "=================================================" -ForegroundColor Gray

# Helper function for colored output
function Write-TestResult {
    param(
        [string]$Status,
        [string]$Message,
        [object]$Data = $null
    )
    
    switch ($Status) {
        "SUCCESS" { 
            Write-Host "✅ $Message" -ForegroundColor Green
        }
        "ERROR" { 
            Write-Host "❌ $Message" -ForegroundColor Red
        }
        "WARNING" { 
            Write-Host "⚠️  $Message" -ForegroundColor Yellow
        }
        "INFO" { 
            Write-Host "ℹ️  $Message" -ForegroundColor Blue
        }
    }
    
    if ($Data -and $VerbosePreference -eq "Continue") {
        Write-Host ($Data | ConvertTo-Json -Depth 3) -ForegroundColor Gray
    }
}

# Helper function for HTTP requests with error handling
function Invoke-ApiRequest {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$TimeoutSec = 30
    )
    
    $requestHeaders = @{
        "Accept" = "application/json"
        "Content-Type" = "application/json"
    }
    
    # Merge custom headers
    foreach ($key in $Headers.Keys) {
        $requestHeaders[$key] = $Headers[$key]
    }
    
    $requestParams = @{
        Uri = $Uri
        Method = $Method
        Headers = $requestHeaders
        TimeoutSec = $TimeoutSec
    }
    
    if ($Body) {
        if ($Body -is [string]) {
            $requestParams.Body = $Body
        } else {
            $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
        }
    }
    
    try {
        $response = Invoke-RestMethod @requestParams
        return @{
            Success = $true
            StatusCode = 200
            Data = $response
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $responseContent = $null
        
        try {
            $responseContent = $_.Exception.Response.Content.ReadAsStringAsync().Result
            $responseContent = $responseContent | ConvertFrom-Json
        } catch {
            $responseContent = $_.Exception.Message
        }
        
        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $_.Exception.Message
            Data = $responseContent
        }
    }
}

# Test 1: Health Check
Write-Host "`n1. Testing Health Endpoint" -ForegroundColor Blue
Write-Host "Command: Invoke-RestMethod -Uri '$ApiBase/health'" -ForegroundColor Gray
Write-Host "Expected: JSON response with health status" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

$healthResult = Invoke-ApiRequest -Uri "$ApiBase/health" -Method GET

if ($healthResult.Success) {
    Write-TestResult -Status "SUCCESS" -Message "Health endpoint responded successfully"
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($healthResult.Data | ConvertTo-Json -Depth 3) -ForegroundColor White
} else {
    Write-TestResult -Status "ERROR" -Message "Health endpoint failed with status $($healthResult.StatusCode)"
    Write-Host "Error: $($healthResult.Error)" -ForegroundColor Red
    if ($healthResult.Data) {
        Write-Host "Response: $($healthResult.Data | ConvertTo-Json)" -ForegroundColor Red
    }
}

# Test 2: Valid Login
Write-Host "`n2. Testing Valid Login Credentials" -ForegroundColor Blue
Write-Host "Command: Invoke-RestMethod -Uri '$ApiBase/auth/login' -Method POST -Body '{...}'" -ForegroundColor Gray
Write-Host "Expected: JSON response with token" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

$loginCredentials = @{
    email = "admin@brandondocumentation.com"
    password = "admin123"
}

$loginResult = Invoke-ApiRequest -Uri "$ApiBase/auth/login" -Method POST -Body $loginCredentials

$global:authToken = $null

if ($loginResult.Success) {
    Write-TestResult -Status "SUCCESS" -Message "Valid login succeeded"
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($loginResult.Data | ConvertTo-Json -Depth 3) -ForegroundColor White
    
    # Extract token for further tests
    if ($loginResult.Data.token) {
        $global:authToken = $loginResult.Data.token
        $tokenPreview = $global:authToken.Substring(0, [Math]::Min(20, $global:authToken.Length))
        Write-TestResult -Status "SUCCESS" -Message "Authentication token extracted: $tokenPreview..."
    } elseif ($loginResult.Data.accessToken) {
        $global:authToken = $loginResult.Data.accessToken
        $tokenPreview = $global:authToken.Substring(0, [Math]::Min(20, $global:authToken.Length))
        Write-TestResult -Status "SUCCESS" -Message "Access token extracted: $tokenPreview..."
    } else {
        Write-TestResult -Status "WARNING" -Message "No token found in login response"
    }
} else {
    Write-TestResult -Status "ERROR" -Message "Valid login failed with status $($loginResult.StatusCode)"
    Write-Host "Error: $($loginResult.Error)" -ForegroundColor Red
    if ($loginResult.Data) {
        Write-Host "Response: $($loginResult.Data | ConvertTo-Json)" -ForegroundColor Red
    }
}

# Test 3: Invalid Login
Write-Host "`n3. Testing Invalid Login Credentials" -ForegroundColor Blue
Write-Host "Command: Invoke-RestMethod with invalid credentials" -ForegroundColor Gray
Write-Host "Expected: 401 Unauthorized response" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

$invalidCredentials = @{
    email = "invalid@test.com"
    password = "wrongpassword"
}

$invalidLoginResult = Invoke-ApiRequest -Uri "$ApiBase/auth/login" -Method POST -Body $invalidCredentials

if (!$invalidLoginResult.Success -and ($invalidLoginResult.StatusCode -eq 401 -or $invalidLoginResult.StatusCode -eq 400)) {
    Write-TestResult -Status "SUCCESS" -Message "Invalid login correctly rejected with status $($invalidLoginResult.StatusCode)"
    Write-Host "Response:" -ForegroundColor Gray
    if ($invalidLoginResult.Data) {
        Write-Host ($invalidLoginResult.Data | ConvertTo-Json -Depth 3) -ForegroundColor White
    }
} elseif ($invalidLoginResult.Success) {
    Write-TestResult -Status "ERROR" -Message "SECURITY ISSUE: Invalid login was accepted!"
    Write-Host "Response: $($invalidLoginResult.Data | ConvertTo-Json)" -ForegroundColor Red
} else {
    Write-TestResult -Status "WARNING" -Message "Invalid login returned unexpected status $($invalidLoginResult.StatusCode)"
    Write-Host "Error: $($invalidLoginResult.Error)" -ForegroundColor Yellow
}

# Test 4: Protected Endpoint (without token)
Write-Host "`n4. Testing Protected Endpoint (No Token)" -ForegroundColor Blue
Write-Host "Command: Invoke-RestMethod -Uri '$ApiBase/portfolios'" -ForegroundColor Gray
Write-Host "Expected: 401 Unauthorized response" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

$protectedResult = Invoke-ApiRequest -Uri "$ApiBase/portfolios" -Method GET

if (!$protectedResult.Success -and ($protectedResult.StatusCode -eq 401 -or $protectedResult.StatusCode -eq 403)) {
    Write-TestResult -Status "SUCCESS" -Message "Protected endpoint correctly blocked with status $($protectedResult.StatusCode)"
    if ($protectedResult.Data) {
        Write-Host "Response: $($protectedResult.Data | ConvertTo-Json)" -ForegroundColor White
    }
} elseif ($protectedResult.Success) {
    Write-TestResult -Status "WARNING" -Message "Protected endpoint allowed access without authentication (status 200)"
    Write-Host "This might indicate the endpoint is public or has incorrect security configuration" -ForegroundColor Yellow
} else {
    Write-TestResult -Status "INFO" -Message "Protected endpoint returned status $($protectedResult.StatusCode)"
    if ($protectedResult.Data) {
        Write-Host "Response: $($protectedResult.Data | ConvertTo-Json)" -ForegroundColor Gray
    }
}

# Test 5: Protected Endpoint (with token)
if ($global:authToken) {
    Write-Host "`n5. Testing Protected Endpoint (With Token)" -ForegroundColor Blue
    Write-Host "Command: Invoke-RestMethod with Authorization header" -ForegroundColor Gray
    Write-Host "Expected: 200 OK or 404 Not Found" -ForegroundColor Gray
    Write-Host "---" -ForegroundColor Gray

    $authHeaders = @{
        "Authorization" = "Bearer $global:authToken"
    }

    $authorizedResult = Invoke-ApiRequest -Uri "$ApiBase/portfolios" -Method GET -Headers $authHeaders

    if ($authorizedResult.Success) {
        Write-TestResult -Status "SUCCESS" -Message "Authorized request succeeded with status 200"
        Write-Host "Response:" -ForegroundColor Gray
        if ($authorizedResult.Data) {
            $dataType = if ($authorizedResult.Data -is [array]) { "Array with $($authorizedResult.Data.Count) items" } else { $authorizedResult.Data.GetType().Name }
            Write-Host "Data type: $dataType" -ForegroundColor White
            if ($authorizedResult.Data.Count -le 5) {
                Write-Host ($authorizedResult.Data | ConvertTo-Json -Depth 2) -ForegroundColor White
            } else {
                Write-Host "Large dataset returned (showing first 2 items):" -ForegroundColor White
                Write-Host ($authorizedResult.Data[0..1] | ConvertTo-Json -Depth 2) -ForegroundColor White
            }
        }
    } elseif ($authorizedResult.StatusCode -eq 404) {
        Write-TestResult -Status "SUCCESS" -Message "Authorized request returned 404 (endpoint might not exist or no data)"
    } elseif ($authorizedResult.StatusCode -eq 401 -or $authorizedResult.StatusCode -eq 403) {
        Write-TestResult -Status "WARNING" -Message "Token might be invalid or expired (status $($authorizedResult.StatusCode))"
        if ($authorizedResult.Data) {
            Write-Host "Response: $($authorizedResult.Data | ConvertTo-Json)" -ForegroundColor Yellow
        }
    } else {
        Write-TestResult -Status "ERROR" -Message "Authorized request failed with unexpected status $($authorizedResult.StatusCode)"
        Write-Host "Error: $($authorizedResult.Error)" -ForegroundColor Red
    }
} else {
    Write-Host "`n5. Skipping Protected Endpoint Test (No Token Available)" -ForegroundColor Yellow
}

# Test 6: Token Validation with Various Invalid Tokens
Write-Host "`n6. Testing Token Validation" -ForegroundColor Blue
Write-Host "Command: Testing various invalid tokens" -ForegroundColor Gray
Write-Host "Expected: All should return 401/403" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

$invalidTokens = @(
    @{ Name = "Empty Token"; Token = "" }
    @{ Name = "Invalid Token"; Token = "invalid_token_here" }
    @{ Name = "Malformed Bearer"; Token = "NotBearer token" }
    @{ Name = "Expired Token"; Token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MzQ3NzU5MzgsImV4cCI6MTYzNDc3NTkzOCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.past_expiry_token" }
)

foreach ($tokenTest in $invalidTokens) {
    $testHeaders = @{
        "Authorization" = "Bearer $($tokenTest.Token)"
    }
    
    $tokenResult = Invoke-ApiRequest -Uri "$ApiBase/portfolios" -Method GET -Headers $testHeaders
    
    if (!$tokenResult.Success -and ($tokenResult.StatusCode -eq 401 -or $tokenResult.StatusCode -eq 403)) {
        Write-TestResult -Status "SUCCESS" -Message "$($tokenTest.Name): Correctly rejected (status $($tokenResult.StatusCode))"
    } elseif ($tokenResult.Success) {
        Write-TestResult -Status "ERROR" -Message "$($tokenTest.Name): SECURITY ISSUE - Invalid token was accepted!"
    } else {
        Write-TestResult -Status "WARNING" -Message "$($tokenTest.Name): Unexpected status $($tokenResult.StatusCode)"
    }
}

# Test 7: Rate Limiting
Write-Host "`n7. Testing Rate Limiting" -ForegroundColor Blue
Write-Host "Command: Multiple rapid requests" -ForegroundColor Gray
Write-Host "Expected: Some requests might return 429 Too Many Requests" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

Write-Host "Making 10 rapid requests..." -ForegroundColor Gray

$rateLimitDetected = $false

for ($i = 1; $i -le 10; $i++) {
    $rateResult = Invoke-ApiRequest -Uri "$ApiBase/health" -Method GET
    
    if (!$rateResult.Success -and $rateResult.StatusCode -eq 429) {
        Write-TestResult -Status "SUCCESS" -Message "Request $i: Rate limited (status 429)"
        $rateLimitDetected = $true
        break
    } elseif ($rateResult.Success) {
        Write-Host "Request $i`: OK (status 200)" -ForegroundColor Gray
    } else {
        Write-TestResult -Status "WARNING" -Message "Request $i`: Unexpected status $($rateResult.StatusCode)"
    }
    
    Start-Sleep -Milliseconds 100
}

if (!$rateLimitDetected) {
    Write-TestResult -Status "WARNING" -Message "Rate limiting not detected (may not be configured or limits not reached)"
}

# Test 8: CORS Headers
Write-Host "`n8. Testing CORS Headers" -ForegroundColor Blue
Write-Host "Command: OPTIONS request with CORS headers" -ForegroundColor Gray
Write-Host "Expected: CORS headers in response" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

try {
    $corsHeaders = @{
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type"
        "Origin" = "http://localhost:1313"
    }
    
    $corsResponse = Invoke-WebRequest -Uri "$ApiBase/health" -Method OPTIONS -Headers $corsHeaders -TimeoutSec 10
    
    Write-TestResult -Status "SUCCESS" -Message "CORS preflight request succeeded (status $($corsResponse.StatusCode))"
    
    $corsResponseHeaders = @{
        "Access-Control-Allow-Origin" = $corsResponse.Headers["Access-Control-Allow-Origin"]
        "Access-Control-Allow-Methods" = $corsResponse.Headers["Access-Control-Allow-Methods"]
        "Access-Control-Allow-Headers" = $corsResponse.Headers["Access-Control-Allow-Headers"]
        "Access-Control-Allow-Credentials" = $corsResponse.Headers["Access-Control-Allow-Credentials"]
    }
    
    Write-Host "CORS Headers:" -ForegroundColor Gray
    foreach ($header in $corsResponseHeaders.GetEnumerator()) {
        if ($header.Value) {
            Write-Host "  $($header.Key): $($header.Value)" -ForegroundColor White
        } else {
            Write-Host "  $($header.Key): Not set" -ForegroundColor Yellow
        }
    }
    
    if ($corsResponseHeaders["Access-Control-Allow-Origin"]) {
        Write-TestResult -Status "SUCCESS" -Message "CORS is properly configured"
    } else {
        Write-TestResult -Status "WARNING" -Message "CORS headers missing or incomplete"
    }
    
} catch {
    Write-TestResult -Status "WARNING" -Message "CORS test failed: $($_.Exception.Message)"
}

# Summary
Write-Host "`n============== TEST SUMMARY ==============" -ForegroundColor Blue
Write-Host "Health Endpoint: Tested" -ForegroundColor Gray
Write-Host "Valid Login: Tested" -ForegroundColor Gray
Write-Host "Invalid Login: Tested" -ForegroundColor Gray
Write-Host "Protected Endpoint (No Auth): Tested" -ForegroundColor Gray
if ($global:authToken) {
    Write-Host "Protected Endpoint (With Auth): Tested" -ForegroundColor Gray
} else {
    Write-Host "Protected Endpoint (With Auth): Skipped (No Token)" -ForegroundColor Yellow
}
Write-Host "Token Validation: Tested" -ForegroundColor Gray
Write-Host "Rate Limiting: Tested" -ForegroundColor Gray
Write-Host "CORS Headers: Tested" -ForegroundColor Gray

Write-Host "`nTesting completed!" -ForegroundColor Green
Write-Host "Review the output above for any issues or security concerns." -ForegroundColor Gray

# Export useful commands for manual testing
Write-Host "`n============== MANUAL TEST COMMANDS ==============" -ForegroundColor Blue

Write-Host "`n# Test health endpoint:" -ForegroundColor Gray
Write-Host "Invoke-RestMethod -Uri '$ApiBase/health' -Method GET" -ForegroundColor White

Write-Host "`n# Test login with valid credentials:" -ForegroundColor Gray
Write-Host "`$credentials = @{ email = 'admin@brandondocumentation.com'; password = 'admin123' }" -ForegroundColor White
Write-Host "Invoke-RestMethod -Uri '$ApiBase/auth/login' -Method POST -Body (`$credentials | ConvertTo-Json) -ContentType 'application/json'" -ForegroundColor White

Write-Host "`n# Test login with invalid credentials:" -ForegroundColor Gray
Write-Host "`$invalidCreds = @{ email = 'invalid@test.com'; password = 'wrongpassword' }" -ForegroundColor White
Write-Host "Invoke-RestMethod -Uri '$ApiBase/auth/login' -Method POST -Body (`$invalidCreds | ConvertTo-Json) -ContentType 'application/json'" -ForegroundColor White

if ($global:authToken) {
    Write-Host "`n# Test protected endpoint with token:" -ForegroundColor Gray
    Write-Host "`$token = '$global:authToken'" -ForegroundColor White
    Write-Host "`$headers = @{ 'Authorization' = 'Bearer `$token' }" -ForegroundColor White
    Write-Host "Invoke-RestMethod -Uri '$ApiBase/portfolios' -Method GET -Headers `$headers" -ForegroundColor White
}

Write-Host "`n# Test CORS preflight:" -ForegroundColor Gray
Write-Host "`$corsHeaders = @{ 'Access-Control-Request-Method' = 'GET'; 'Origin' = 'http://localhost:1313' }" -ForegroundColor White
Write-Host "Invoke-WebRequest -Uri '$ApiBase/health' -Method OPTIONS -Headers `$corsHeaders" -ForegroundColor White