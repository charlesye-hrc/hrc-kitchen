import https from 'https';

export class CaptchaService {
  private static get secret(): string | null {
    return process.env.RECAPTCHA_SECRET_KEY || null;
  }

  static async verify(token: string, remoteIp?: string): Promise<boolean> {
    const secret = this.secret;
    if (!secret) {
      throw new Error('RECAPTCHA_SECRET_KEY is not configured');
    }

    const postData = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIp) {
      postData.append('remoteip', remoteIp);
    }

    return new Promise<boolean>((resolve, reject) => {
      const request = https.request(
        {
          hostname: 'www.google.com',
          path: '/recaptcha/api/siteverify',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData.toString()),
          },
        },
        (res) => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              resolve(Boolean(result.success));
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      request.on('error', reject);
      request.write(postData.toString());
      request.end();
    });
  }
}
