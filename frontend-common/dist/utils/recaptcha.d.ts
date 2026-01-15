declare global {
    interface Window {
        grecaptcha?: {
            enterprise?: {
                ready: (cb: () => void) => void;
                execute: (siteKey: string, options: {
                    action: string;
                }) => Promise<string>;
            };
        };
    }
}
export declare const executeRecaptcha: (siteKey: string, action: string) => Promise<string>;
//# sourceMappingURL=recaptcha.d.ts.map
