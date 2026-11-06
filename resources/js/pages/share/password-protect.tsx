import { Head, useForm } from '@inertiajs/react';
import { Compass, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordProtectProps {
    token: string;
    shareable_type: string;
}

export default function PasswordProtect({ token, shareable_type }: PasswordProtectProps) {
    const { data, setData, post, processing, errors } = useForm({
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/s/${token}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
            <Head title="Password Protected Document - JNM Files" />

            <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
                <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                    <Lock className="size-7" />
                </div>

                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-foreground">Password Protected {shareable_type}</h1>
                    <p className="text-xs text-muted-foreground">
                        This confidential engineering document is password-protected. Please enter the access key provided by JNM Files.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                        <Label htmlFor="pass_input" className="text-xs font-semibold">
                            Enter Password / Access Key
                        </Label>
                        <Input
                            id="pass_input"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="••••••••"
                            required
                            autoFocus
                        />
                        {errors.password && (
                            <p className="text-xs text-rose-600 font-medium">{errors.password}</p>
                        )}
                    </div>

                    <Button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        {processing ? 'Verifying...' : 'Unlock Document'}
                    </Button>
                </form>

                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    Secure AES-256 Cloud Document Encryption
                </p>
            </div>
        </div>
    );
}

