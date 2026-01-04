/**
 * Test script to diagnose EmailJS email sending issues
 * Run with: npx tsx scripts/test-emailjs.ts
 */

import emailjs from '@emailjs/nodejs'

async function testEmailJS() {
  console.log('🧪 Testing EmailJS Configuration...\n')
  
  // Check environment variables
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_VERIFICATION_TEMPLATE_ID
  
  console.log('📋 Environment Variables:')
  console.log('  EMAILJS_PUBLIC_KEY:', publicKey ? `${publicKey.substring(0, 10)}...` : '❌ MISSING')
  console.log('  EMAILJS_PRIVATE_KEY:', privateKey ? `${privateKey.substring(0, 10)}...` : '❌ MISSING')
  console.log('  EMAILJS_SERVICE_ID:', serviceId || '❌ MISSING')
  console.log('  EMAILJS_VERIFICATION_TEMPLATE_ID:', templateId || '❌ MISSING')
  console.log()
  
  if (!publicKey || !privateKey || !serviceId || !templateId) {
    console.error('❌ Missing required environment variables!')
    console.log('\nMake sure your .env.local file has all EmailJS variables set.')
    process.exit(1)
  }
  
  // Initialize EmailJS
  try {
    emailjs.init({
      publicKey,
      privateKey,
    })
    console.log('✅ EmailJS initialized successfully\n')
  } catch (error: any) {
    console.error('❌ Failed to initialize EmailJS:', error.message)
    process.exit(1)
  }
  
  // Test sending email
  console.log('📧 Attempting to send test email...')
  try {
    const testParams = {
      to_email: 'test@example.com', // Replace with your email for actual test
      to_name: 'Test User',
      verification_code: '123456',
      app_name: 'CoachaPro',
      app_url: 'https://coachapro.com',
    }
    
    console.log('  Template Parameters:', testParams)
    console.log()
    
    const response = await emailjs.send(serviceId, templateId, testParams)
    
    console.log('✅ Email sent successfully!')
    console.log('  Status:', response.status)
    console.log('  Response:', response)
  } catch (error: any) {
    console.error('❌ Failed to send email:')
    console.error('  Error:', error)
    console.error('  Message:', error?.message)
    console.error('  Status:', error?.status)
    console.error('  Text:', error?.text)
    
    if (error?.status === 412) {
      console.error('\n⚠️  Error 412: Gmail authentication scope issue!')
      console.error('   Your Gmail service needs to be reconnected with proper permissions.')
      console.error('   Go to EmailJS Dashboard > Email Services > Edit Service')
      console.error('   Disconnect and reconnect Gmail, ensuring you grant "Send email on your behalf" permission.')
    }
    
    process.exit(1)
  }
}

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

testEmailJS().catch(console.error)



