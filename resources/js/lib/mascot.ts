export const MASCOT_NOTIFY_EVENT = 'jnm:mascot-notify';
export const MASCOT_WELCOME_KEY_PREFIX = 'jnm-mascot-welcomed-user-';

export type MascotNotification = {
    variant: 'success';
    title: string;
    message: string;
};

/**
 * Trigger the Geodetic Engineer mascot (lower-right corner) for notifications
 * such as a successful file upload.
 */
export function notifyMascot(notification: MascotNotification): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<MascotNotification>(MASCOT_NOTIFY_EVENT, {
            detail: notification,
        }),
    );
}

/**
 * Reset the welcome-greeting session flag when on the login screen so the
 * mascot greets the user once right after they log in.
 */
export function resetMascotWelcomeSession(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith(MASCOT_WELCOME_KEY_PREFIX) || key === 'jnm-mascot-welcomed') {
                sessionStorage.removeItem(key);
            }
        });
    } catch {
        // Ignore storage errors
    }
}
