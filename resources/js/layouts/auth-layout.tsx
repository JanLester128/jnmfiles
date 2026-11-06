import { useEffect } from 'react';
import { resetMascotWelcomeSession } from '@/lib/mascot';
import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    useEffect(() => {
        resetMascotWelcomeSession();
    }, []);

    return (
        <AuthLayoutTemplate title={title} description={description}>
            {children}
        </AuthLayoutTemplate>
    );
}
