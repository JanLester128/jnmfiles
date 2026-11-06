import { usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { syncUserAppearance, type Appearance } from '@/hooks/use-appearance';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const pageProps = usePage().props as any;
    const isOpen = pageProps.sidebarOpen;
    const userId: number | null = pageProps.auth?.user?.id ?? null;
    const userAppearance: Appearance | undefined =
        pageProps.auth?.user?.appearance ?? pageProps.appearance;

    useEffect(() => {
        syncUserAppearance(userId, userAppearance);
    }, [userId, userAppearance]);

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return <SidebarProvider defaultOpen={isOpen}>{children}</SidebarProvider>;
}
