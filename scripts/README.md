# Portfolio Site Admin Scripts

This directory contains administrative scripts for managing the portfolio site infrastructure.

## 🧪 Testing Scripts

### `test-admin-panel.js` - **NEW**
Comprehensive admin panel testing and debugging script that:
- ✅ Tests Supabase connection and authentication 
- ✅ Validates admin panel JavaScript files
- ✅ Checks configuration and environment
- ✅ Provides detailed error reporting with solutions
- ✅ Tests authentication with brandon.lambert87@gmail.com

**Usage:**
```bash
# Node.js (cross-platform)
node test-admin-panel.js

# PowerShell (Windows)
.\test-admin-panel.ps1

# Batch file (Windows)
test-admin-panel.bat

# NPM script
npm run test:admin-panel
```

**Features:**
- 🔗 Supabase connection testing
- 🔐 Authentication verification with brandon.lambert87@gmail.com
- 📁 Admin panel file structure validation
- 🔧 JavaScript loading and syntax checks
- 🌐 Network connectivity testing
- 🗄️ Database schema validation
- 📊 Comprehensive reporting with solutions

### `test-supabase.js`
Basic Supabase connectivity and CRUD operations testing.

### `test-admin-login.js`
Simple admin authentication testing.

## 🔐 create-admin.js

Creates an admin user in Supabase with proper role assignment and profile setup.

### Features

- ✅ **Secure Password Validation**: Enforces strong password requirements
- ✅ **Email Format Validation**: Validates email format before creation
- ✅ **Duplicate User Handling**: Safely handles existing users with update option
- ✅ **Comprehensive Error Handling**: Detailed error messages and recovery options
- ✅ **Profile & Auth Sync**: Creates both auth user and profile table entry
- ✅ **Interactive Mode**: Prompts for missing parameters
- ✅ **Verification System**: Confirms successful creation
- ✅ **Colored Output**: Clear visual feedback with status indicators
- ✅ **Security Reminders**: Post-creation security best practices

### Usage

#### Method 1: Interactive Mode (Recommended)
```bash
node scripts/create-admin.js
```
The script will prompt you for email and password if not provided.

#### Method 2: Command Line Arguments
```bash
node scripts/create-admin.js admin@example.com SecurePassword123!
```

#### Method 3: Environment Variables
```bash
# Set in your .env or environment
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

node scripts/create-admin.js
```

### Prerequisites

1. **Node.js**: Version 16 or higher
2. **Supabase Project**: Active Supabase project
3. **Service Key**: Supabase service role key with admin privileges
4. **Network Access**: Connection to your Supabase project

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ | https://tdmzayzkqyegvfgxlolj.supabase.co |
| `SUPABASE_SERVICE_KEY` | Service role key with admin privileges | ✅ | Provided in script |

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

### What the Script Does

1. **Validates Input**: Checks email format and password strength
2. **Connects to Supabase**: Initializes admin client with service key
3. **Checks for Existing Users**: Prevents duplicate creation
4. **Creates Auth User**: Adds user to Supabase auth.users table
5. **Creates Profile**: Adds user to custom profiles table with admin role
6. **Sets Permissions**: Assigns admin role and permissions
7. **Verifies Creation**: Confirms successful setup
8. **Displays Results**: Shows login credentials and next steps

### Database Tables Modified

- `auth.users`: Supabase auth table (via Admin API)
- `profiles`: Custom profile table with role management

### Profile Data Structure

```javascript
{
  id: "uuid", // Matches auth.users.id
  email: "admin@example.com",
  username: "admin", 
  full_name: "Portfolio Administrator",
  role: "admin", // Critical for permissions
  bio: "System administrator for the portfolio site",
  is_active: true,
  metadata: {
    created_by: "admin-script",
    permissions: ["read", "write", "delete", "admin"],
    last_login: "2024-08-24T02:44:16.308Z"
  }
}
```

### Error Handling

The script handles various error scenarios:

- **Missing Environment Variables**: Clear guidance on required setup
- **Invalid Credentials**: Validation before attempting creation
- **Network Issues**: Timeout and connection error handling
- **Duplicate Users**: Option to update existing users to admin
- **Database Errors**: Detailed error messages with context
- **Partial Failures**: Guidance on manual recovery steps

### Security Features

- **Service Key Protection**: Uses environment variables for sensitive data
- **Input Validation**: Sanitizes and validates all user inputs
- **Secure Defaults**: Strong default password if none provided
- **Audit Trail**: Logs creation in user metadata
- **Role Verification**: Confirms admin role assignment

### Troubleshooting

#### Error: "Missing Supabase environment variables"
```bash
# Solution: Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
```

#### Error: "Invalid email format"
```bash
# Solution: Provide valid email
node scripts/create-admin.js admin@yourdomain.com
```

#### Error: "Password validation failed"
```bash
# Solution: Use strong password meeting requirements
# Example: SecurePassword123!
```

#### Error: "Failed to create auth user"
- Check service key permissions
- Verify Supabase URL is correct
- Ensure network connectivity
- Check Supabase project status

#### Error: "Failed to create profile"
- Verify profiles table exists
- Check RLS policies allow admin operations
- Ensure service key has proper permissions

### Testing the Script

```bash
# Test with default values
node scripts/create-admin.js

# Test with custom values
node scripts/create-admin.js test@example.com TestPassword123!

# Test error handling (invalid email)
node scripts/create-admin.js invalid-email

# Test existing user scenario
node scripts/create-admin.js admin@portfolio.local # Run twice
```

### Post-Creation Steps

1. **Login Test**: Verify login works with created credentials
2. **Password Change**: Update default password immediately  
3. **Profile Update**: Add additional profile information
4. **Security Setup**: Enable 2FA if available
5. **Backup Credentials**: Store credentials securely

### Integration with Portfolio Site

The created admin user can:

- Access `/admin` dashboard
- Manage blog posts and projects
- Upload and manage media files
- View analytics and contact messages
- Manage other user accounts
- Configure site settings

### Development vs Production

#### Development
```bash
# Use local Supabase instance
SUPABASE_URL=http://localhost:54321
node scripts/create-admin.js dev@localhost
```

#### Production
```bash
# Use production Supabase project  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-production-service-key
node scripts/create-admin.js admin@yourdomain.com
```

## Other Scripts

### setup-supabase.js
Initial Supabase project configuration and database setup.

### test-api-production.js  
Tests API endpoints against production environment.

### test-universal-config.js
Validates configuration across all environments.

## Contributing

When adding new admin scripts:

1. Follow the error handling patterns from `create-admin.js`
2. Include comprehensive logging and user feedback
3. Add environment variable validation
4. Include usage examples in comments
5. Update this README with new script documentation

## Security Notes

- Never commit service keys to version control
- Use environment variables for sensitive configuration  
- Regularly rotate service keys
- Monitor admin user access logs
- Implement IP restrictions where possible