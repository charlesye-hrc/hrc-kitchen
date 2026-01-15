declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

let recaptchaScriptPromise: Promise<void> | null = null;

const loadRecaptchaScript = (siteKey: string): Promise<void> => {
  if (window.grecaptcha?.enterprise) {
    return new Promise((resolve) => {
      window.grecaptcha!.enterprise!.ready(() => resolve());
    });
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.grecaptcha?.enterprise) {
        reject(new Error('reCAPTCHA failed to initialize'));
        return;
      }
      window.grecaptcha.enterprise.ready(() => resolve());
    };
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
};

export const executeRecaptcha = async (siteKey: string, action: string): Promise<string> => {
  await loadRecaptchaScript(siteKey);

  if (!window.grecaptcha?.enterprise) {
    throw new Error('reCAPTCHA Enterprise is not available');
  }

  return window.grecaptcha.enterprise.execute(siteKey, { action });
};
