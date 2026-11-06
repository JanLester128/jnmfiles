import { Head, Link } from '@inertiajs/react';
import { Clock, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShareExpired() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
            <Head title="Link Expired - JNM Files" />

            <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-5">
                <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
                    <Clock className="size-7" />
                </div>

                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-foreground">Share Link Has Expired</h1>
                    <p className="text-xs text-muted-foreground">
                        The temporary access link for this surveying document has expired per JNM Files security retention policies.
                    </p>
                </div>

                <div className="pt-2">
                    <Button asChild variant="outline" className="text-xs">
                        <Link href="/login">Go to Employee Login</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

