import { Head, router } from '@inertiajs/react';
import {
    Activity,
    CheckCircle2,
    Clock,
    Copy,
    CornerDownRight,
    Download,
    Eye,
    FileCheck,
    FilePlus2,
    FolderPlus,
    History,
    Lock,
    Pencil,
    RotateCcw,
    Search,
    Share2,
    Shield,
    Trash2,
    Unlock,
    UploadCloud,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ActivityItem } from '@/types/file-management';

interface ActivitiesPageProps {
    activities: {
        data: ActivityItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    users: Array<{ id: number; name: string }>;
    projects: Array<{ id: number; code: string; name: string }>;
    filters: {
        action: string;
        user_id: string;
        project_id: string;
        q: string;
    };
}

export default function ActivitiesIndex({
    activities,
    users,
    projects,
    filters,
}: ActivitiesPageProps) {
    const [searchQuery, setSearchQuery] = useState(filters.q || '');
    const [action, setAction] = useState(filters.action || 'all');
    const [userId, setUserId] = useState(filters.user_id || 'all');
    const [projectId, setProjectId] = useState(filters.project_id || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ q: searchQuery });
    };

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            '/activities',
            {
                action: overrides.action ?? action,
                user_id: overrides.user_id ?? userId,
                project_id: overrides.project_id ?? projectId,
                q: overrides.q ?? searchQuery,
            },
            { preserveState: true, replace: true }
        );
    };

    const getActionIcon = (act: string) => {
        switch (act) {
            case 'uploaded':
                return <UploadCloud className="size-4 text-emerald-600" />;
            case 'downloaded':
                return <Download className="size-4 text-sky-600" />;
            case 'version_created':
                return <History className="size-4 text-indigo-600" />;
            case 'version_restored':
                return <RotateCcw className="size-4 text-purple-600" />;
            case 'created_folder':
                return <FolderPlus className="size-4 text-sky-600" />;
            case 'created_project':
                return <FilePlus2 className="size-4 text-emerald-600" />;
            case 'renamed':
                return <Pencil className="size-4 text-slate-600" />;
            case 'moved':
                return <CornerDownRight className="size-4 text-blue-600" />;
            case 'copied':
                return <Copy className="size-4 text-blue-500" />;
            case 'shared':
                return <Share2 className="size-4 text-teal-600" />;
            case 'locked':
                return <Lock className="size-4 text-amber-600" />;
            case 'unlocked':
                return <Unlock className="size-4 text-emerald-600" />;
            case 'deleted':
                return <Trash2 className="size-4 text-rose-500" />;
            case 'restored':
                return <RotateCcw className="size-4 text-emerald-600" />;
            case 'permanently_deleted':
                return <Trash2 className="size-4 text-rose-700" />;
            default:
                return <Activity className="size-4 text-muted-foreground" />;
        }
    };

    return (
        <>
            <Head title="Security & Audit Trail Log - JNM Files" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <History className="size-6 text-emerald-600" />
                        <span>Security & Audit Activity Trail</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Immutable company audit trail tracking all uploads, downloads, version revisions, lock check-outs, and share actions.
                    </p>
                </div>

                {/* Filters */}
                <div className="p-3.5 rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <form onSubmit={handleSearch} className="relative sm:col-span-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search document name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-xs"
                        />
                    </form>

                    <div>
                        <Select
                            value={action}
                            onValueChange={(val) => {
                                setAction(val);
                                applyFilters({ action: val });
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="All Actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Operations</SelectItem>
                                <SelectItem value="uploaded">Uploads</SelectItem>
                                <SelectItem value="downloaded">Downloads</SelectItem>
                                <SelectItem value="version_created">Version Revisions</SelectItem>
                                <SelectItem value="locked">Check-Outs / Locks</SelectItem>
                                <SelectItem value="unlocked">Lock Releases</SelectItem>
                                <SelectItem value="shared">File Shares</SelectItem>
                                <SelectItem value="moved">File / Folder Moves</SelectItem>
                                <SelectItem value="deleted">Moved to Trash</SelectItem>
                                <SelectItem value="restored">Restored from Trash</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Select
                            value={userId}
                            onValueChange={(val) => {
                                setUserId(val);
                                applyFilters({ user_id: val });
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Filter by Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id.toString()}>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Select
                            value={projectId}
                            onValueChange={(val) => {
                                setProjectId(val);
                                applyFilters({ project_id: val });
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Filter by Project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        {p.code} - {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Audit Table */}
                <div className="rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <th className="py-3 px-4 w-12 text-center"></th>
                                <th className="py-3 px-4">Event Operation</th>
                                <th className="py-3 px-4">Subject Target</th>
                                <th className="py-3 px-4">Project</th>
                                <th className="py-3 px-4">Employee / Actor</th>
                                <th className="py-3 px-4">Details / Notes</th>
                                <th className="py-3 px-4">Timestamp & IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs">
                            {activities.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                        No audit records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                activities.data.map((act) => (
                                    <tr key={act.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center size-7 rounded-lg bg-muted/60">
                                                {getActionIcon(act.action)}
                                            </div>
                                        </td>

                                        <td className="py-3 px-4 font-semibold text-foreground capitalize">
                                            {act.action.replace('_', ' ')}
                                        </td>

                                        <td className="py-3 px-4 font-medium text-foreground">
                                            <span className="truncate max-w-xs block" title={act.subject_name}>
                                                {act.subject_name}
                                            </span>
                                            {act.subject_type && (
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    [{act.subject_type}]
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3 px-4 font-mono text-[11px]">
                                            {act.project ? (
                                                <span className="px-1.5 py-0.5 rounded bg-muted">
                                                    {act.project.code}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>

                                        <td className="py-3 px-4 font-medium text-foreground">
                                            {act.user?.name || 'System / Guest'}
                                        </td>

                                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px] max-w-xs">
                                            {act.details ? (
                                                <span className="truncate block" title={JSON.stringify(act.details)}>
                                                    {JSON.stringify(act.details).replace(/[{}"]/g, ' ')}
                                                </span>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </td>

                                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                            <div>{new Date(act.created_at).toLocaleString()}</div>
                                            {act.ip_address && (
                                                <div className="text-[10px] font-mono text-muted-foreground/80">
                                                    IP: {act.ip_address}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {activities.links && activities.links.length > 3 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total {activities.total} logged audit events</span>
                        <div className="flex items-center gap-1">
                            {activities.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url || link.active}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded border text-xs ${
                                        link.active
                                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                            : link.url
                                              ? 'bg-card text-foreground hover:bg-muted border-border'
                                              : 'text-muted-foreground/40 border-transparent cursor-not-allowed'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

