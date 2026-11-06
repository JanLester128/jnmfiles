import { router } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'light';
let currentUserId: number | null = null;

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const clearGlobalAppearance = (): void => {
    if (typeof window === 'undefined') {
        return;
    }
    // Remove legacy global appearance storage/cookie so one account never affects the whole system
    localStorage.removeItem('appearance');
    document.cookie = 'appearance=;path=/;max-age=0;SameSite=Lax';
};

const getUserStorageKey = (userId: number): string => `appearance_user_${userId}`;

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void => applyTheme(currentAppearance);

export function syncUserAppearance(userId: number | null, serverAppearance?: Appearance): void {
    if (typeof window === 'undefined') {
        return;
    }

    clearGlobalAppearance();
    currentUserId = userId;

    if (userId === null) {
        currentAppearance = 'light';
        applyTheme('light');
        notify();
        return;
    }

    const key = getUserStorageKey(userId);
    const storedForUser = localStorage.getItem(key) as Appearance | null;
    const mode: Appearance =
        serverAppearance && ['light', 'dark', 'system'].includes(serverAppearance)
            ? serverAppearance
            : storedForUser && ['light', 'dark', 'system'].includes(storedForUser)
              ? storedForUser
              : 'light';

    localStorage.setItem(key, mode);
    currentAppearance = mode;
    applyTheme(mode);
    notify();
}

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    clearGlobalAppearance();
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'light',
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance)
        ? 'dark'
        : 'light';

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;

        if (currentUserId !== null && typeof window !== 'undefined') {
            localStorage.setItem(getUserStorageKey(currentUserId), mode);
        }

        applyTheme(mode);
        notify();

        if (currentUserId !== null) {
            router.patch(
                '/settings/appearance',
                { appearance: mode },
                { preserveScroll: true, preserveState: true }
            );
        }
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
