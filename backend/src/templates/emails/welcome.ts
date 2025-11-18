import { wrapInBaseTemplate } from './base';
import { WelcomeEmailData } from '../../types/email.types';

export function generateWelcomeEmail(data: WelcomeEmailData): string {
  const content = `
    <h1>Welcome to HRC Kitchen!</h1>
    <p>Hi ${data.fullName},</p>
    <p>Your email has been verified successfully. Your HRC Kitchen account is now ready to use.</p>

    <div class="info-box">
      <h2 style="margin-top: 0;">What you can do now:</h2>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Browse our daily menu</li>
        <li>Place orders for pickup</li>
        <li>View your order history</li>
        <li>Track your order status</li>
      </ul>
    </div>

    <div class="button-container">
      <a href="${data.loginUrl}" class="button">Start Ordering</a>
    </div>

    <p class="muted">If you have any questions, please contact the kitchen staff.</p>
  `;

  return wrapInBaseTemplate(content, 'Welcome to HRC Kitchen');
}
