import { Head, Link, usePage } from '@inertiajs/react';
import {
    Download,
    FileText,
    FolderOpen,
    HardDrive,
    Lock,
    ShieldAlert,
    ShieldCheck,
    UploadCloud,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import FileIcon from '@/components/drive/file-icon';
import FilePreviewModal from '@/components/drive/file-preview-modal';
import FolderCard from '@/components/drive/folder-card';
import NewFolderModal from '@/components/drive/new-folder-modal';
import UploadModal from '@/components/drive/upload-modal';
import VersionHistoryModal from '@/components/drive/version-history-modal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ActivityItem, FileItem, FolderItem } from '@/types/file-management';

interface DashboardProps {
    stats: {
        total_files: number;
        total_folders: number;
        locked_folders: number;
        locked_files?: number;
        locked_by_admin?: number;
        unlocked_folders: number;
        shared_files: number;
        total_storage_bytes: number;
        user_storage_limit: number;
        total_employees: number;
        active_employees: number;
        disabled_employees: number;
    };
    root_folders: FolderItem[];
    recent_files: FileItem[];
    recent_activities: ActivityItem[];
}

const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + ' GB';
    }

    if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    if (bytes >= 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    }

    return bytes + ' B';
};

export default function Dashboard({
    stats,
    root_folders = [],
    recent_files = [],
    recent_activities = [],
}: DashboardProps) {
    const pageProps = usePage().props as any;
    const user = pageProps.auth?.user;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || user?.role === 'admin');

    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [versionFile, setVersionFile] = useState<FileItem | null>(null);
    const [uploadTargetFolder, setUploadTargetFolder] = useState<FolderItem | null | undefined>(undefined);
    const [newFolderParent, setNewFolderParent] = useState<FolderItem | null | undefined>(undefined);
    const [lockedItemAlert, setLockedItemAlert] = useState<{ name: string; type: 'file' | 'folder'; reason?: string | null } | null>(null);

    const storageLimit = stats.user_storage_limit || 536870912000; // 500 GB
    const storagePercent = Math.min(100, (stats.total_storage_bytes / storageLimit) * 100);
    const hasFiles = recent_files.length > 0;

    return (
        <>
            <Head title={isAdmin ? 'Admin Dashboard' : 'Employee Workspace'} />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
                {isAdmin ? (
                    /* =========================================================
                       ADMINISTRATOR UI
                       ========================================================= */
                    <>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white shadow-sm border border-emerald-800/40">
                            <div className="flex items-center gap-4">
                                <img
                                    src="/logo.png"
                                    alt="A VERDADE DE TIERRA"
                                    className="size-14 shrink-0 rounded-xl object-contain bg-white p-1 shadow-xs"
                                />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            <ShieldCheck className="size-3.5" />
                                            Administrator Console
                                        </span>
                                    </div>
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">
                                        A VERDADE DE TIERRA
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-300">
                                        jnm land surveying services • Manage employee accounts, lock confidential folders, and oversee all files.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Admin Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Storage Used</span>
                                    <HardDrive className="size-4 text-emerald-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-semibold">{formatBytes(stats.total_storage_bytes)}</span>
                                    <span className="text-xs text-muted-foreground">/ {formatBytes(storageLimit)}</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.max(2, storagePercent)}%` }} />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Total Files</span>
                                    <FileText className="size-4 text-sky-600" />
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{stats.total_files}</div>
                                <p className="text-xs text-muted-foreground mt-1">DLSD, XML, DWG, JPG, PNG</p>
                            </div>

                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Locked by Admin</span>
                                    <Lock className="size-4 text-rose-600" />
                                </div>
                                <div className="mt-2 text-2xl font-semibold text-rose-600">
                                    {stats.locked_by_admin ?? stats.locked_folders}
                                </div>
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
                                    {stats.locked_folders} folder(s) • {stats.locked_files ?? 0} file(s)
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Employee Accounts</span>
                                    <Users className="size-4 text-indigo-600" />
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{stats.total_employees}</div>
                                <p className="text-xs text-emerald-600 font-medium mt-1">
                                    {stats.active_employees} active • {stats.disabled_employees} disabled
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    /* =========================================================
                       EMPLOYEE / STAFF UI
                       ========================================================= */
                    <>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-sky-950 via-blue-900 to-slate-900 text-white shadow-sm border border-sky-800/40">
                            <div className="flex items-center gap-4">
                                <img
                                    src="/logo.png"
                                    alt="A VERDADE DE TIERRA"
                                    className="size-14 shrink-0 rounded-xl object-contain bg-white p-1 shadow-xs"
                                />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
                                            <UserCheck className="size-3.5" />
                                            Staff / Employee Workspace
                                        </span>
                                    </div>
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                        Welcome, {user?.name || 'Employee'}
                                    </h1>
                                    <p className="text-xs sm:text-sm text-sky-200/90">
                                        A VERDADE DE TIERRA — jnm land surveying services • Upload and organize DLSD, XML, DWG, JPG, and PNG survey files.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Employee Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl border border-sky-500/20 bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Accessible Folders</span>
                                    <FolderOpen className="size-4 text-sky-600" />
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{stats.unlocked_folders}</div>
                                <p className="text-xs text-muted-foreground mt-1">Open for employee uploads</p>
                            </div>

                            <div className="p-4 rounded-xl border border-rose-500/20 bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Locked by Admin</span>
                                    <Lock className="size-4 text-rose-600" />
                                </div>
                                <div className="mt-2 text-2xl font-semibold text-rose-600">
                                    {stats.locked_by_admin ?? stats.locked_folders}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.locked_folders} folder(s) • {stats.locked_files ?? 0} file(s) restricted
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Available Files</span>
                                    <FileText className="size-4 text-emerald-600" />
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{stats.total_files}</div>
                                <p className="text-xs text-muted-foreground mt-1">In unlocked folders</p>
                            </div>

                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium uppercase tracking-wider">Storage Limit</span>
                                    <HardDrive className="size-4 text-amber-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-semibold">{formatBytes(stats.total_storage_bytes)}</span>
                                    <span className="text-xs text-muted-foreground">/ {formatBytes(storageLimit)}</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-sky-600 rounded-full" style={{ width: `${Math.max(2, storagePercent)}%` }} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Folders Section (Shows Lock Authority for Admin, Lock Restriction for Employee) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold">
                                {isAdmin ? 'Folders & Lock Control' : 'Company Folders'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {isAdmin
                                    ? 'Click the lock icon on any folder to lock or unlock it for employees.'
                                    : 'Open any unlocked folder to upload files or create subfolders. Locked folders cannot be opened.'}
                            </p>
                        </div>
                        <Link href="/drive" className="text-xs font-semibold text-emerald-600 hover:underline">
                            View All in My Files →
                        </Link>
                    </div>

                    {root_folders.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {root_folders.map((folder) => (
                                <FolderCard
                                    key={folder.id}
                                    folder={folder}
                                    onUploadInto={(fol) => setUploadTargetFolder(fol)}
                                    onCreateSubfolder={(fol) => setNewFolderParent(fol)}
                                    onLockedClick={(fol) => setLockedItemAlert({ name: fol.name, type: 'folder', reason: fol.lock_reason })}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 rounded-xl border border-dashed bg-card text-center">
                            <p className="text-sm font-medium text-foreground">No folders created yet</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Go to My Files to create folders and organize your DLSD, XML, DWG, JPG, and PNG files.
                            </p>
                        </div>
                    )}
                </div>

                {/* Recent Files */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">Recent Files</h2>
                        <Link href="/drive" className="text-xs font-semibold text-emerald-600 hover:underline">
                            Open My Files →
                        </Link>
                    </div>

                    {hasFiles ? (
                        <div className="divide-y rounded-xl border bg-card overflow-hidden">
                            {recent_files.map((file) => {
                                const isFileRestricted = Boolean(file.is_locked && !isAdmin);
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => {
                                            if (isFileRestricted) {
                                                setLockedItemAlert({ name: file.name, type: 'file', reason: file.lock_note });
                                                return;
                                            }
                                            setPreviewFile(file);
                                        }}
                                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${isFileRestricted ? 'bg-rose-500/5 cursor-not-allowed' : 'hover:bg-muted/40 cursor-pointer'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileIcon extension={file.extension} category={file.category} className="size-7 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                                    {file.is_locked && (
                                                        <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                            <Lock className="size-2.5 shrink-0" />
                                                            <span>LOCKED BY ADMIN</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {file.formatted_size || formatBytes(file.size_bytes)}
                                                    {file.folder && ` • ${file.folder.name}`}
                                                </p>
                                            </div>
                                        </div>
                                        {!isFileRestricted ? (
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="ghost"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <a href={`/files/${file.id}/download`} download>
                                                    <Download className="size-4" />
                                                </a>
                                            </Button>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 shrink-0">
                                                <Lock className="size-3.5 shrink-0" />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed bg-card">
                            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                                <UploadCloud className="size-6" />
                            </div>
                            <h3 className="text-sm font-semibold">No files uploaded yet</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                Open My Files to upload your DLSD, XML, DWG, JPG, and PNG files into any unlocked folder.
                            </p>
                        </div>
                    )}
                </div>

                {/* Recent Activity (Admin Only) */}
                {isAdmin && recent_activities.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-base font-semibold">Recent System Activity</h2>
                        <div className="rounded-xl border bg-card divide-y">
                            {recent_activities.slice(0, 6).map((activity) => (
                                <div key={activity.id} className="p-3 text-sm flex items-center justify-between gap-3">
                                    <span className="truncate">
                                        <span className="font-medium">{activity.user?.name || 'System'}</span>{' '}
                                        <span className="text-muted-foreground">{activity.action.replaceAll('_', ' ')}</span>{' '}
                                        <span className="font-medium">{activity.subject_name}</span>
                                    </span>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {new Date(activity.created_at).toLocaleString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Locked File / Folder Restriction Alert Modal for Employees */}
            <Dialog open={!!lockedItemAlert} onOpenChange={(open) => !open && setLockedItemAlert(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <ShieldAlert className="size-5" />
                            <span>LOCKED BY ADMIN</span>
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-2">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                <Lock className="size-3" />
                                <span>LOCKED BY ADMIN</span>
                            </div>
                            <p className="text-sm text-foreground font-medium">
                                You cannot open or access the {lockedItemAlert?.type || 'item'}{' '}
                                <strong className="font-bold">"{lockedItemAlert?.name}"</strong> because it is marked as{' '}
                                <strong className="text-rose-600 font-bold">LOCKED BY ADMIN</strong>.
                            </p>
                            {lockedItemAlert?.reason && (
                                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                                    <Lock className="size-4 shrink-0 mt-0.5 text-rose-600" />
                                    <span>{lockedItemAlert.reason}</span>
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setLockedItemAlert(null)} className="bg-rose-600 hover:bg-rose-700 text-white">
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <UploadModal
                isOpen={uploadTargetFolder !== undefined}
                onClose={() => setUploadTargetFolder(undefined)}
                currentFolderId={uploadTargetFolder?.id}
                currentFolderName={uploadTargetFolder?.name}
            />

            <NewFolderModal
                isOpen={newFolderParent !== undefined}
                onClose={() => setNewFolderParent(undefined)}
                currentFolderId={newFolderParent?.id}
                currentFolderName={newFolderParent?.name}
            />

            <FilePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                onOpenVersions={(file) => {
                    setPreviewFile(null);
                    setVersionFile(file);
                }}
            />

            <VersionHistoryModal file={versionFile} isOpen={!!versionFile} onClose={() => setVersionFile(null)} />
        </>
    );
}
