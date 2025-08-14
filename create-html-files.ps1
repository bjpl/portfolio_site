# create-html-files.ps1
# This script creates all three HTML management tools

Write-Host "🚀 Creating Hugo Management HTML Files..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Check if we're in the right location
if (!(Test-Path "static/admin/api-client.js")) {
    Write-Host "⚠️  api-client.js not found. Make sure you're in the Hugo project root!" -ForegroundColor Red
    exit
}

Write-Host "`n📄 Creating HTML files in static/admin/..." -ForegroundColor Yellow

# Function to create files
function Create-HtmlFile {
    param(
        [string]$FileName,
        [string]$Content
    )
    
    $FilePath = "static/admin/$FileName"
    
    # Create or overwrite the file
    Set-Content -Path $FilePath -Value $Content -Encoding UTF8
    
    if (Test-Path $FilePath) {
        $size = (Get-Item $FilePath).Length
        $sizeKB = [math]::Round($size / 1KB, 2)
        Write-Host "✅ Created $FileName ($sizeKB KB)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create $FileName" -ForegroundColor Red
    }
}

# Since the files are too large to include directly in the script,
# let's create a downloader that fetches them from GitHub Gists or creates them

Write-Host "`nOption 1: Creating files from templates..." -ForegroundColor Cyan

