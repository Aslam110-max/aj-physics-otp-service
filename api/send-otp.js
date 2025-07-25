// api/send-otp.js - IMPROVED VERSION WITH DEBUG LOGGING
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight successful' });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST.',
      debug: { method: req.method }
    });
  }
  
  try {
    console.log('📧 Starting OTP email process...');
    console.log('🔐 Environment check:', {
      hasGmailUser: !!process.env.GMAIL_USER,
      hasGmailPass: !!process.env.GMAIL_PASS,
      gmailUser: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 5) + '***' : 'missing'
    });
    
    // Extract and validate request data
    const { to_email, otp, type = 'verification', app_name = 'AJ Physics Chat' } = req.body;
    
    console.log('📨 Request data:', { to_email, otp: otp ? otp.substring(0, 3) + '***' : 'missing', type, app_name });
    
    // Validate required fields
    if (!to_email || !otp) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required fields',
        debug: { hasEmail: !!to_email, hasOTP: !!otp }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      console.log('❌ Invalid email format:', to_email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      console.log('❌ Invalid OTP format:', otp);
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits'
      });
    }
    
    // Check environment variables
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.error('❌ Missing Gmail credentials in environment variables');
      console.error('GMAIL_USER exists:', !!process.env.GMAIL_USER);
      console.error('GMAIL_PASS exists:', !!process.env.GMAIL_PASS);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing credentials',
        debug: {
          hasGmailUser: !!process.env.GMAIL_USER,
          hasGmailPass: !!process.env.GMAIL_PASS
        }
      });
    }
    
    console.log('🔧 Creating email transporter...');
    
    // Create nodemailer transporter with detailed config
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      },
      secure: true,
      logger: true, // Enable logging
      debug: true,  // Enable debug output
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verify transporter connection
    console.log('🔍 Verifying SMTP connection...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      console.error('Error code:', verifyError.code);
      console.error('Error response:', verifyError.response);
      
      let errorMessage = 'Email service configuration error';
      if (verifyError.code === 'EAUTH') {
        errorMessage = 'Gmail authentication failed. Please check your app password.';
      } else if (verifyError.code === 'ECONNECTION') {
        errorMessage = 'Failed to connect to Gmail servers.';
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        debug: {
          errorCode: verifyError.code,
          errorMessage: verifyError.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Determine email content based on type
    const isPasswordReset = type === 'password_reset';
    const subject = `${app_name} - ${isPasswordReset ? 'Password Reset' : 'Email Verification'} Code`;
    
    console.log('📝 Preparing email content...');
    
    // Simple HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #667eea; margin: 0;">${app_name}</h1>
                <h2 style="color: #333; margin: 10px 0;">${isPasswordReset ? 'Password Reset' : 'Email Verification'}</h2>
            </div>
            
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                ${isPasswordReset 
                  ? 'You requested to reset your password. Please use the verification code below:' 
                  : 'Welcome! Please verify your email address with the code below:'}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #f8f9fa; border: 3px dashed #667eea; border-radius: 10px; padding: 25px; display: inline-block;">
                    <span style="color: #667eea; font-size: 36px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">${otp}</span>
                </div>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404;"><strong>Important:</strong></p>
                <ul style="margin: 10px 0 0 0; color: #856404;">
                    <li>This code expires in <strong>5 minutes</strong></li>
                    <li>Don't share this code with anyone</li>
                    <li>${isPasswordReset ? "If you didn't request this, ignore this email" : "If you didn't sign up, ignore this email"}</li>
                </ul>
            </div>
            
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                © ${new Date().getFullYear()} ${app_name} • Powered by Vercel
            </p>
        </div>
    </body>
    </html>`;
    
    // Email options
    const mailOptions = {
      from: `"${app_name}" <${process.env.GMAIL_USER}>`,
      to: to_email,
      subject: subject,
      html: htmlContent,
      text: `${app_name}\n\n${isPasswordReset ? 'Password Reset' : 'Email Verification'}\n\nYour verification code: ${otp}\n\nThis code expires in 5 minutes.\n\n© ${new Date().getFullYear()} ${app_name}`
    };
    
    console.log('📤 Sending email to:', to_email);
    console.log('📧 Subject:', subject);
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📮 Message ID:', info.messageId);
    console.log('📊 Response:', info.response);
    
    // Success response
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      timestamp: new Date().toISOString(),
      messageId: info.messageId,
      debug: {
        to: to_email,
        subject: subject,
        emailService: 'Gmail via Nodemailer'
      }
    });
    
  } catch (error) {
    console.error('❌ Fatal error in send-otp function:', error);
    console.error('Error stack:', error.stack);
    
    // Detailed error analysis
    let errorMessage = 'Failed to send verification code';
    let statusCode = 500;
    let debugInfo = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please check your app password.';
      debugInfo.solution = 'Generate a new Gmail app password and update environment variables';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to Gmail servers. Please try again.';
      debugInfo.solution = 'Check internet connection and Gmail service status';
    } else if (error.code === 'EMESSAGE') {
      errorMessage = 'Invalid email message format.';
      statusCode = 400;
    } else if (error.message?.includes('Invalid login')) {
      errorMessage = 'Gmail login credentials are invalid.';
      debugInfo.solution = 'Verify Gmail username and app password';
    }
    
    debugInfo.errorCode = error.code;
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      debug: debugInfo
    });
  }
}