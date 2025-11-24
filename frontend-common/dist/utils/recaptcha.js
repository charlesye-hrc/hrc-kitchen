let recaptchaScriptPromise = null;
const loadRecaptchaScript = (siteKey) => {
    if (window.grecaptcha) {
        return new Promise((resolve) => {
            window.grecaptcha.ready(() => resolve());
        });
    }
    if (recaptchaScriptPromise) {
        return recaptchaScriptPromise;
    }
    recaptchaScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (!window.grecaptcha) {
                reject(new Error('reCAPTCHA failed to initialize'));
                return;
            }
            window.grecaptcha.ready(() => resolve());
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
        document.head.appendChild(script);
    });
    return recaptchaScriptPromise;
};
export const executeRecaptcha = async (siteKey, action) => {
    await loadRecaptchaScript(siteKey);
    if (!window.grecaptcha) {
        throw new Error('reCAPTCHA is not available');
    }
    return window.grecaptcha.execute(siteKey, { action });
};
