import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

export class CaptchaService {
  private static client = new RecaptchaEnterpriseServiceClient();

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
    const projectPath = this.client.projectPath(this.projectId);
    const expectedActions = options?.expectedAction
      ? Array.isArray(options.expectedAction)
        ? options.expectedAction
        : [options.expectedAction]
      : undefined;

    const [assessment] = await this.client.createAssessment({
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
  }
}
