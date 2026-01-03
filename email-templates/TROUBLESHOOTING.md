# EmailJS Template Variables Not Replacing - Troubleshooting

## Your Current Setup ✅

**Template HTML:** Correct - has all required variables
- `{{subject}}` ✅
- `{{message}}` ✅
- `{{trainer_email}}` ✅
- `{{to_email}}` ✅

**Code:** Correct - sending all required parameters
- `to_email` ✅
- `subject` ✅
- `message` ✅
- `trainer_email` ✅

**Template ID:** `template_x000ni8` ✅

## Why Variables Might Not Be Replacing

### Issue 1: EmailJS Template Settings Not Configured

In EmailJS, you need to configure the template settings properly:

1. **Go to your template** (`template_x000ni8`)
2. **Check the right sidebar** - "To Email" field:
   - ✅ Should be: `{{to_email}}`
   - ❌ NOT: empty or a static email
3. **Subject field** (top of template):
   - ✅ Should be: `{{subject}}`
   - ❌ NOT: "Coachapro OTP Authentication" or static text

### Issue 2: Variables Not "Registered" in EmailJS

EmailJS sometimes requires variables to be "discovered" from the template:

1. **Click "Edit Content"** in your template
2. **Make sure the HTML is saved** with all `{{variable}}` syntax
3. **Save the template**
4. **EmailJS should auto-detect** the variables from your HTML

### Issue 3: Test the Template First

Before using it in production, test it in EmailJS:

1. **Click "Test It"** button in EmailJS
2. **Fill in test values:**
   ```
   to_email: your-email@gmail.com
   subject: Test Notification
   message: This is a test message to verify variables work
   trainer_email: test@example.com
   ```
3. **Send test email**
4. **Check if variables are replaced** in the received email

If test email works but production doesn't → Check server logs for what's being sent

### Issue 4: Check Server Logs

When an admin notification is triggered, check your Next.js server console. You should see:

```
📧 EmailJS send attempt: {
  serviceId: 'service_x806zkc',
  templateId: 'template_x000ni8',
  params: {
    to_email: '...',
    subject: '...',
    message: '...',
    trainer_email: '...'
  }
}
```

If you see this log, the code is working. The issue is in EmailJS.

## Step-by-Step Fix

### Step 1: Verify Template Settings

1. Open template `template_x000ni8` in EmailJS
2. **Content Tab:**
   - Subject field: Should be `{{subject}}` (not static text)
   - HTML content: Your current HTML is correct ✅
3. **Right Sidebar:**
   - **To Email:** Must be `{{to_email}}` (not empty, not static)
   - **From Name:** Can be "CoachaPro" or empty
   - **From Email:** Use default (checked)
4. **Save the template**

### Step 2: Test in EmailJS

1. Click **"Test It"** button
2. Fill in all variables with test values
3. Send test email to yourself
4. **If test email shows variables as `{{variable}}`** → Template not configured correctly
5. **If test email works** → Issue is in how code calls EmailJS

### Step 3: Verify Environment Variables

Check your `.env.local`:
```bash
EMAILJS_PUBLIC_KEY=...
EMAILJS_PRIVATE_KEY=...
EMAILJS_SERVICE_ID=service_x806zkc
EMAILJS_NOTIFICATION_TEMPLATE_ID=template_x000ni8
```

### Step 4: Check Gmail Service

Make sure your Gmail service is properly connected:
1. Go to **Email Services** → Edit your Gmail service
2. Should show: "Connected as info.coachapro@gmail.com"
3. **No 412 errors** when testing

## Quick Diagnostic

Run this in your terminal to see what's being sent:

```bash
# Check server logs when triggering an admin notification
# Look for: "📧 EmailJS send attempt:"
```

## Most Common Fix

**90% of the time, the issue is:**

1. **Subject field** in EmailJS template is set to static text instead of `{{subject}}`
2. **"To Email" field** in right sidebar is empty or static instead of `{{to_email}}`

**Fix:**
- Change Subject to: `{{subject}}`
- Change "To Email" to: `{{to_email}}`
- Save template
- Test again

## Still Not Working?

If variables still don't replace after all this:

1. **Create a new template** from scratch
2. **Copy your HTML** into it
3. **Set Subject to `{{subject}}`**
4. **Set "To Email" to `{{to_email}}`**
5. **Save and get new Template ID**
6. **Update `.env.local`** with new Template ID
7. **Test again**

Sometimes EmailJS templates get "stuck" and creating a fresh one fixes it.

