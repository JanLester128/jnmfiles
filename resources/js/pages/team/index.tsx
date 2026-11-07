import { Head, router, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    Edit2,
    KeyRound,
    MessageSquare,
    Search,
    ShieldCheck,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { openChatDrawer } from '@/components/chatbox-drawer';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string | null;
    title: string | null;
    phone: string | null;
    storage_limit_bytes: number;
    actual_storage_used: number;
    is_active: boolean;
    projects_count?: number;
    files_count?: number;
}

interface TeamPageProps {
    team: TeamMember[];
}

export default function TeamIndex({ team }: TeamPageProps) {
    const pageProps = usePage().props as any;
    const currentUserId = pageProps.auth?.user?.id;

    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<TeamMember | null>(null);

    // Create Employee Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('employee');
    const [department, setDepartment] = useState('Land Surveying Operations');
    const [title, setTitle] = useState('Survey Staff');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Employee Form State
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editRole, setEditRole] = useState('employee');
    const [editDept, setEditDept] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editActive, setEditActive] = useState(true);

    const filteredTeam = team.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.role.toLowerCase().includes(search.toLowerCase()) ||
            (u.department || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            '/team',
            {
                name: name.trim(),
                email: email.trim(),
                password,
                role,
                department,
                title,
                storage_limit_gb: 500,
            },
            {
                onSuccess: () => {
                    toast.success(`Employee account '${name}' created`);
                    setName('');
                    setEmail('');
                    setPassword('');
                    setRole('employee');
                    setIsSubmitting(false);
                    setIsAddOpen(false);
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to create employee account');
                },
            }
        );
    };

    const openEdit = (u: TeamMember) => {
        setEditingUser(u);
        setEditName(u.name);
        setEditEmail(u.email);
        setEditPassword('');
        setEditRole(u.role === 'admin' ? 'admin' : 'employee');
        setEditDept(u.department || '');
        setEditTitle(u.title || '');
        setEditActive(u.is_active);
    };

    const handleUpdateEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSubmitting(true);

        router.put(
            `/team/${editingUser.id}`,
            {
                name: editName.trim(),
                email: editEmail.trim(),
                password: editPassword || null,
                role: editRole,
                department: editDept,
                title: editTitle,
                is_active: editActive,
            },
            {
                onSuccess: () => {
                    toast.success(`Updated account for ${editName}`);
                    setIsSubmitting(false);
                    setEditingUser(null);
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to update employee');
                },
            }
        );
    };

    const handleToggleStatus = (member: TeamMember) => {
        router.post(
            `/team/${member.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        member.is_active
                            ? `Disabled login access for ${member.name}`
                            : `Enabled login access for ${member.name}`
                    );
                },
            }
        );
    };

    return (
        <>
            <Head title="Employee Account Management" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Users className="size-6 text-emerald-600" />
                            <span>Employee & Staff Accounts</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Create login accounts for staff/employees and enable or disable their access at any time.
                        </p>
                    </div>

                    <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <UserPlus className="size-4" />
                        <span>Create Employee Account</span>
                    </Button>
                </div>

                {/* Search */}
                <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                    <div className="relative flex-1 sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email/username, or role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                        {filteredTeam.length} Account(s)
                    </span>
                </div>

                {/* Accounts Table */}
                <div className="rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Login Email / Username</th>
                                <th className="py-3 px-4">Role & Department</th>
                                <th className="py-3 px-4">Account Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTeam.map((member) => {
                                const isSelf = member.id === currentUserId;
                                const isMemberAdmin = member.role === 'admin';
                                return (
                                    <tr key={member.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`size-9 rounded-full font-bold flex items-center justify-center shrink-0 border ${
                                                        isMemberAdmin
                                                            ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                                            : 'bg-sky-600/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                                                    }`}
                                                >
                                                    {member.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-foreground text-sm truncate">
                                                        {member.name}
                                                        {isSelf && (
                                                            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                                                                You
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {member.title || 'Staff'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-muted text-foreground">
                                                {member.email}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-xs">
                                            {isMemberAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                                                    <ShieldCheck className="size-3" />
                                                    Administrator
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300">
                                                    <UserCheck className="size-3" />
                                                    Employee / Staff
                                                </span>
                                            )}
                                            <p className="text-muted-foreground mt-1">
                                                {member.department || 'Land Surveying Operations'}
                                            </p>
                                        </td>

                                        <td className="py-3.5 px-4 text-xs">
                                            {member.is_active ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                                    <CheckCircle2 className="size-4" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                                    <Ban className="size-4" />
                                                    Disabled
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!isSelf && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openChatDrawer({ contactId: member.id })}
                                                        className="h-8 text-xs gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                                                    >
                                                        <MessageSquare className="size-3.5" />
                                                        <span>Message</span>
                                                    </Button>
                                                )}

                                                {!isSelf && (
                                                    <Button
                                                        size="sm"
                                                        variant={member.is_active ? 'outline' : 'default'}
                                                        onClick={() => handleToggleStatus(member)}
                                                        className={
                                                            member.is_active
                                                                ? 'h-8 text-xs gap-1 border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                                                : 'h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        }
                                                    >
                                                        {member.is_active ? (
                                                            <>
                                                                <Ban className="size-3.5" />
                                                                <span>Disable Account</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="size-3.5" />
                                                                <span>Enable Account</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEdit(member)}
                                                    className="h-8 text-xs gap-1"
                                                >
                                                    <Edit2 className="size-3.5" />
                                                    <span>Edit</span>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Employee Account Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="size-5 text-emerald-600" />
                            <span>Create Staff / Employee Account</span>
                        </DialogTitle>
                        <DialogDescription>
                            Create login credentials for an employee so they can sign in to the Employee Workspace.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddEmployee} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="mem_name" className="text-xs font-semibold">
                                Employee Full Name *
                            </Label>
                            <Input
                                id="mem_name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Juan Dela Cruz"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="mem_email" className="text-xs font-semibold">
                                    Login Email or Username *
                                </Label>
                                <Input
                                    id="mem_email"
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="staff@jnmfiles.com or staff01"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="mem_pw" className="text-xs font-semibold">
                                    Password *
                                </Label>
                                <Input
                                    id="mem_pw"
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Account Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">Employee / Staff</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="mem_dept" className="text-xs font-semibold">
                                    Department
                                </Label>
                                <Input
                                    id="mem_dept"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="mem_title" className="text-xs font-semibold">
                                Position / Title
                            </Label>
                            <Input
                                id="mem_title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !name.trim() || !email.trim() || !password.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Create Account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Employee Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="size-5 text-emerald-600" />
                            <span>Edit Account & Credentials</span>
                        </DialogTitle>
                        <DialogDescription>
                            Update login email/username, password, or status for <strong className="text-foreground">{editingUser?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateEmployee} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_name" className="text-xs font-semibold">
                                Full Name *
                            </Label>
                            <Input
                                id="edit_name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_email" className="text-xs font-semibold">
                                    Login Email / Username *
                                </Label>
                                <Input
                                    id="edit_email"
                                    type="text"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_pw" className="text-xs font-semibold flex items-center gap-1">
                                    <KeyRound className="size-3" />
                                    New Password (optional)
                                </Label>
                                <Input
                                    id="edit_pw"
                                    type="text"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Role</Label>
                                <Select
                                    value={editRole}
                                    onValueChange={setEditRole}
                                    disabled={editingUser?.id === currentUserId}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">Employee / Staff</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Account Status</Label>
                                <Select
                                    value={editActive ? 'active' : 'disabled'}
                                    onValueChange={(v) => setEditActive(v === 'active')}
                                    disabled={editingUser?.id === currentUserId}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active (Can Sign In)</SelectItem>
                                        <SelectItem value="disabled">Disabled (Blocked)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_dept" className="text-xs font-semibold">
                                    Department
                                </Label>
                                <Input
                                    id="edit_dept"
                                    value={editDept}
                                    onChange={(e) => setEditDept(e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_title" className="text-xs font-semibold">
                                    Position / Title
                                </Label>
                                <Input
                                    id="edit_title"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingUser(null)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
