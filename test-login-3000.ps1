$body = @{
    email = "admin@portfolio.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Token received: $($response.token.Substring(0, 20))..."
    Write-Host "User: $($response.user.email)"
} catch {
    Write-Host "Login failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}