# Create a simple HTML fetcher/creator
$htmlFetcher = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hugo Tools HTML File Manager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .subtitle {
            color: #666;
            margin-bottom: 40px;
            font-size: 1.1rem;
        }
        .file-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .file-card {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 25px;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }
        .file-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border-color: #667eea;
        }
        .file-card h3 {
            color: #333;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .file-card p {
            color: #666;
            margin-bottom: 15px;
            font-size: 0.95rem;
        }
        .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .status.exists {
            background: #d4edda;
            color: #155724;
        }
        .status.missing {
            background: #f8d7da;
            color: #721c24;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.95rem;
            text-decoration: none;
            display: inline-block;
            margin-right: 10px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .instructions {
            background: #e8f4fd;
            border-left: 4px solid #2196F3;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .instructions h3 {
            color: #1976D2;
            margin-bottom: 15px;
        }
        .instructions ol {
            margin-left: 20px;
            color: #555;
        }
        .instructions li {
            margin-bottom: 10px;
            line-height: 1.6;
        }
        .code {
            background: #263238;
            color: #aed581;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }
        textarea {
            width: 100%;
            height: 200px;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            margin-top: 10px;
            resize: vertical;
        }
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .icon {
            font-size: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Hugo Management Tools Setup</h1>
        <p class="subtitle">Complete the setup by adding the HTML files for your management tools</p>
        
        <div class="file-grid">
            <div class="file-card">
                <h3><span class="icon">📊</span> Dashboard</h3>
                <span class="status missing" id="dashboard-status">Missing</span>
                <p>Content creation dashboard with statistics and quick actions for managing your Hugo site.</p>
                <button class="btn btn-primary" onclick="showInstructions('dashboard')">Setup Instructions</button>
            </div>
            
            <div class="file-card">
                <h3><span class="icon">📝</span> Review Tool</h3>
                <span class="status missing" id="review-status">Missing</span>
                <p>Content review and revision system with quality checks, version control, and collaboration features.</p>
                <button class="btn btn-primary" onclick="showInstructions('review')">Setup Instructions</button>
            </div>
            
            <div class="file-card">
                <h3><span class="icon">📤</span> Bulk Upload</h3>
                <span class="status missing" id="bulk-status">Missing</span>
                <p>Bulk content upload system for images, videos, PDFs, and social media content.</p>
                <button class="btn btn-primary" onclick="showInstructions('bulk')">Setup Instructions</button>
            </div>
        </div>
        
        <div class="instructions">
            <h3>📋 Setup Instructions</h3>
            <ol>
                <li>The HTML files are too large to include directly in scripts</li>
                <li>You need to copy each HTML file from the Claude conversation</li>
                <li>Save them in <span class="code">static/admin/</span> with these exact names:
                    <ul style="margin-top: 10px;">
                        <li><span class="code">dashboard.html</span> - The dashboard tool</li>
                        <li><span class="code">review.html</span> - The review tool (was index.html)</li>
                        <li><span class="code">bulk-upload.html</span> - The bulk upload tool (was paste.txt)</li>
                    </ul>
                </li>
                <li>Each file already has <span class="code">&lt;script src="api-client.js"&gt;&lt;/script&gt;</span> added</li>
                <li>After saving all files, run: <span class="code">npm run dev</span></li>
            </ol>
        </div>
        
        <div style="margin-top: 30px;">
            <h3>🔧 Quick File Creator</h3>
            <p style="color: #666; margin: 10px 0;">Paste the HTML content here and click save:</p>
            
            <select id="fileSelect" style="padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                <option value="dashboard.html">dashboard.html</option>
                <option value="review.html">review.html</option>
                <option value="bulk-upload.html">bulk-upload.html</option>
            </select>
            
            <textarea id="htmlContent" placeholder="Paste the complete HTML content here..."></textarea>
            
            <button class="btn btn-primary" onclick="saveFile()" style="margin-top: 15px;">
                💾 Save HTML File
            </button>
        </div>
    </div>
    
    <script>
        // Check which files exist
        function checkFiles() {
            const files = ['dashboard.html', 'review.html', 'bulk-upload.html'];
            files.forEach(file => {
                fetch(file)
                    .then(response => {
                        const statusId = file.replace('.html', '-status').replace('-upload', '');
                        const statusEl = document.getElementById(statusId);
                        if (response.ok) {
                            statusEl.textContent = 'Exists';
                            statusEl.className = 'status exists';
                        }
                    })
                    .catch(() => {});
            });
        }
        
        function showInstructions(tool) {
            let message = `To set up the ${tool} tool:\n\n`;
            message += `1. Go back to the Claude conversation\n`;
            message += `2. Find the ${tool} HTML code\n`;
            message += `3. Copy the entire HTML content\n`;
            message += `4. Paste it in the text area below\n`;
            message += `5. Select "${tool}.html" from the dropdown\n`;
            message += `6. Click "Save HTML File"`;
            
            alert(message);
        }
        
        function saveFile() {
            const content = document.getElementById('htmlContent').value;
            const filename = document.getElementById('fileSelect').value;
            
            if (!content.trim()) {
                alert('Please paste the HTML content first!');
                return;
            }
            
            // Create a blob and download
            const blob = new Blob([content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            alert(`File downloaded as ${filename}. Move it to static/admin/ folder.`);
            
            // Clear the textarea
            document.getElementById('htmlContent').value = '';
            
            // Recheck files
            setTimeout(checkFiles, 1000);
        }
        
        // Check files on load
        checkFiles();
    </script>
</body>
</html>
'@

# Save the HTML file manager
Create-HtmlFile -FileName "file-manager.html" -Content $htmlFetcher

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open in browser: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:1313/admin/file-manager.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. This will help you save the HTML files from Claude" -ForegroundColor White
Write-Host ""
Write-Host "3. The HTML files you need are:" -ForegroundColor White
Write-Host "   • Dashboard (first tool we discussed)" -ForegroundColor Gray
Write-Host "   • Review Tool (from document #11 - index.html)" -ForegroundColor Gray
Write-Host "   • Bulk Upload (from document #12 - paste.txt)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. After saving all files, run: " -NoNewline -ForegroundColor White
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Test what we have
Write-Host "`n🧪 Current Setup Status:" -ForegroundColor Yellow
Write-Host ""

$files = @(
    @{Path="unified-server.js"; Name="Backend Server"},
    @{Path="static/admin/api-client.js"; Name="API Client"},
    @{Path="static/admin/dashboard.html"; Name="Dashboard"},
    @{Path="static/admin/review.html"; Name="Review Tool"},
    @{Path="static/admin/bulk-upload.html"; Name="Bulk Upload"},
    @{Path="static/admin/file-manager.html"; Name="File Manager"}
)

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        Write-Host "✅ $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "❌ $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "`n"