import { wrapInBaseTemplate } from './base';
import { InvitationEmailData } from '../../types/email.types';

export function generateInvitationEmail(data: InvitationEmailData): string {
  const content = `
    <h1>You've been invited to HRC Kitchen</h1>
    <p>Hi ${data.fullName},</p>
    <p>${data.inviterName} has invited you to join HRC Kitchen as a <strong>${data.role}</strong>.</p>

    <div class="info-box">
      <h2 style="margin-top: 0;">What's next?</h2>
      <ol style="margin: 8px 0; padding-left: 20px;">
        <li>Click the button below to accept your invitation</li>
        <li>Create a secure password for your account</li>
        <li>Start using HRC Kitchen with your assigned role</li>
      </ol>
    </div>

    <div class="button-container">
      <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
    </div>

    <p class="muted" style="margin-top: 24px;">
      <strong>Note:</strong> This invitation link will expire in ${data.expiresIn}.
      If you did not expect this invitation, you can safely ignore this email.
    </p>

    <p class="muted">
      If you have any questions, please contact your system administrator.
    </p>
  `;

  return wrapInBaseTemplate(content, 'HRC Kitchen Invitation');
}
