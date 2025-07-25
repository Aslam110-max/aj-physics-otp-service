// api/send-otp.js - FIXED NODEMAILER IMPORT
const nodemailer = require('nodemailer'); // Use require instead of import

module.exports = async function handler(req, res) {
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
    
    console.log('📨 Request data:', { 
      to_email, 
      otp: otp ? otp.substring(0, 3) + '***' : 'missing', 
      type, 
      app_name 
    });
    
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
    
    // Create nodemailer transporter - FIXED METHOD
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      },
      secure: true,
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
          solution: verifyError.code === 'EAUTH' ? 'Generate new Gmail app password' : 'Check network connection'
        }
      });
    }
    
    // Determine email content based on type
    const isPasswordReset = type === 'password_reset';
    const subject = `${app_name} - ${isPasswordReset ? 'Password Reset' : 'Email Verification'} Code`;
    
    console.log('📝 Preparing email content...');
    
    // Professional HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
            .header p { margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; }
            .content { padding: 40px 30px; }
            .content h2 { color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600; }
            .content p { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
            .otp-container { text-align: center; margin: 35px 0; }
            .otp-box { background: #f7fafc; border: 3px dashed #667eea; border-radius: 12px; padding: 30px 20px; display: inline-block; min-width: 200px; }
            .otp-code { color: #667eea; font-size: 48px; font-weight: bold; margin: 0; letter-spacing: 6px; font-family: 'Courier New', monospace; }
            .notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px; }
            .notice h3 { color: #744210; margin: 0 0 10px 0; font-size: 16px; }
            .notice ul { color: #744210; margin: 10px 0 0 0; padding-left: 20px; }
            .notice li { margin: 5px 0; }
            .footer { background: #f8f9fa; padding: 25px 20px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #718096; font-size: 14px; margin: 5px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${app_name}</h1>
                <p>${isPasswordReset ? 'Password Reset' : 'Email Verification'}</p>
            </div>
            
            <div class="content">
                <h2>${isPasswordReset ? 'Reset Your Password' : 'Verify Your Email'}</h2>
                <p>
                    ${isPasswordReset 
                      ? 'You requested to reset your password. Please use the verification code below:' 
                      : 'Welcome to AJ Physics Chat! Please verify your email address with the code below:'}
                </p>
                
                <div class="otp-container">
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                </div>
                
                <p style="text-align: center; font-weight: 500;">
                    Enter this code in the app to ${isPasswordReset ? 'reset your password' : 'activate your account'}.
                </p>
                
                <div class="notice">
                    <h3>🔒 Security Information</h3>
                    <ul>
                        <li>This code will expire in <strong>5 minutes</strong></li>
                        <li>Never share this code with anyone</li>
                        <li>Only enter this code in the official ${app_name} app</li>
                        <li>${isPasswordReset 
                            ? "If you didn't request a password reset, please ignore this email" 
                            : "If you didn't create an account, please ignore this email"}</li>
                    </ul>
                </div>
                
                <p style="color: #718096; font-size: 14px; text-align: center; margin-top: 30px;">
                    Need help? Contact our support team for assistance.
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${app_name}. All rights reserved.</p>
                <p style="font-size: 12px;">This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;
    
    // Email options
    const mailOptions = {
      from: `"${app_name}" <${process.env.GMAIL_USER}>`,
      to: to_email,
      subject: subject,
      html: htmlContent,
      text: `${app_name}\n\n${isPasswordReset ? 'Password Reset' : 'Email Verification'}\n\nYour verification code: ${otp}\n\nThis code expires in 5 minutes.\n\n${isPasswordReset ? "If you didn't request this, ignore this email." : "If you didn't sign up, ignore this email."}\n\n© ${new Date().getFullYear()} ${app_name}`,
      priority: 'high'
    };
    
    console.log('📤 Sending email to:', to_email);
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📮 Message ID:', info.messageId);
    
    // Success response
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      timestamp: new Date().toISOString(),
      messageId: info.messageId,
      debug: {
        to: to_email,
        subject: subject,
        service: 'Gmail via Nodemailer'
      }
    });
    
  } catch (error) {
    console.error('❌ Fatal error in send-otp function:', error);
    
    // Detailed error analysis
    let errorMessage = 'Failed to send verification code';
    let debugInfo = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please check your app password.';
      debugInfo.solution = 'Generate a new Gmail app password';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to Gmail servers.';
      debugInfo.solution = 'Check internet connection';
    } else if (error.code === 'EMESSAGE') {
      errorMessage = 'Invalid email message format.';
    } else if (error.message?.includes('Invalid login')) {
      errorMessage = 'Gmail credentials are invalid.';
      debugInfo.solution = 'Verify Gmail username and app password';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      debug: debugInfo
    });
  }
};