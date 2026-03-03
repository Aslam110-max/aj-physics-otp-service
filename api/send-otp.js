const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method === "OPTIONS") {
    return res.status(200).json({ message: "CORS preflight successful" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST.",
      debug: { method: req.method },
    });
  }

  try {
    console.log("📧 Starting OTP email process...");
    console.log("🔐 Environment check:", {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "missing",
      fromEmail: process.env.SES_FROM_EMAIL || "missing",
    });

    const {
      to_email,
      otp,
      type = "verification",
      app_name = "AJ Physics Chat",
    } = req.body;

    console.log("📨 Request data:", {
      to_email,
      otp: otp ? otp.substring(0, 3) + "***" : "missing",
      type,
      app_name,
    });

    if (!to_email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required fields",
        debug: { hasEmail: !!to_email, hasOTP: !!otp },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits" });
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.SES_FROM_EMAIL) {
      console.error("❌ Missing AWS credentials in environment variables");
      return res.status(500).json({
        success: false,
        message: "Server configuration error - missing AWS credentials",
        debug: {
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          hasFromEmail: !!process.env.SES_FROM_EMAIL,
        },
      });
    }

    const sesClient = new SESClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const isPasswordReset = type === "password_reset";
    const subject = `${app_name} - ${isPasswordReset ? "Password Reset" : "Email Verification"} Code`;

    console.log("📝 Preparing email content...");

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
                <p>${isPasswordReset ? "Password Reset" : "Email Verification"}</p>
            </div>
            <div class="content">
                <h2>${isPasswordReset ? "Reset Your Password" : "Verify Your Email"}</h2>
                <p>${isPasswordReset
                  ? "You requested to reset your password. Please use the verification code below:"
                  : "Welcome to AJ Physics Chat! Please verify your email address with the code below:"}</p>
                <div class="otp-container">
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                </div>
                <p style="text-align: center; font-weight: 500;">
                    Enter this code in the app to ${isPasswordReset ? "reset your password" : "activate your account"}.
                </p>
                <div class="notice">
                    <h3>Security Information</h3>
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

    const command = new SendEmailCommand({
      Source: `"${app_name}" <${process.env.SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [to_email] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlContent, Charset: "UTF-8" },
          Text: {
            Data: `${app_name}\n\n${isPasswordReset ? "Password Reset" : "Email Verification"}\n\nYour verification code: ${otp}\n\nThis code expires in 5 minutes.\n\n${isPasswordReset ? "If you didn't request this, ignore this email." : "If you didn't sign up, ignore this email."}\n\n© ${new Date().getFullYear()} ${app_name}`,
            Charset: "UTF-8",
          },
        },
      },
    });

    console.log("📤 Sending email to:", to_email);
    const result = await sesClient.send(command);
    console.log("✅ Email sent successfully! MessageId:", result.MessageId);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      timestamp: new Date().toISOString(),
      messageId: result.MessageId,
      debug: { to: to_email, subject, service: "Amazon SES" },
    });

  } catch (error) {
    console.error("❌ Fatal error in send-otp function:", error);

    let errorMessage = "Failed to send verification code";
    let debugInfo = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
    };

    if (error.name === "MessageRejected") {
      errorMessage = "Email rejected by SES. Sender email may not be verified.";
      debugInfo.solution = "Verify the sender email in AWS SES console";
    } else if (error.name === "InvalidClientTokenId" || error.name === "InvalidSignatureException") {
      errorMessage = "Invalid AWS credentials.";
      debugInfo.solution = "Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY";
    } else if (error.name === "AccessDeniedException") {
      errorMessage = "AWS access denied. Check IAM permissions.";
      debugInfo.solution = "Ensure IAM user has AmazonSESFullAccess policy";
    }

    res.status(500).json({ success: false, message: errorMessage, debug: debugInfo });
  }
};
