let recaptchaScriptPromise = null;
const loadRecaptchaScript = (siteKey) => {
    var _a;
    if ((_a = window.grecaptcha) === null || _a === void 0 ? void 0 : _a.enterprise) {
        return new Promise((resolve) => {
            var _a;
            (_a = window.grecaptcha) === null || _a === void 0 ? void 0 : _a.enterprise.ready(() => resolve());
        });
    }
    if (recaptchaScriptPromise) {
        return recaptchaScriptPromise;
    }
    recaptchaScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            var _a, _b;
            if (!((_a = window.grecaptcha) === null || _a === void 0 ? void 0 : _a.enterprise)) {
                reject(new Error('reCAPTCHA failed to initialize'));
                return;
            }
            (_b = window.grecaptcha) === null || _b === void 0 ? void 0 : _b.enterprise.ready(() => resolve());
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
        document.head.appendChild(script);
    });
    return recaptchaScriptPromise;
};
export const executeRecaptcha = async (siteKey, action) => {
    var _a, _b;
    await loadRecaptchaScript(siteKey);
    if (!((_a = window.grecaptcha) === null || _a === void 0 ? void 0 : _a.enterprise)) {
        throw new Error('reCAPTCHA Enterprise is not available');
    }
    return (_b = window.grecaptcha) === null || _b === void 0 ? void 0 : _b.enterprise.execute(siteKey, { action });
};
