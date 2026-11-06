import { Form, Head, usePage } from '@inertiajs/react';
import { CheckCircle2, KeyRound, Palette, ShieldCheck, UserCog } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AppearanceTabs from '@/components/appearance-tabs';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = Boolean((auth as any)?.isAdmin || auth.user?.role === 'admin');

    return (
        <>
            <Head title="Account Credentials & Profile" />

            <div className="space-y-6 max-w-xl">
                <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        {isAdmin ? <ShieldCheck className="size-5" /> : <UserCog className="size-5" />}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-foreground">
                            {isAdmin ? 'Administrator Account & Login Credentials' : 'Employee Account Settings'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            You can change your display name, login email/username (currently <strong className="text-foreground">{auth.user.email}</strong>), and password below.
                        </p>
                    </div>
                </div>

                {status === 'credentials-updated' && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>Your account email/username and credentials have been updated.</span>
                    </div>
                )}

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="space-y-5 rounded-xl border border-border bg-card p-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    className="block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Login Email or Username</Label>
                                <Input
                                    id="email"
                                    type="text"
                                    className="block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="e.g. Admin or admin@jnmfiles.com"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Use this email or username when signing in.
                                </p>
                                <InputError message={errors.email} />
                            </div>

                            <div className="pt-3 border-t border-border space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <KeyRound className="size-4 text-emerald-600" />
                                    <span>Change Password (leave blank to keep current password)</span>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Enter new password"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        placeholder="Confirm new password"
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <Button
                                    disabled={processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    data-test="update-profile-button"
                                >
                                    Save Account Changes
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Palette className="size-4 text-emerald-600" />
                        <span>Personal Theme (Light / Dark)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Choose Light or Dark mode for your account only. This preference is saved to your personal account and will not affect other users or the whole system.
                    </p>
                    <AppearanceTabs />
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Account Settings',
            href: edit(),
        },
    ],
};
