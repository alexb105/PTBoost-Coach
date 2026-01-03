# EmailJS Template Setup Guide

## Issue: Template Variables Not Replacing

If your emails are being sent but the content is blank (showing `{{variable}}` instead of actual values), the template variables aren't properly configured in EmailJS.

## How to Fix

### Step 1: Configure Template Settings in EmailJS

1. Go to **EmailJS Dashboard** → **Email Templates**
2. Open your template (e.g., `template_xxxxx` for verification or your admin notification template)
3. Go to the **"Content"** tab
4. Click **"Edit Content"** (pencil icon)

### Step 2: Configure Email Sending Fields (Right Sidebar)

In the right sidebar, you need to configure:

**For Verification Email Template:**
- **To Email:** `{{to_email}}`
- **From Name:** (leave empty or set to "CoachaPro")
- **From Email:** Use default (your Gmail address)
- **Reply To:** (optional)
- **Subject:** `Verify your CoachaPro account` (or use `{{subject}}` if you want dynamic subjects)

**For Admin Notification Template:**
- **To Email:** `{{to_email}}`
- **From Name:** (leave empty or set to "CoachaPro")
- **From Email:** Use default (your Gmail address)
- **Reply To:** (optional)
- **Subject:** `{{subject}}`

### Step 3: Verify Template Variables in HTML

Make sure your HTML template uses these exact variable names:

**Verification Email Variables:**
- `{{to_email}}` - Recipient email
- `{{to_name}}` - Recipient name
- `{{verification_code}}` - 6-digit code
- `{{app_name}}` - App name (defaults to "CoachaPro")
- `{{app_url}}` - App URL

**Admin Notification Variables:**
- `{{to_email}}` - Admin email
- `{{subject}}` - Email subject
- `{{message}}` - Notification message
- `{{trainer_email}}` - Related trainer's email

### Step 4: Test the Template

1. Click **"Test It"** button in EmailJS
2. Fill in test values for all variables
3. Send a test email to yourself
4. Verify all variables are replaced correctly

## Common Issues

### Variables showing as `{{variable}}` in email
- **Cause:** Variables not configured in template settings
- **Fix:** Make sure "To Email" field uses `{{to_email}}` and all variables are defined

### Email sent but content is blank
- **Cause:** Template variables don't match parameter names being sent
- **Fix:** Verify variable names in HTML match exactly what's sent in code:
  - Code sends: `to_email`, `subject`, `message`, `trainer_email`
  - Template must use: `{{to_email}}`, `{{subject}}`, `{{message}}`, `{{trainer_email}}`

### Email not being sent at all
- **Cause:** Gmail service not properly authenticated
- **Fix:** Reconnect Gmail service with proper permissions (especially "Send email on your behalf")

## Quick Checklist

- [ ] Template HTML uses correct variable names (e.g., `{{to_email}}`, not `{{toEmail}}`)
- [ ] "To Email" field in template settings is set to `{{to_email}}`
- [ ] All required variables are defined in the template
- [ ] Gmail service is properly connected and authenticated
- [ ] Template ID matches what's in `.env.local`
- [ ] Test email works with all variables populated

## Testing

After configuring, test by:
1. Using "Test It" in EmailJS dashboard
2. Registering a new user (for verification email)
3. Triggering a subscription event (for admin notification)

Check server logs for detailed error messages if emails still don't work.


