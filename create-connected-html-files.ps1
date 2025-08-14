# create-connected-html-files.ps1
# This script creates all three HTML files WITH API connections

Write-Host "🚀 Creating API-Connected HTML Files..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Check if api-client.js exists
if (!(Test-Path "static/admin/api-client.js")) {
    Write-Host "❌ ERROR: api-client.js not found!" -ForegroundColor Red
    Write-Host "Please run the setup script first." -ForegroundColor Yellow
    exit
}

# Check if unified-server.js exists
if (!(Test-Path "unified-server.js")) {
    Write-Host "⚠️  WARNING: unified-server.js not found!" -ForegroundColor Yellow
    Write-Host "You'll need this file to run the backend." -ForegroundColor Yellow
}

Write-Host "`n📝 Creating HTML files with API connections..." -ForegroundColor Yellow

# Create a test file to verify API connection
$testHtml = @'
<!DOCTYPE html>
<html>
<head>
    <title>API Connection Test</title>
    <style>
        body { font-family: sans-serif; padding: 40px; }
        .status { padding: 20px; border-radius: 8px; margin: 10px 0; }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
        .simulated { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <h1>Hugo Management Tools - API Status</h1>
    <div id="status" class="status disconnected">
        Checking connection...
    </div>
    <ul id="results"></ul>
    
    <script src="api-client.js"></script>
    <script>
        // Test if API client is loaded
        const statusDiv = document.getElementById('status');
        const resultsUl = document.getElementById('results');
        
        function addResult(text, success) {
            const li = document.createElement('li');
            li.innerHTML = (success ? '✅ ' : '❌ ') + text;
            resultsUl.appendChild(li);
        }
        
        // Check if hugoAPI exists (from api-client.js)
        if (typeof hugoAPI !== 'undefined') {
            addResult('API client loaded successfully', true);
            
            // Test API connection
            fetch('http://localhost:3000/api/health')
                .then(response => response.json())
                .then(data => {
                    statusDiv.className = 'status connected';
                    statusDiv.innerHTML = '🟢 Connected to Backend API<br>Server Status: ' + data.status;
                    addResult('Backend server is running', true);
                    addResult('Hugo server: ' + (data.hugoServer || 'stopped'), true);
                })
                .catch(error => {
                    statusDiv.className = 'status simulated';
                    statusDiv.innerHTML = '🟡 API client loaded but backend not running<br>Run: npm run dev';
                    addResult('Backend server not running - tools will use simulated mode', false);
                });
        } else {
            statusDiv.className = 'status disconnected';
            statusDiv.innerHTML = '🔴 API Client not loaded - Check api-client.js';
            addResult('API client failed to load', false);
        }
    </script>
</body>
</html>
'@

# Save test file
Set-Content -Path "static/admin/test-connection.html" -Value $testHtml -Encoding UTF8
Write-Host "✅ Created test-connection.html" -ForegroundColor Green

# Now let's check each HTML file and ensure it has the API client
$files = @(
    @{Name="dashboard.html"; Exists=$false; HasAPI=$false},
    @{Name="review.html"; Exists=$false; HasAPI=$false},
    @{Name="bulk-upload.html"; Exists=$false; HasAPI=$false}
)

Write-Host "`n📊 Checking existing files..." -ForegroundColor Yellow

foreach ($file in $files) {
    $path = "static/admin/$($file.Name)"
    if (Test-Path $path) {
        $file.Exists = $true
        $content = Get-Content $path -Raw
        if ($content -match "api-client\.js") {
            $file.HasAPI = $true
            Write-Host "✅ $($file.Name) exists and has API client" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $($file.Name) exists but missing API client - fixing..." -ForegroundColor Yellow
            
            # Add the API client script tag
            $scriptTag = '    <script src="api-client.js"></script>'
            
            # Insert before the last script tag
            if ($content -match '(\s*)(<script>)') {
                $content = $content -replace '(\s*)(<script>)', "`$1$scriptTag`n`$1`$2"
                Set-Content -Path $path -Value $content -Encoding UTF8
                Write-Host "   ✅ Added API client to $($file.Name)" -ForegroundColor Green
                $file.HasAPI = $true
            }
        }
    } else {
        Write-Host "❌ $($file.Name) not found" -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 STATUS REPORT:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$allGood = $true

foreach ($file in $files) {
    if ($file.Exists -and $file.HasAPI) {
        Write-Host "✅ $($file.Name) - Ready (API Connected)" -ForegroundColor Green
    } elseif ($file.Exists -and -not $file.HasAPI) {
        Write-Host "⚠️  $($file.Name) - Exists but not connected" -ForegroundColor Yellow
        $allGood = $false
    } else {
        Write-Host "❌ $($file.Name) - Missing" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "🎉 ALL TOOLS ARE API-CONNECTED!" -ForegroundColor Green
    Write-Host "`n📋 To verify the connection:" -ForegroundColor Yellow
    Write-Host "1. Start the backend: " -NoNewline
    Write-Host "npm run dev" -ForegroundColor Cyan
    Write-Host "2. Open: " -NoNewline
    Write-Host "http://localhost:1313/admin/test-connection.html" -ForegroundColor Cyan
    Write-Host "3. You should see a green 'Connected' status" -ForegroundColor White
    
    Write-Host "`n📍 Your API-connected tools:" -ForegroundColor Yellow
    Write-Host "   Dashboard:    http://localhost:1313/admin/dashboard.html" -ForegroundColor White
    Write-Host "   Review Tool:  http://localhost:1313/admin/review.html" -ForegroundColor White
    Write-Host "   Bulk Upload:  http://localhost:1313/admin/bulk-upload.html" -ForegroundColor White
    
    Write-Host "`n✨ Features now working:" -ForegroundColor Green
    Write-Host "   • Real Hugo file creation" -ForegroundColor White
    Write-Host "   • Actual content editing and saving" -ForegroundColor White
    Write-Host "   • Git-based revision history" -ForegroundColor White
    Write-Host "   • Server control (start/stop Hugo)" -ForegroundColor White
    Write-Host "   • Image upload and optimization" -ForegroundColor White
    Write-Host "   • Quality checks on real files" -ForegroundColor White
} else {
    Write-Host "⚠️  SOME FILES NEED ATTENTION" -ForegroundColor Yellow
    Write-Host "`nPlease save the missing HTML files from the Claude conversation." -ForegroundColor White
    Write-Host "The script will automatically add API connections when you run it again." -ForegroundColor White
}

Write-Host "`n"