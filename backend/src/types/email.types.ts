// Email type definitions for HRC Kitchen

export interface EmailConfig {
  from: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface BaseEmailData {
  to: string;
  subject: string;
}

export interface VerificationEmailData extends BaseEmailData {
  fullName: string;
  verificationUrl: string;
}

export interface PasswordResetEmailData extends BaseEmailData {
  fullName: string;
  resetUrl: string;
  expiresIn: string;
}

export interface OtpEmailData extends BaseEmailData {
  fullName: string;
  otpCode: string;
  expiresIn: string;
}

export interface WelcomeEmailData extends BaseEmailData {
  fullName: string;
  loginUrl: string;
}

export interface OrderItemEmailData {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variations?: string;
  specialRequests?: string;
}

export interface OrderConfirmationEmailData extends BaseEmailData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderItemEmailData[];
  totalAmount: number;
  locationName: string;
  locationAddress?: string;
  deliveryNotes?: string;
  isGuest: boolean;
  orderAccessUrl?: string; // For guest orders
}

export type EmailType =
  | 'verification'
  | 'password-reset'
  | 'otp'
  | 'welcome'
  | 'order-confirmation';
