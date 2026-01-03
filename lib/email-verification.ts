/**
 * Email verification utilities
 */

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send verification email with code
 * TODO: Implement with your email service (Resend, SendGrid, etc.)
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coachapro.com'
  
  // For now, log the code - implement actual email sending
  console.log('📧 Verification Email:', {
    to: email,
    code,
    name,
  })

  // TODO: Implement actual email sending
  // Example with Resend:
  // try {
  //   await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
      //       from: 'coachapro <noreply@coachapro.com>',
  //       to: email,
      //       subject: 'Verify your coachapro account',
  //       html: `
  //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      //           <h1 style="color: #10b981;">Welcome to coachapro!</h1>
  //           <p>Hi ${name || 'there'},</p>
  //           <p>Thank you for signing up! Please verify your email address by entering this code:</p>
  //           <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
  //             <h2 style="color: #10b981; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h2>
  //           </div>
  //           <p>This code will expire in 24 hours.</p>
  //           <p>If you didn't create an account, please ignore this email.</p>
  //           <hr style="border: none; border-top: 1px solid #374151; margin: 20px 0;">
      //           <p style="color: #9ca3af; font-size: 12px;">coachapro - Personal Training Platform</p>
  //         </div>
  //       `,
  //     }),
  //   })
  // } catch (error) {
  //   console.error('Failed to send verification email:', error)
  //   throw error
  // }
}



