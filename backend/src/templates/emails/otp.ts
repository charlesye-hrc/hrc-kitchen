import { wrapInBaseTemplate } from './base';
import { OtpEmailData } from '../../types/email.types';

export function generateOtpEmail(data: OtpEmailData): string {
  const content = `
    <h1>Your Login Code</h1>
    <p>Hi ${data.fullName},</p>
    <p>Here is your one-time verification code to sign in to HRC Kitchen:</p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; background-color: #f5f5f5; border: 2px solid #2D5F3F; border-radius: 8px; padding: 20px 40px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2D5F3F; font-family: monospace;">${data.otpCode}</span>
      </div>
    </div>

    <div class="info-box">
      <p style="margin: 0;"><strong>This code will expire in ${data.expiresIn}.</strong></p>
    </div>

    <p>Enter this code on the login page to complete your sign-in.</p>

    <p class="muted">If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>

    <p class="muted"><strong>Never share this code with anyone.</strong> HRC Kitchen staff will never ask for your code.</p>
  `;

  return wrapInBaseTemplate(content, 'Your Login Code - HRC Kitchen');
}
