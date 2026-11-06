import { Link, router, usePage } from '@inertiajs/react';
import {
    Archive,
    Copy,
    CornerDownRight,
    Edit2,
    Folder,
    FolderOpen,
    FolderPlus,
    Lock,
    MoreVertical,
    RotateCcw,
    Share2,
    Star,
    Trash2,
    Unlock,
    UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FolderItem } from '@/types/file-management';

interface FolderCardProps {
    folder: FolderItem;
    onRename?: (folder: FolderItem) => void;
    onMove?: (folder: FolderItem) => void;
    onShare?: (folder: FolderItem) => void;
    onUploadInto?: (folder: FolderItem) => void;
    onCreateSubfolder?: (folder: FolderItem) => void;
    onLockedClick?: (folder: FolderItem) => void;
}

export default function FolderCard({
    folder,
    onRename,
    onMove,
    onShare,
    onUploadInto,
    onCreateSubfolder,
    onLockedClick,
}: FolderCardProps) {
    const pageProps = usePage().props as any;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || pageProps.auth?.user?.role === 'admin');
    const isRestrictedForEmployee = Boolean(folder.is_locked && !isAdmin);

    const toggleStar = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isRestrictedForEmployee) return;
        router.post(
            `/folders/${folder.id}/star`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(folder.is_starred ? 'Removed from starred' : 'Added to starred'),
            }
        );
    };

    const handleCopy = () => {
        router.post(
            `/folders/${folder.id}/copy`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Folder duplicated'),
            }
        );
    };

    const handleTrash = () => {
        router.delete(`/folders/${folder.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(`Folder '${folder.name}' moved to Trash`),
        });
    };

    const handleRestore = () => {
        router.post(
            `/folders/${folder.id}/restore`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Folder '${folder.name}' restored`),
            }
        );
    };

    const handleForceDelete = () => {
        if (confirm(`Permanently delete folder '${folder.name}' and all its contents? This cannot be undone.`)) {
            router.delete(`/folders/${folder.id}/force`, {
                preserveScroll: true,
                onSuccess: () => toast.success(`Folder '${folder.name}' permanently deleted`),
            });
        }
    };

    const handleToggleLock = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!isAdmin) return;

        if (folder.is_locked) {
            router.post(
                `/folders/${folder.id}/unlock`,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => toast.success(`Folder '${folder.name}' unlocked for employees`),
                }
            );
        } else {
            router.post(
                `/folders/${folder.id}/lock`,
                { lock_reason: 'Locked by Administrator - Employee Access Restricted' },
                {
                    preserveScroll: true,
                    onSuccess: () => toast.success(`Folder '${folder.name}' locked. Employees cannot open it.`),
                }
            );
        }
    };

    const handleFolderClick = (e: React.MouseEvent) => {
        if (isRestrictedForEmployee) {
            e.preventDefault();
            e.stopPropagation();
            if (onLockedClick) {
                onLockedClick(folder);
            } else {
                toast.error(`Access Denied: '${folder.name}' is locked by the Administrator.`);
            }
        }
    };

    const folderHref = `/drive?folder_id=${folder.id}${folder.project_id ? `&project_id=${folder.project_id}` : ''}`;

    return (
        <div
            onClick={isRestrictedForEmployee ? handleFolderClick : undefined}
            className={`group relative flex items-center justify-between gap-2 p-3.5 rounded-xl border transition-all ${
                isRestrictedForEmployee
                    ? 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 cursor-not-allowed'
                    : 'border-border bg-card hover:bg-accent/40 hover:border-emerald-500/40 hover:shadow-xs'
            }`}
        >
            <Link
                href={isRestrictedForEmployee ? '#' : folderHref}
                onClick={handleFolderClick}
                className="flex items-center gap-3 flex-1 min-w-0"
            >
                <div
                    className="relative flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                        backgroundColor: isRestrictedForEmployee ? '#e11d4820' : `${folder.color || '#059669'}20`,
                        color: isRestrictedForEmployee ? '#e11d48' : folder.color || '#059669',
                    }}
                >
                    <Folder className="size-5 fill-current" />
                    {folder.is_locked && (
                        <span className="absolute -top-1 -right-1 size-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                            <Lock className="size-2.5" />
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p
                        className={`truncate text-sm font-semibold ${
                            isRestrictedForEmployee
                                ? 'text-muted-foreground'
                                : 'text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                        }`}
                        title={folder.name}
                    >
                        {folder.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {folder.files_count ?? 0} {(folder.files_count ?? 0) === 1 ? 'file' : 'files'}
                        </span>
                        {folder.is_locked && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                <Lock className="size-2.5 shrink-0" />
                                <span>LOCKED BY ADMIN</span>
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Action buttons */}
            {!isRestrictedForEmployee && (
                <div className="flex items-center gap-0.5 shrink-0">
                    {/* Direct 1-click Lock / Unlock button for Admin */}
                    {!folder.is_trashed && isAdmin && (
                        <button
                            type="button"
                            onClick={handleToggleLock}
                            className={`p-1.5 rounded-md transition-colors ${
                                folder.is_locked
                                    ? 'text-rose-600 bg-rose-500/10 hover:bg-rose-500/20'
                                    : 'text-muted-foreground hover:text-amber-600 hover:bg-muted/80'
                            }`}
                            title={folder.is_locked ? 'Click to Unlock Folder for Employees' : 'Click to Lock Folder (Restrict Employees)'}
                        >
                            {folder.is_locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                        </button>
                    )}

                    {!folder.is_trashed && (
                        <button
                            type="button"
                            onClick={toggleStar}
                            className={`p-1.5 rounded-md hover:bg-muted/80 transition-colors ${
                                folder.is_starred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-amber-500'
                            }`}
                            title={folder.is_starred ? 'Unstar' : 'Star'}
                        >
                            <Star className={`size-4 ${folder.is_starred ? 'fill-amber-500' : ''}`} />
                        </button>
                    )}

                    {/* Dropdown Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <MoreVertical className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            {!folder.is_trashed ? (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link href={folderHref} className="gap-2 cursor-pointer">
                                            <FolderOpen className="size-4 text-sky-600" />
                                            <span>Open Folder</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    {onUploadInto && (
                                        <DropdownMenuItem onClick={() => onUploadInto(folder)} className="gap-2 cursor-pointer">
                                            <UploadCloud className="size-4 text-emerald-600" />
                                            <span>Upload Files Here</span>
                                        </DropdownMenuItem>
                                    )}
                                    {onCreateSubfolder && (
                                        <DropdownMenuItem onClick={() => onCreateSubfolder(folder)} className="gap-2 cursor-pointer">
                                            <FolderPlus className="size-4 text-sky-600" />
                                            <span>New Subfolder</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem asChild>
                                        <a href={`/folders/${folder.id}/download`} className="gap-2 cursor-pointer flex items-center">
                                            <Archive className="size-4 text-amber-600" />
                                            <span>Download as ZIP</span>
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {onRename && (
                                        <DropdownMenuItem onClick={() => onRename(folder)} className="gap-2 cursor-pointer">
                                            <Edit2 className="size-4 text-slate-600" />
                                            <span>Rename</span>
                                        </DropdownMenuItem>
                                    )}
                                    {onMove && (
                                        <DropdownMenuItem onClick={() => onMove(folder)} className="gap-2 cursor-pointer">
                                            <CornerDownRight className="size-4 text-indigo-600" />
                                            <span>Move to...</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
                                        <Copy className="size-4 text-blue-600" />
                                        <span>Duplicate</span>
                                    </DropdownMenuItem>
                                    {onShare && (
                                        <DropdownMenuItem onClick={() => onShare(folder)} className="gap-2 cursor-pointer">
                                            <Share2 className="size-4 text-teal-600" />
                                            <span>Share Folder</span>
                                        </DropdownMenuItem>
                                    )}
                                    {isAdmin && (
                                        <DropdownMenuItem onClick={() => handleToggleLock()} className="gap-2 cursor-pointer">
                                            {folder.is_locked ? (
                                                <>
                                                    <Unlock className="size-4 text-emerald-600" />
                                                    <span>Unlock Folder</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="size-4 text-rose-600" />
                                                    <span>Lock Folder</span>
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleTrash} className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600">
                                        <Trash2 className="size-4" />
                                        <span>Move to Trash</span>
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={handleRestore} className="gap-2 cursor-pointer text-emerald-600">
                                        <RotateCcw className="size-4" />
                                        <span>Restore Folder</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleForceDelete} className="gap-2 cursor-pointer text-rose-600">
                                        <Trash2 className="size-4" />
                                        <span>Permanently Delete</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
}
