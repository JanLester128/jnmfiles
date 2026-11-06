import { Link, usePage } from '@inertiajs/react';
import {
    FolderOpen,
    LayoutDashboard,
    ShieldCheck,
    Star,
    Trash2,
    UserCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

export function AppSidebar() {
    const { url } = usePage();
    const pageProps = usePage().props as any;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || pageProps.auth?.user?.role === 'admin');

    const adminNavItems = [
        {
            href: '/dashboard',
            label: 'Admin Dashboard',
            icon: LayoutDashboard,
            active: url === '/' || url.startsWith('/dashboard'),
        },
        {
            href: '/drive',
            label: 'My Files',
            icon: FolderOpen,
            active: url.startsWith('/drive') && !url.includes('starred=') && !url.includes('trashed='),
        },
        {
            href: '/team',
            label: 'Employee Accounts',
            icon: Users,
            active: url.startsWith('/team'),
        },
        {
            href: '/drive?starred=1',
            label: 'Starred',
            icon: Star,
            active: url.includes('starred=1'),
        },
        {
            href: '/drive?trashed=1',
            label: 'Trash',
            icon: Trash2,
            active: url.includes('trashed=1'),
        },
    ];

    const employeeNavItems = [
        {
            href: '/dashboard',
            label: 'Employee Workspace',
            icon: LayoutDashboard,
            active: url === '/' || url.startsWith('/dashboard'),
        },
        {
            href: '/drive',
            label: 'My Files',
            icon: FolderOpen,
            active: url.startsWith('/drive') && !url.includes('starred=') && !url.includes('trashed='),
        },
        {
            href: '/drive?starred=1',
            label: 'Starred',
            icon: Star,
            active: url.includes('starred=1'),
        },
    ];

    const navItems = isAdmin ? adminNavItems : employeeNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Role Mode Indicator */}
                <div className="px-2 pt-1 group-data-[collapsible=icon]:hidden">
                    {isAdmin ? (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            <ShieldCheck className="size-3.5 shrink-0" />
                            <span>ADMINISTRATOR CONSOLE</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-sky-500/15 border border-sky-500/30 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                            <UserCheck className="size-3.5 shrink-0" />
                            <span>EMPLOYEE WORKSPACE</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="px-2 py-2">
                    <SidebarGroupLabel>
                        {isAdmin ? 'Admin Controls & Files' : 'Staff Navigation'}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
                                    <Link href={item.href}>
                                        <item.icon className="size-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
