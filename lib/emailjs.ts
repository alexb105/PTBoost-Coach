/**
 * EmailJS configuration and service
 * 
 * Required environment variables:
 * - EMAILJS_PUBLIC_KEY: Your EmailJS public key (from Account > General)
 * - EMAILJS_PRIVATE_KEY: Your EmailJS private key (from Account > Security)
 * - EMAILJS_SERVICE_ID: Your EmailJS service ID (e.g., service_cqx4anp)
 * - EMAILJS_VERIFICATION_TEMPLATE_ID: Template ID for verification emails
 * - EMAILJS_NOTIFICATION_TEMPLATE_ID: Template ID for admin notification emails
 * - EMAILJS_MESSAGE_TEMPLATE_ID: Template ID for message notification emails
 */

import emailjs from '@emailjs/nodejs'

// Initialize EmailJS with credentials
const initEmailJS = () => {
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  
  if (!publicKey || !privateKey) {
    console.warn('⚠️ EmailJS credentials not configured. Emails will be logged to console only.')
    return false
  }
  
  emailjs.init({
    publicKey,
    privateKey,
  })
  
  return true
}

interface VerificationEmailParams {
  to_email: string
  to_name: string
  verification_code: string
  app_name?: string
  app_url?: string
}

interface AdminNotificationParams {
  to_email: string
  subject: string
  message: string
  trainer_email: string
}

interface MessageNotificationParams {
  to_email: string
  to_name: string
  sender_name: string
  sender_role: string  // e.g., "Your Trainer" or "Your Client"
  message_preview: string
  chat_url: string
  app_name?: string
}

/**
 * Send a verification email with a 6-digit code
 */
export async function sendVerificationEmail({
  to_email,
  to_name,
  verification_code,
  app_name = 'CoachaPro',
  app_url = process.env.NEXT_PUBLIC_APP_URL || 'https://coachapro.com',
}: VerificationEmailParams): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_VERIFICATION_TEMPLATE_ID
  
  // Log email details for debugging
  console.log('📧 Sending verification email:', {
    to: to_email,
    name: to_name,
    code: verification_code,
  })
  
  if (!initEmailJS() || !serviceId || !templateId) {
    console.warn('⚠️ EmailJS not fully configured. Email logged but not sent.')
    console.log('Required env vars: EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, EMAILJS_SERVICE_ID, EMAILJS_VERIFICATION_TEMPLATE_ID')
    return false
  }
  
  try {
    const templateParams = {
      to_email,
      to_name: to_name || 'there',
      verification_code,
      app_name,
      app_url,
    }
    
    console.log('📧 EmailJS send attempt:', {
      serviceId,
      templateId,
      params: { ...templateParams, verification_code: '***' }, // Hide code in logs
    })
    
    const response = await emailjs.send(serviceId, templateId, templateParams)
    
    console.log('✅ Verification email sent successfully:', {
      status: response.status,
      statusText: response.text,
      response: response,
    })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send verification email:', {
      error: error,
      message: error?.message,
      status: error?.status,
      text: error?.text,
      details: error,
    })
    return false
  }
}

/**
 * Send an admin notification email
 */
export async function sendAdminNotificationEmail({
  to_email,
  subject,
  message,
  trainer_email,
}: AdminNotificationParams): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_NOTIFICATION_TEMPLATE_ID
  
  // Log email details for debugging
  console.log('📧 Sending admin notification:', {
    to: to_email,
    subject,
    message,
    trainerEmail: trainer_email,
  })
  
  // If notification template is not configured, just log and return (don't fail)
  if (!templateId || templateId === 'template_xxxxx') {
    console.warn('⚠️ Admin notification template not configured. Email logged but not sent.')
    console.log('To enable admin notifications, set EMAILJS_NOTIFICATION_TEMPLATE_ID in .env.local')
    return false
  }
  
  if (!initEmailJS() || !serviceId) {
    console.warn('⚠️ EmailJS not fully configured. Email logged but not sent.')
    console.log('Required env vars: EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, EMAILJS_SERVICE_ID')
    return false
  }
  
  try {
    const templateParams = {
      to_email,
      subject,
      message,
      trainer_email,
    }
    
    console.log('📧 EmailJS send attempt:', {
      serviceId,
      templateId,
      params: templateParams,
    })
    
    const response = await emailjs.send(serviceId, templateId, templateParams)
    
    console.log('✅ Admin notification email sent successfully:', {
      status: response.status,
      statusText: response.text,
      response: response,
    })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send admin notification email:', {
      error: error,
      message: error?.message,
      status: error?.status,
      text: error?.text,
      details: error,
    })
    return false
  }
}

/**
 * Send a message notification email (works for both trainer and client notifications)
 */
export async function sendMessageNotificationEmail({
  to_email,
  to_name,
  sender_name,
  sender_role,
  message_preview,
  chat_url,
  app_name = 'CoachaPro',
}: MessageNotificationParams): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_MESSAGE_TEMPLATE_ID
  
  // Truncate message preview if too long
  const truncatedPreview = message_preview.length > 200 
    ? message_preview.substring(0, 200) + '...' 
    : message_preview
  
  // Log email details for debugging
  console.log('📧 Sending message notification:', {
    to: to_email,
    toName: to_name,
    senderName: sender_name,
    senderRole: sender_role,
  })
  
  // If message template is not configured, just log and return (don't fail)
  if (!templateId || templateId === 'template_xxxxx') {
    console.warn('⚠️ Message notification template not configured. Email logged but not sent.')
    console.log('To enable message notifications, set EMAILJS_MESSAGE_TEMPLATE_ID in .env.local')
    return false
  }
  
  if (!initEmailJS() || !serviceId) {
    console.warn('⚠️ EmailJS not fully configured. Email logged but not sent.')
    console.log('Required env vars: EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, EMAILJS_SERVICE_ID')
    return false
  }
  
  const templateParams = {
    to_email,
    to_name: to_name || 'there',
    sender_name,
    sender_role,
    message_preview: truncatedPreview,
    chat_url,
    app_name,
  }
  
  console.log('📧 EmailJS send attempt:', {
    serviceId,
    templateId,
    params: { ...templateParams, message_preview: truncatedPreview.substring(0, 50) + '...' },
  })
  
  // Retry up to 2 times with timeout
  const maxRetries = 2
  const timeoutMs = 8000 // 8 second timeout per attempt
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`EmailJS timeout after ${timeoutMs}ms`)), timeoutMs)
      })
      
      // Race between the email send and timeout
      const response = await Promise.race([
        emailjs.send(serviceId, templateId, templateParams),
        timeoutPromise
      ])
      
      console.log('✅ Message notification email sent successfully:', {
        status: response.status,
        statusText: response.text,
        attempt,
      })
      return true
    } catch (error: any) {
      console.error(`❌ Failed to send message notification email (attempt ${attempt}/${maxRetries}):`, {
        error: error?.message || error,
        status: error?.status,
        text: error?.text,
      })
      
      // If this was the last attempt, return false
      if (attempt === maxRetries) {
        console.error('❌ All retry attempts failed for message notification')
        return false
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return false
}

/**
 * Send a generic email using a custom template
 */
export async function sendEmail(
  templateId: string,
  templateParams: Record<string, string>
): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  
  console.log('📧 Sending email with template:', templateId, templateParams)
  
  if (!initEmailJS() || !serviceId) {
    console.warn('⚠️ EmailJS not fully configured. Email logged but not sent.')
    return false
  }
  
  try {
    const response = await emailjs.send(serviceId, templateId, templateParams)
    console.log('✅ Email sent successfully:', response.status)
    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}

