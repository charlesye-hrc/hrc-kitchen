import crypto from 'crypto';

export interface GuestOrderTokenPayload {
  nonce: string;
  timestamp: number;
  signature: string;
}

export class GuestOrderTokenService {
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private static get secret(): string {
    const secret = process.env.GUEST_ORDER_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('GUEST_ORDER_TOKEN_SECRET or JWT_SECRET must be configured');
    }
    return secret;
  }

  static get ttlMs(): number {
    return parseInt(process.env.GUEST_ORDER_TOKEN_TTL_MS || `${this.DEFAULT_TTL_MS}`, 10);
  }

  static issueToken(): GuestOrderTokenPayload {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const signature = this.sign(nonce, timestamp);

    return { nonce, timestamp, signature };
  }

  static verifyToken(payload?: GuestOrderTokenPayload): boolean {
    if (!payload) {
      return false;
    }

    const { nonce, timestamp, signature } = payload;

    if (!nonce || !timestamp || !signature) {
      return false;
    }

    const now = Date.now();
    if (Math.abs(now - timestamp) > this.ttlMs) {
      return false; // expired or too far in future
    }

    const expectedSignature = this.sign(nonce, timestamp);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  }

  private static sign(nonce: string, timestamp: number): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(`${nonce}:${timestamp}`)
      .digest('hex');
  }
}
