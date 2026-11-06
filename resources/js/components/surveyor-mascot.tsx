import { usePage } from '@inertiajs/react';
import { CheckCircle2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MASCOT_NOTIFY_EVENT, MASCOT_WELCOME_KEY_PREFIX } from '@/lib/mascot';
import type { MascotNotification } from '@/lib/mascot';

const WELCOME_IMAGE = '/images/mascot/surveyor-welcome.png';
const SUCCESS_IMAGE = '/images/mascot/surveyor-success.png';
const DISPLAY_DURATION_MS = 3000;
const EXIT_ANIMATION_MS = 350;

type MascotMessage =
    | { variant: 'welcome'; title: string; message: string }
    | MascotNotification;

export function SurveyorMascot() {
    const pageProps = usePage().props as any;
    const user = pageProps.auth?.user;
    const userId = user?.id as number | string | undefined;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || user?.role === 'admin');
    const firstName = (user?.name as string | undefined)?.split(' ')[0];

    const [activeMessage, setActiveMessage] = useState<MascotMessage | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = useCallback(() => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        if (removeTimer.current) {
            clearTimeout(removeTimer.current);
            removeTimer.current = null;
        }
    }, []);

    const dismiss = useCallback(() => {
        clearTimers();
        setIsClosing(true);
        removeTimer.current = setTimeout(() => {
            setActiveMessage(null);
            setIsClosing(false);
        }, EXIT_ANIMATION_MS);
    }, [clearTimers]);

    const show = useCallback(
        (message: MascotMessage, durationMs: number = DISPLAY_DURATION_MS) => {
            clearTimers();
            setIsClosing(false);
            setActiveMessage(message);

            hideTimer.current = setTimeout(() => {
                setIsClosing(true);
                removeTimer.current = setTimeout(() => {
                    setActiveMessage(null);
                    setIsClosing(false);
                }, EXIT_ANIMATION_MS);
            }, durationMs);
        },
        [clearTimers],
    );

    // Pop up the welcome mascot ONLY ONCE right after the user logs in.
    useEffect(() => {
        if (!userId) {
            return;
        }

        const storageKey = `${MASCOT_WELCOME_KEY_PREFIX}${userId}`;
        if (sessionStorage.getItem(storageKey)) {
            return;
        }

        sessionStorage.setItem(storageKey, '1');

        const greetTimer = setTimeout(() => {
            show(
                {
                    variant: 'welcome',
                    title: firstName ? `Welcome, ${firstName}! 👋` : 'Welcome! 👋',
                    message: isAdmin
                        ? 'Welcome back to A VERDADE DE TIERRA. Your survey files and folders are ready for review.'
                        : 'Welcome to A VERDADE DE TIERRA. Ready to upload your DLSD, XML, DWG, JPG and PNG survey files?',
                },
                DISPLAY_DURATION_MS,
            );
        }, 250);

        return () => clearTimeout(greetTimer);
    }, [userId, firstName, isAdmin, show]);

    // Listen for successful file upload notifications and show ONLY the success mascot.
    useEffect(() => {
        const handleNotify = (event: Event) => {
            const detail = (event as CustomEvent<MascotNotification>).detail;

            if (detail) {
                show(detail, DISPLAY_DURATION_MS);
            }
        };

        window.addEventListener(MASCOT_NOTIFY_EVENT, handleNotify);

        return () => window.removeEventListener(MASCOT_NOTIFY_EVENT, handleNotify);
    }, [show]);

    useEffect(() => {
        return () => clearTimers();
    }, [clearTimers]);

    if (!user || !activeMessage) {
        return null;
    }

    const isSuccess = activeMessage.variant === 'success';

    return (
        <div
            className={`pointer-events-none fixed right-3 bottom-2 z-40 flex items-end gap-2 transition-all duration-350 sm:right-5 sm:bottom-3 print:hidden ${
                isClosing
                    ? 'translate-y-8 scale-90 opacity-0'
                    : 'translate-y-0 scale-100 opacity-100 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-300'
            }`}
        >
            {/* Speech bubble */}
            <div
                key={`${activeMessage.variant}-${activeMessage.title}`}
                role="status"
                aria-live="polite"
                className={`animate-mascot-bubble pointer-events-auto relative mb-20 w-60 rounded-2xl border bg-popover/95 p-3.5 text-popover-foreground shadow-lg backdrop-blur-xs sm:w-64 ${
                    isSuccess ? 'border-emerald-500/50' : 'border-border'
                }`}
            >
                <button
                    type="button"
                    onClick={dismiss}
                    className="absolute top-2 right-2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Dismiss"
                >
                    <X className="size-3.5" />
                </button>
                <p className="flex items-center gap-1.5 pr-5 text-sm font-bold">
                    {isSuccess && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
                    <span>{activeMessage.title}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeMessage.message}</p>

                {/* Bubble tail pointing at the mascot */}
                <span
                    className={`absolute -right-1.5 bottom-5 size-3 rotate-45 border-t border-r bg-popover ${
                        isSuccess ? 'border-emerald-500/50' : 'border-border'
                    }`}
                />
            </div>

            {/* Moving Transparent 3D Geodetic Engineer Mascot */}
            <button
                type="button"
                onClick={dismiss}
                className="pointer-events-auto block shrink-0 bg-transparent p-0 focus-visible:outline-none"
                title="Dismiss Geodetic Engineer"
                aria-label="Dismiss mascot greeting"
            >
                <img
                    src={isSuccess ? SUCCESS_IMAGE : WELCOME_IMAGE}
                    alt={
                        isSuccess
                            ? 'Geodetic Engineer mascot celebrating successful file upload'
                            : 'Geodetic Engineer mascot welcoming you'
                    }
                    className="animate-mascot-move size-32 bg-transparent object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.28)] sm:size-40"
                    draggable={false}
                />
            </button>
        </div>
    );
}
