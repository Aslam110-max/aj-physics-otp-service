// api/send-otp.js - VERCEL SERVERLESS FUNCTION
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Enable CORS for Flutter app
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
      message: 'Method not allowed. Use POST.' 
    });
  }
  
  try {
    // Extract and validate request data
    const { to_email, otp, type = 'verification', app_name = 'AJ Physics Chat' } = req.body;
    
    console.log('📧 Received OTP request:', { to_email, type, app_name });
    
    // Validate required fields
    if (!to_email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required fields'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
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
        message: 'Server configuration error'
      });
    }
    
    // Create nodemailer transporter
    const transporter = nodemailer.createTransporter({
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
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError);
      return res.status(500).json({
        success: false,
        message: 'Email service configuration error'
      });
    }
    
    // Determine email content based on type
    const isPasswordReset = type === 'password_reset';
    const subject = `${app_name} - ${isPasswordReset ? 'Password Reset' : 'Email Verification'} Code`;
    
    const emailTitle = isPasswordReset ? 'Reset Your Password' : 'Verify Your Email';
    const emailDescription = isPasswordReset 
      ? 'You requested to reset your password. Please use the verification code below:'
      : 'Welcome to AJ Physics Chat! To complete your registration, please verify your email address:';
    const emailInstruction = isPasswordReset
      ? 'Enter this code in the app to reset your password.'
      : 'Enter this code in the app to activate your account.';
    const securityNote = isPasswordReset
      ? 'If you didn\'t request a password reset, please ignore this email and your password will remain unchanged.'
      : 'If you didn\'t create an account with us, please ignore this email.';
    
    // Create professional HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
            .header p { margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; }
            .content { padding: 40px 30px; }
            .content h2 { color: #2d3748; margin: 0 0 20px 0; font-size: 26px; font-weight: 600; }
            .content p { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
            .otp-container { text-align: center; margin: 35px 0; }
            .otp-box { background: #f7fafc; border: 4px dashed #667eea; border-radius: 16px; padding: 35px 25px; display: inline-block; min-width: 250px; }
            .otp-code { color: #667eea; font-size: 56px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace; text-shadow: 0 2px 4px rgba(102, 126, 234, 0.1); }
            .instructions { background: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center; }
            .instructions p { margin: 0; color: #2d3748; font-weight: 500; font-size: 16px; }
            .security-notice { background: #fef5e7; border: 1px solid #f6e05e; border-radius: 12px; padding: 25px; margin: 30px 0; }
            .security-notice h3 { color: #744210; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; }
            .security-notice ul { color: #744210; margin: 15px 0 0 0; padding-left: 20px; }
            .security-notice li { margin: 8px 0; line-height: 1.5; }
            .footer { background: #f8f9fa; padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #718096; font-size: 14px; margin: 5px 0; }
            .footer .small { font-size: 12px; }
            @media (max-width: 600px) {
                .container { margin: 0 10px; }
                .content { padding: 30px 20px; }
                .otp-code { font-size: 42px; letter-spacing: 4px; }
                .header h1 { font-size: 28px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>${app_name}</h1>
                <p>${emailTitle}</p>
            </div>
            
            <!-- Main Content -->
            <div class="content">
                <h2>${emailTitle}</h2>
                <p>${emailDescription}</p>
                
                <!-- OTP Display -->
                <div class="otp-container">
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div class="instructions">
                    <p>${emailInstruction}</p>
                </div>
                
                <!-- Security Notice -->
                <div class="security-notice">
                    <h3>🔒 Security Information</h3>
                    <ul>
                        <li>This verification code will expire in <strong>5 minutes</strong></li>
                        <li>Never share this code with anyone</li>
                        <li>Only enter this code in the official ${app_name} app</li>
                        <li>${securityNote}</li>
                    </ul>
                </div>
                
                <p style="color: #718096; font-size: 14px; margin-top: 30px; text-align: center;">
                    If you need assistance, please contact our support team.
                </p>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${app_name}. All rights reserved.</p>
                <p class="small">This is an automated message. Please do not reply to this email.</p>
                <p class="small">Powered by Vercel • Sent with ❤️</p>
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
      text: `${emailTitle}\n\nYour verification code is: ${otp}\n\n${emailInstruction}\n\nThis code expires in 5 minutes.\n\n${securityNote}\n\n© ${new Date().getFullYear()} ${app_name}`,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };
    
    // Send the email
    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    
    // Success response
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      timestamp: new Date().toISOString(),
      messageId: info.messageId
    });
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Determine error type and send appropriate response
    let errorMessage = 'Failed to send verification code';
    let statusCode = 500;
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email service. Please try again.';
    } else if (error.code === 'EMESSAGE') {
      errorMessage = 'Invalid email message format.';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}