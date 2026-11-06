import { Form, Head } from '@inertiajs/react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="Sign In - A VERDADE DE TIERRA" />

            {status && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                onError={(errs: Record<string, string>) => {
                    if (errs.email) {
                        toast.error(errs.email);
                    } else if (errs.password) {
                        toast.error(errs.password);
                    }
                }}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {(errors.email || errors.password) && (
                            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <AlertCircle className="size-4 shrink-0" />
                                <span>{errors.email || errors.password}</span>
                            </div>
                        )}

                        <div className="grid gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="email">Email or Username</Label>
                                <Input
                                    id="email"
                                    type="text"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="username"
                                    placeholder="Admin or employee email"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    defaultChecked
                                />
                                <Label htmlFor="remember" className="text-xs font-normal">
                                    Keep me signed in
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Sign In
                            </Button>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                            <span>Staff & employee accounts are created and managed by the Administrator.</span>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'jnm land surveying services',
    description: 'Sign in with your Administrator or Employee credentials',
};
