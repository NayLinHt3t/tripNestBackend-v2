import nodemailer from "nodemailer";

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const mailOptions = {
    from: `"TripNest" <${process.env.GMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">TripNest Password Reset</h2>
      <p>You requested a password reset for your TripNest account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" 
         style="display: inline-block; 
                background-color: #6366f1; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px;
                margin: 16px 0;">
        Reset Password
      </a>
      <p>Or copy this link:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        If you didn't request this, please ignore this email.
      </p>
    </div>
  `;

  const text = `
    TripNest Password Reset
    
    You requested a password reset for your TripNest account.
    
    Click this link to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: "Reset Your TripNest Password",
    html,
    text,
  });
}
