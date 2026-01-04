# EmailJS HTML Templates

This directory contains HTML email templates for use with EmailJS.

## Templates

### 1. `verification-email.html`
**Purpose:** Email verification code for new user registrations

**Required Variables:**
- `{{to_email}}` - Recipient email address
- `{{to_name}}` - Recipient name
- `{{verification_code}}` - 6-digit verification code
- `{{app_name}}` - Application name (defaults to "CoachaPro")
- `{{app_url}}` - Application URL

**How to use in EmailJS:**
1. Go to EmailJS Dashboard > Email Templates
2. Click "Create New Template"
3. Name it "Verification Email" or similar
4. Copy the HTML from `verification-email.html`
5. Paste it into the template editor
6. Make sure the variables match exactly: `{{to_email}}`, `{{to_name}}`, `{{verification_code}}`, `{{app_name}}`, `{{app_url}}`
7. Save the template and note the Template ID
8. Add the Template ID to your `.env.local` as `EMAILJS_VERIFICATION_TEMPLATE_ID`

---

### 2. `admin-notification.html`
**Purpose:** Admin notifications for subscription events and system alerts

**Required Variables:**
- `{{to_email}}` - Admin email address
- `{{subject}}` - Email subject line
- `{{message}}` - Notification message content
- `{{trainer_email}}` - Related trainer's email address

**How to use in EmailJS:**
1. Go to EmailJS Dashboard > Email Templates
2. Click "Create New Template"
3. Name it "Admin Notification" or similar
4. Copy the HTML from `admin-notification.html`
5. Paste it into the template editor
6. Make sure the variables match exactly: `{{to_email}}`, `{{subject}}`, `{{message}}`, `{{trainer_email}}`
7. Save the template and note the Template ID
8. Add the Template ID to your `.env.local` as `EMAILJS_NOTIFICATION_TEMPLATE_ID`

---

### 3. `message-notification.html`
**Purpose:** Email notifications for new messages between trainers and clients

**Required Variables:**
- `{{to_email}}` - Recipient email address
- `{{to_name}}` - Recipient name
- `{{sender_name}}` - Name of the person who sent the message
- `{{sender_role}}` - Role of sender ("Your Trainer" or "Your Client")
- `{{message_preview}}` - Preview of the message (truncated to 200 chars)
- `{{chat_url}}` - URL to view the conversation
- `{{app_name}}` - Application name (defaults to "CoachaPro")

**How to use in EmailJS:**
1. Go to EmailJS Dashboard > Email Templates
2. Click "Create New Template"
3. Name it "Message Notification" or similar
4. Copy the HTML from `message-notification.html`
5. Paste it into the template editor
6. Make sure the variables match exactly: `{{to_email}}`, `{{to_name}}`, `{{sender_name}}`, `{{sender_role}}`, `{{message_preview}}`, `{{chat_url}}`, `{{app_name}}`
7. Set the "To Email" field to `{{to_email}}`
8. Set the "Subject" field to something like: `New message from {{sender_role}} - {{app_name}}`
9. Save the template and note the Template ID
10. Add the Template ID to your `.env.local` as `EMAILJS_MESSAGE_TEMPLATE_ID`

**Note:** This template works for both trainer-to-client and client-to-trainer notifications. The `{{sender_role}}` variable will automatically show "Your Trainer" or "Your Client" depending on who sent the message.

---

## Design Features

Both templates include:
- ✅ Responsive design (works on mobile and desktop)
- ✅ Modern gradient headers
- ✅ Clean, professional styling
- ✅ Dark mode friendly colors
- ✅ Proper email client compatibility
- ✅ Accessible HTML structure

## Testing

After setting up your templates in EmailJS:
1. Use the "Test" feature in EmailJS to send a test email
2. Verify all variables are being replaced correctly
3. Check the email in different email clients (Gmail, Outlook, etc.)

## Customization

Feel free to customize:
- Colors (update the gradient backgrounds and accent colors)
- Fonts (currently using system fonts for best compatibility)
- Spacing and padding
- Logo/branding elements

