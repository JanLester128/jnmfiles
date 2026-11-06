import { Link } from '@inertiajs/react';
import { ArrowLeft, Globe } from 'lucide-react';
import { useEffect } from 'react';
import { syncUserAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    useEffect(() => {
        syncUserAppearance(null, 'light');
    }, []);

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6 md:p-10">
            <div className="w-full max-w-md sm:fixed sm:top-6 sm:left-6 sm:w-auto z-20">
                <a
                    href="https://jnm-web.vercel.app/"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-700"
                >
                    <ArrowLeft className="size-4 text-emerald-600" />
                    <Globe className="size-3.5 text-emerald-600" />
                    <span>Back to Main Website</span>
                </a>
            </div>
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <img
                                src="/logo.png"
                                alt="A VERDADE DE TIERRA"
                                className="size-16 rounded-2xl object-contain bg-white p-1.5 shadow-xs ring-1 ring-border"
                            />
                        </Link>

                        <div className="space-y-1">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">
                                A VERDADE DE TIERRA
                            </p>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">
                                {title || 'jnm land surveying services'}
                            </h1>
                            {description && (
                                <p className="text-xs text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
