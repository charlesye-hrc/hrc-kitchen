import sgMail from '@sendgrid/mail';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  VerificationEmailData,
  PasswordResetEmailData,
  OtpEmailData,
  WelcomeEmailData,
  InvitationEmailData,
  OrderConfirmationEmailData,
  OrderItemEmailData,
} from '../types/email.types';
import {
  generateVerificationEmail,
  generatePasswordResetEmail,
  generateOtpEmail,
  generateWelcomeEmail,
  generateInvitationEmail,
  generateOrderConfirmationEmail,
} from '../templates/emails';

// Email configuration from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@hrc-kitchen.com';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info('[Email Service] SendGrid API configured');
} else {
  logger.warn('[Email Service] SENDGRID_API_KEY not configured, emails will not be sent');
}

export class EmailService {
  /**
   * Send an email using SendGrid API
   */
  private static async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!SENDGRID_API_KEY) {
      logger.warn(`[Email Service] Skipping email to ${to} - API key not configured`);
      return;
    }

    try {
      const msg = {
        to,
        from: EMAIL_FROM,
        subject,
        html,
      };

      await sgMail.send(msg);
      logger.info(`[Email Service] Email sent to ${to}`);
    } catch (error: any) {
      // Log detailed error from SendGrid
      if (error.response) {
        logger.error(`[Email Service] SendGrid error:`, {
          statusCode: error.response.statusCode,
          body: error.response.body,
        });
      } else {
        logger.error(`[Email Service] Failed to send email to ${to}:`, error);
      }
      throw new ApiError(500, 'Failed to send email');
    }
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(
    email: string,
    fullName: string,
    verificationToken: string
  ): Promise<void> {
    const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    const verificationUrl = `${publicAppUrl}/verify-email?token=${verificationToken}`;

    const data: VerificationEmailData = {
      to: email,
      subject: 'Verify Your Email - HRC Kitchen',
      fullName,
      verificationUrl,
    };

    const html = generateVerificationEmail(data);
    await this.sendEmail(email, data.subject, html);

    logger.info(`[Email Service] Verification email sent to ${email}`);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    fullName: string,
    resetToken: string,
    app: 'public' | 'admin' = 'public'
  ): Promise<void> {
    const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    const adminAppUrl = process.env.ADMIN_APP_URL || 'http://localhost:5174';
    const baseUrl = app === 'admin' ? adminAppUrl : publicAppUrl;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&app=${app}`;

    const data: PasswordResetEmailData = {
      to: email,
      subject: 'Reset Your Password - HRC Kitchen',
      fullName,
      resetUrl,
      expiresIn: '1 hour',
    };

    const html = generatePasswordResetEmail(data);
    await this.sendEmail(email, data.subject, html);

    logger.info(`[Email Service] Password reset email sent to ${email}`);
  }

  /**
   * Send OTP verification code email
   */
  static async sendOtpEmail(
    email: string,
    fullName: string,
    otpCode: string
  ): Promise<void> {
    const data: OtpEmailData = {
      to: email,
      subject: 'Your Login Code - HRC Kitchen',
      fullName,
      otpCode,
      expiresIn: '10 minutes',
    };

    const html = generateOtpEmail(data);
    await this.sendEmail(email, data.subject, html);

    logger.info(`[Email Service] OTP email sent to ${email}`);
  }

  /**
   * Send welcome email after email verification
   */
  static async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    const loginUrl = `${publicAppUrl}/login`;

    const data: WelcomeEmailData = {
      to: email,
      subject: 'Welcome to HRC Kitchen!',
      fullName,
      loginUrl,
    };

    const html = generateWelcomeEmail(data);
    await this.sendEmail(email, data.subject, html);

    logger.info(`[Email Service] Welcome email sent to ${email}`);
  }

  /**
   * Send user invitation email
   */
  static async sendInvitationEmail(
    email: string,
    fullName: string,
    inviterName: string,
    role: string,
    invitationToken: string
  ): Promise<void> {
    const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    const invitationUrl = `${publicAppUrl}/accept-invitation?token=${invitationToken}`;

    const data: InvitationEmailData = {
      to: email,
      subject: 'You\'ve been invited to HRC Kitchen',
      fullName,
      inviterName,
      role,
      invitationUrl,
      expiresIn: '24 hours',
    };

    const html = generateInvitationEmail(data);
    await this.sendEmail(email, data.subject, html);

    logger.info(`[Email Service] Invitation email sent to ${email}`);
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmationEmail(
    email: string,
    orderData: {
      customerName: string;
      orderNumber: string;
      orderDate: Date;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        variations?: string;
        specialRequests?: string;
      }>;
      totalAmount: number;
      locationName: string;
      locationAddress?: string;
      deliveryNotes?: string;
      isGuest: boolean;
      accessToken?: string;
    }
  ): Promise<void> {
    const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';

    // Format order date
    const formattedDate = orderData.orderDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build order access URL for guests
    let orderAccessUrl: string | undefined;
    if (orderData.isGuest && orderData.accessToken) {
      orderAccessUrl = `${publicAppUrl}/order-status?token=${orderData.accessToken}`;
    }

    const items: OrderItemEmailData[] = orderData.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      variations: item.variations,
      specialRequests: item.specialRequests,
    }));

    const data: OrderConfirmationEmailData = {
      to: email,
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      customerName: orderData.customerName,
      orderNumber: orderData.orderNumber,
      orderDate: formattedDate,
      items,
      totalAmount: orderData.totalAmount,
      locationName: orderData.locationName,
      locationAddress: orderData.locationAddress,
      deliveryNotes: orderData.deliveryNotes,
      isGuest: orderData.isGuest,
      orderAccessUrl,
    };

    const html = generateOrderConfirmationEmail(data);
    await this.sendEmail(email, data.subject, html);

    logger.info(`[Email Service] Order confirmation email sent to ${email} for order ${orderData.orderNumber}`);
  }

  /**
   * Verify SendGrid API key is configured
   */
  static isConfigured(): boolean {
    return !!SENDGRID_API_KEY;
  }
}
