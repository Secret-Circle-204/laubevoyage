import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verifySmtp() {
  console.log('--- SMTP Diagnostic Tool ---');
  console.log('Host: smtp.gmail.com');
  console.log('Port: 465');
  console.log('User:', process.env.SMTP_USER);
  console.log('Password length:', process.env.SMTP_PASSWORD?.length || 0);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  console.log('\nVerifying connection...');

  try {
    const success = await transporter.verify();
    if (success) {
      console.log('\x1b[32mSUCCESS: Connection established and authenticated.\x1b[0m');
      
      console.log('\nSending test email...');
      const info = await transporter.sendMail({
        from: `"SMTP Test" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: 'Laube Voyage SMTP Test',
        text: 'If you see this, your SMTP configuration is working perfectly.',
      });
      console.log('Test email sent: %s', info.messageId);
    }
  } catch (error: any) {
    console.log('\x1b[31mFAILURE: Authentication failed.\x1b[0m');
    console.error('\nError Details:');
    console.error(error.message);
    if (error.code === 'EAUTH') {
      console.log('\n--- Troubleshooting Tips ---');
      console.log('1. Ensure 2-Step Verification is ON in your Google Account.');
      console.log('2. Generate a fresh "App Password" (NOT your regular password).');
      console.log('   Go to: https://myaccount.google.com/apppasswords');
      console.log('3. Verify there are no typos in your .env file.');
    }
  }
}

verifySmtp();
