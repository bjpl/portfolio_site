$body = @{
    email = "admin@portfolio.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Token: $($response.token)"
} catch {
    Write-Host "Login failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}