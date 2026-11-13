import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ChatboxDrawer } from '@/components/chatbox-drawer';
import { PageSkeleton } from '@/components/page-skeleton';
import { SurveyorMascot } from '@/components/surveyor-mascot';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { url } = usePage();
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [targetUrl, setTargetUrl] = useState(url);
    const navStartRef = useRef<number>(0);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const initialTimer = setTimeout(() => {
            setIsLoadingPage(false);
        }, 220);

        return () => clearTimeout(initialTimer);
    }, []);

    useEffect(() => {
        const removeStart = router.on('start', (event) => {
            const visit = event.detail.visit;
            if (visit.method !== 'get' || visit.prefetch) {
                return;
            }

            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }

            navStartRef.current = Date.now();
            setTargetUrl(visit.url.pathname + visit.url.search);
            setIsLoadingPage(true);
        });

        const removeFinish = router.on('finish', (event) => {
            const visit = event.detail.visit;
            if (visit.method !== 'get' || visit.prefetch) {
                return;
            }

            const elapsed = Date.now() - navStartRef.current;
            const remaining = Math.max(0, 180 - elapsed);

            hideTimerRef.current = setTimeout(() => {
                setIsLoadingPage(false);
            }, remaining);
        });

        return () => {
            removeStart();
            removeFinish();
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, []);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {isLoadingPage ? <PageSkeleton targetUrl={targetUrl || url} /> : children}
            </AppContent>
            <SurveyorMascot />
            <ChatboxDrawer />
        </AppShell>
    );
}
