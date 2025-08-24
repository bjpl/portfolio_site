# Netlify Environment Variables Setup Guide

## Quick Access
**Direct Link to Environment Variables:** 
`https://app.netlify.com/sites/[YOUR-SITE-NAME]/configuration/env`

Replace `[YOUR-SITE-NAME]` with your actual Netlify site name.

---

## Step-by-Step Instructions

### Step 1: Access Netlify Dashboard
1. Log in to your Netlify account at https://app.netlify.com
2. Select your portfolio site from the dashboard
3. Click on **"Site configuration"** in the left sidebar
4. Click on **"Environment variables"** under the Site configuration menu

### Step 2: Add Environment Variables
Click the **"Add a variable"** button and add each of the following variables exactly as shown:

#### Variable 1: Supabase URL
- **Key:** `SUPABASE_URL`
- **Value:** 
```
https://tdmzayzkqyegvfgxlolj.supabase.co
```
- **Scopes:** Select all (Production, Preview, Deploy Previews, Local development)

#### Variable 2: Supabase Anonymous Key
- **Key:** `SUPABASE_ANON_KEY`
- **Value:** 
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM
```
- **Scopes:** Select all

#### Variable 3: Supabase Service Key
- **Key:** `SUPABASE_SERVICE_KEY`
- **Value:** 
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E
```
- **Scopes:** Select all
- **⚠️ Security Note:** This is a sensitive key. Ensure it's only used in server-side/edge functions.

#### Variable 4: Admin Email
- **Key:** `ADMIN_EMAIL`
- **Value:** 
```
brandon.lambert87@gmail.com
```
- **Scopes:** Select all

### Step 3: Save Variables
After adding each variable:
1. Click **"Create variable"** for each entry
2. Verify all 4 variables are listed in the environment variables table

### Step 4: Trigger a Rebuild
After adding all environment variables, you need to trigger a new deployment:

#### Option A: Via Netlify Dashboard
1. Go to the **"Deploys"** tab in your site dashboard
2. Click **"Trigger deploy"** dropdown
3. Select **"Clear cache and deploy site"**

#### Option B: Via Git Push
Simply push any commit to your connected repository:
```bash
git add .
git commit -m "Trigger rebuild with environment variables"
git push
```

#### Option C: Via Netlify CLI
If you have Netlify CLI installed:
```bash
netlify deploy --prod
```

---

## Verification Checklist

After deployment completes, verify your environment variables are working:

- [ ] All 4 environment variables are visible in Netlify's Environment Variables page
- [ ] Site has been redeployed after adding variables
- [ ] Edge functions can access these variables via `Netlify.env.get()`
- [ ] Contact form submissions are working
- [ ] Admin authentication is functioning

---

## Troubleshooting

### Variables Not Working?
1. Ensure you triggered a new deployment after adding variables
2. Check that variable names match exactly (case-sensitive)
3. Verify no extra spaces in values
4. Confirm scopes include "Production"

### Edge Functions Not Accessing Variables?
Edge functions access environment variables differently:
```javascript
// Correct way in edge functions
const supabaseUrl = Netlify.env.get("SUPABASE_URL");

// NOT like this
const supabaseUrl = process.env.SUPABASE_URL;
```

### Need to Update a Variable?
1. Click on the variable in the list
2. Click "Edit variable"
3. Update the value
4. Save and trigger a new deployment

---

## Security Best Practices

1. **Never commit these values to your repository**
2. **Keep the service key secure** - it has admin privileges
3. **Use the anon key for client-side code**
4. **Use the service key only in edge functions/server-side code**
5. **Regularly rotate keys if compromised**

---

## Quick Copy Block

For easy copy-paste, here are all variables in one block:

```
SUPABASE_URL=https://tdmzayzkqyegvfgxlolj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E
ADMIN_EMAIL=brandon.lambert87@gmail.com
```

---

## Additional Resources

- [Netlify Environment Variables Documentation](https://docs.netlify.com/environment-variables/overview/)
- [Netlify Edge Functions Environment Variables](https://docs.netlify.com/edge-functions/api/#netlify.env)
- [Supabase Documentation](https://supabase.com/docs)