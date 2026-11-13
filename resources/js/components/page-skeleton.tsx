import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
    targetUrl?: string;
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1650px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-32 rounded-lg" />
                    <Skeleton className="h-9 w-36 rounded-lg" />
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-border bg-card p-4 flex items-center justify-between"
                    >
                        <div className="space-y-2">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="size-11 rounded-xl shrink-0" />
                    </div>
                ))}
            </div>

            {/* Two-Column Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-9 rounded-lg shrink-0" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-28" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-20 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <Skeleton className="h-5 w-36" />
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-3 py-1.5">
                                <Skeleton className="size-8 rounded-full shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-3.5 w-full" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function WorkLogsTableSkeleton({ isPrintQueue = false }: { isPrintQueue?: boolean }) {
    return (
        <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1650px] mx-auto w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <Skeleton className="size-7 rounded-md" />
                        <Skeleton className="h-7 w-52" />
                    </div>
                    <Skeleton className="h-4 w-[420px] max-w-full" />
                </div>
                {!isPrintQueue && <Skeleton className="h-9 w-36 rounded-md" />}
            </div>

            {/* Info Banner */}
            {!isPrintQueue && (
                <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                    <Skeleton className="size-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            )}

            {/* Summary Cards */}
            <div
                className={`grid grid-cols-1 ${
                    isPrintQueue ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
                } gap-3`}
            >
                {Array.from({ length: isPrintQueue ? 3 : 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between"
                    >
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-7 w-12" />
                        </div>
                        <Skeleton className="size-9 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Search & Filters Bar */}
            <div className="p-3 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-3">
                <Skeleton className="h-9 w-72 max-w-full rounded-md" />
                <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-8 w-36 rounded-md" />
                    {!isPrintQueue && (
                        <>
                            <Skeleton className="h-8 w-36 rounded-md" />
                            <Skeleton className="h-8 w-40 rounded-md" />
                            <Skeleton className="h-8 w-32 rounded-md" />
                        </>
                    )}
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
                <div className="border-b border-border bg-emerald-950/85 px-3 py-3.5 grid grid-cols-9 gap-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="h-4 w-full bg-emerald-800/60 dark:bg-emerald-800/60"
                        />
                    ))}
                </div>
                <div className="divide-y divide-border">
                    {Array.from({ length: 7 }).map((_, rowIdx) => (
                        <div
                            key={rowIdx}
                            className="px-3 py-3 grid grid-cols-9 gap-3 items-center"
                        >
                            <Skeleton className="h-7 w-28 rounded-md" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-full rounded-md" />
                            <Skeleton className="h-8 w-full rounded-md" />
                            <Skeleton className="h-7 w-28 rounded-md" />
                            <Skeleton className="h-7 w-24 rounded-md" />
                            <div className="flex items-center justify-end gap-1.5">
                                <Skeleton className="h-7 w-16 rounded-md" />
                                <Skeleton className="h-7 w-14 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
                    <Skeleton className="h-3.5 w-44" />
                    <Skeleton className="h-3.5 w-72" />
                </div>
            </div>
        </div>
    );
}

function DriveSkeleton() {
    return (
        <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1650px] mx-auto w-full">
            {/* Breadcrumb & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-6 w-48 rounded-md" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-64 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                ))}
            </div>

            {/* Folders Section */}
            <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3"
                        >
                            <Skeleton className="size-10 rounded-lg shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Files Section */}
            <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-border bg-card p-3.5 space-y-3"
                        >
                            <Skeleton className="h-32 w-full rounded-lg" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TeamSkeleton() {
    return (
        <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1650px] mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-9 w-40 rounded-lg" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-border bg-card p-4 flex items-center justify-between"
                    >
                        <div className="space-y-2">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-7 w-14" />
                        </div>
                        <Skeleton className="size-10 rounded-xl" />
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="p-4 flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-10 rounded-full shrink-0" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PageSkeleton({ targetUrl = '' }: PageSkeletonProps) {
    const path = targetUrl.split('?')[0] || '';

    if (path.startsWith('/work-logs/print-queue')) {
        return <WorkLogsTableSkeleton isPrintQueue />;
    }

    if (path.startsWith('/work-logs')) {
        return <WorkLogsTableSkeleton />;
    }

    if (path.startsWith('/drive') || path.startsWith('/shared-with-me') || path.startsWith('/library')) {
        return <DriveSkeleton />;
    }

    if (path.startsWith('/team')) {
        return <TeamSkeleton />;
    }

    return <DashboardSkeleton />;
}

