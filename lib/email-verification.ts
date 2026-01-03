/**
 * Email verification utilities
 */

import { sendVerificationEmail as sendEmailJSVerification } from './emailjs'

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send verification email with code using EmailJS
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<void> {
  const success = await sendEmailJSVerification({
    to_email: email,
    to_name: name || 'there',
    verification_code: code,
  })
  
  if (!success) {
    // Don't throw error - email not sending shouldn't block registration
    // The code is logged to console for testing/debugging
    console.warn('⚠️ Verification email not sent, but registration continues')
  }
}



