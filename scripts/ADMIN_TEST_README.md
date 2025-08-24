# Admin Panel Test Script

This directory contains comprehensive testing scripts for the admin panel authentication and configuration.

## 📋 Available Scripts

### `test-admin-panel.js`
Comprehensive Node.js test script that validates:
- ✅ Supabase connection and credentials
- ✅ Authentication with brandon.lambert87@gmail.com
- ✅ Admin panel JavaScript files integrity
- ✅ Configuration validation
- ✅ Network connectivity
- ✅ Database schema validation
- ✅ Environment detection

### `test-admin-panel.ps1`
PowerShell wrapper script for easy execution on Windows.

## 🚀 Quick Start

### Method 1: PowerShell (Windows - Recommended)
```powershell
# Navigate to project root
cd C:\Users\brand\Development\Project_Workspace\portfolio_site

# Run the test (will prompt for password)
.\scripts\test-admin-panel.ps1

# Run with password parameter
.\scripts\test-admin-panel.ps1 -Password "your_password"

# Get help
.\scripts\test-admin-panel.ps1 -Help
```

### Method 2: Node.js (Cross-platform)
```bash
# Navigate to scripts directory
cd scripts

# Install dependencies
npm install

# Run the test
node test-admin-panel.js

# Or use npm script
npm run test:admin-panel
```

### Method 3: Environment Variable
```powershell
# Set password as environment variable
$env:ADMIN_PASSWORD = "your_password"

# Run test
.\scripts\test-admin-panel.ps1
```

## 🔧 Configuration

### Supabase Credentials
The script uses these pre-configured credentials:
- **URL**: `https://tdmzayzkqyegvfgxlolj.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM`

### Test Email
- **Email**: `brandon.lambert87@gmail.com`

## 📊 Test Results

The script provides:
- ✅ **Pass/Fail status** for each test
- ⏱️ **Execution time** for performance monitoring
- 💡 **Specific solutions** for failed tests
- 📈 **Success rate** calculation
- 🔧 **Actionable recommendations**

## 🐛 Common Issues & Solutions

### 1. Authentication Failures
```
Problem: "Invalid login credentials"
Solution: Verify password is correct, check Supabase Auth settings
```

### 2. Missing Files
```
Problem: "Admin directory not found"
Solution: Ensure admin panel files are in public/admin/ directory
```

### 3. Network Issues
```
Problem: "Connection failed"
Solution: Check internet connectivity, verify Supabase URL
```

### 4. Database Schema
```
Problem: "Profiles table missing"
Solution: Run database migrations or create profiles table
```

## 📁 Expected File Structure

The test expects these files to exist:
```
public/admin/
├── index.html
├── login.html
├── dashboard.html
└── js/
    ├── auth-manager.js
    ├── config.js
    ├── api-config.js
    └── utils.js
```

## 🔍 Environment Detection

The script automatically detects:
- **Local development** (localhost)
- **Netlify deployment** (via environment variables)
- **Production settings**
- **Available services** (backend, frontend)

## 📝 Example Output

```
🧪 ADMIN PANEL COMPREHENSIVE TEST SUITE
==========================================
🎯 Target Email: brandon.lambert87@gmail.com
🔗 Supabase URL: https://tdmzayzkqyegvfgxlolj.supabase.co
📅 Timestamp: 2025-08-24T12:00:00.000Z

✅ Supabase Connection - PASS (250ms)
✅ Authentication Test - PASS (1200ms)
✅ Configuration Validation - PASS (150ms)
✅ JavaScript Loading - PASS (200ms)
✅ Network Connectivity - PASS (800ms)
✅ Environment Detection - PASS (50ms)
✅ Database Schema - PASS (400ms)

📊 COMPREHENSIVE TEST RESULTS
==============================
Total Tests: 7
✅ Passed: 7
❌ Failed: 0
⚠️ Warnings: 0
📈 Success Rate: 100.0%
⏱️ Total Duration: 3050ms

🏁 Test Suite Complete!
```

## 🛠️ Development

### Adding New Tests
1. Add test function to `test-admin-panel.js`
2. Call it from `runAllTests()`
3. Follow the existing pattern for error handling and reporting

### Modifying Configuration
Edit the `CONFIG` object in `test-admin-panel.js`:
```javascript
const CONFIG = {
    SUPABASE_URL: 'your-supabase-url',
    SUPABASE_ANON_KEY: 'your-anon-key',
    TEST_EMAIL: 'your-test-email'
};
```

## 🔗 Related Scripts

- `test-supabase.js` - Basic Supabase connectivity testing
- `test-admin-login.js` - Simple authentication testing
- `setup-supabase.js` - Database setup and configuration

## 📞 Support

If tests continue to fail:
1. Check the detailed error messages and solutions
2. Verify all prerequisites are met
3. Check network connectivity and firewall settings
4. Review Supabase dashboard for any service issues