import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

export class CaptchaService {
  private static client: RecaptchaEnterpriseServiceClient | null = null;
  private static bypassLogged = false;
  private static runtimeBypassLogged = false;

  private static get recaptchaClient(): RecaptchaEnterpriseServiceClient {
    if (!this.client) {
      this.client = new RecaptchaEnterpriseServiceClient();
    }
    return this.client;
  }

  private static get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  private static get shouldBypassInDev(): boolean {
    const bypassValue = (process.env.RECAPTCHA_BYPASS_IN_DEV || '').toLowerCase().trim();
    const bypassEnabled = bypassValue === 'true' || bypassValue === '1' || bypassValue === 'yes';
    return this.isDevelopment && bypassEnabled;
  }

  static isBypassEnabledInDev(): boolean {
    return this.shouldBypassInDev;
  }

  private static get projectId(): string {
    const projectId = process.env.RECAPTCHA_PROJECT_ID;
    if (!projectId) {
      throw new Error('RECAPTCHA_PROJECT_ID is not configured');
    }
    return projectId;
  }

  private static get siteKey(): string {
    const siteKey = process.env.RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      throw new Error('RECAPTCHA_SITE_KEY is not configured');
    }
    return siteKey;
  }

  private static get minScore(): number {
    const value = process.env.RECAPTCHA_MIN_SCORE;
    const parsed = value ? Number(value) : 0.3;
    return Number.isFinite(parsed) ? parsed : 0.3;
  }

  static async verify(
    token: string,
    userIpAddress?: string,
    options?: { expectedAction?: string | string[] }
  ): Promise<boolean> {
    if (this.shouldBypassInDev) {
      if (!this.bypassLogged) {
        console.warn('[CaptchaService] RECAPTCHA_BYPASS_IN_DEV is enabled in development. Skipping captcha verification.');
        this.bypassLogged = true;
      }
      return true;
    }

    if (this.isDevelopment && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      if (!this.runtimeBypassLogged) {
        console.warn('[CaptchaService] GOOGLE_APPLICATION_CREDENTIALS is not set in development. Bypassing captcha verification.');
        this.runtimeBypassLogged = true;
      }
      return true;
    }

    try {
      const projectPath = this.recaptchaClient.projectPath(this.projectId);
      const expectedActions = options?.expectedAction
        ? Array.isArray(options.expectedAction)
          ? options.expectedAction
          : [options.expectedAction]
        : undefined;

      const [assessment] = await this.recaptchaClient.createAssessment({
        parent: projectPath,
        assessment: {
          event: {
            token,
            siteKey: this.siteKey,
            userIpAddress,
            // Only set expectedAction when we have a single value to avoid mismatches
            expectedAction: expectedActions && expectedActions.length === 1 ? expectedActions[0] : undefined,
          },
        },
      });

      const tokenProperties = assessment.tokenProperties;

      if (!tokenProperties?.valid) {
        return false;
      }

      if (expectedActions && tokenProperties.action && !expectedActions.includes(tokenProperties.action)) {
        return false;
      }

      const score = assessment.riskAnalysis?.score ?? 0;
      return score >= this.minScore;
    } catch (error) {
      if (this.isDevelopment) {
        if (!this.runtimeBypassLogged) {
          console.warn('[CaptchaService] reCAPTCHA verification failed in development. Bypassing verification for local development.');
          this.runtimeBypassLogged = true;
        }
        return true;
      }

      throw error;
    }
  }
}
