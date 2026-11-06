import { usePage } from '@inertiajs/react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const pageProps = usePage().props as any;
    const user = pageProps.auth?.user;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || user?.role === 'admin');

    return (
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-4 md:px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {user && (
                <div className="flex items-center gap-3">
                    <div
                        className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                            isAdmin
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
                        }`}
                    >
                        {isAdmin ? (
                            <>
                                <ShieldCheck className="size-3.5" />
                                <span>Admin: {user.name}</span>
                            </>
                        ) : (
                            <>
                                <UserCheck className="size-3.5" />
                                <span>Employee: {user.name}</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
