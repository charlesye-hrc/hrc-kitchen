import { wrapInBaseTemplate } from './base';
import { PasswordResetEmailData } from '../../types/email.types';

export function generatePasswordResetEmail(data: PasswordResetEmailData): string {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${data.fullName},</p>
    <p>We received a request to reset your password for your HRC Kitchen account. Click the button below to create a new password.</p>

    <div class="button-container">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </div>

    <div class="warning-box">
      <p style="margin: 0;"><strong>This link will expire in ${data.expiresIn}.</strong></p>
    </div>

    <p class="muted">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
    <p class="muted" style="word-break: break-all;">${data.resetUrl}</p>
  `;

  return wrapInBaseTemplate(content, 'Reset Your Password - HRC Kitchen');
}
