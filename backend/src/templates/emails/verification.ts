import { wrapInBaseTemplate } from './base';
import { VerificationEmailData } from '../../types/email.types';

export function generateVerificationEmail(data: VerificationEmailData): string {
  const content = `
    <h1>Verify Your Email Address</h1>
    <p>Hi ${data.fullName},</p>
    <p>Thank you for registering with HRC Kitchen. Please verify your email address to complete your registration and start ordering.</p>

    <div class="button-container">
      <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
    </div>

    <div class="info-box">
      <p style="margin: 0;"><strong>This link will expire in 24 hours.</strong></p>
    </div>

    <p class="muted">If you didn't create an account with HRC Kitchen, you can safely ignore this email.</p>

    <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
    <p class="muted" style="word-break: break-all;">${data.verificationUrl}</p>
  `;

  return wrapInBaseTemplate(content, 'Verify Your Email - HRC Kitchen');
}
