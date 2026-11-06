import { router, usePage } from '@inertiajs/react';
import {
    Copy,
    CornerDownRight,
    Download,
    Eye,
    History,
    Lock,
    MoreVertical,
    Pencil,
    RotateCcw,
    Share2,
    Star,
    Trash2,
    Unlock,
    UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import FileIcon from '@/components/drive/file-icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FileItem } from '@/types/file-management';

interface FileGridCardProps {
    file: FileItem;
    onPreview: (file: FileItem) => void;
    onVersions: (file: FileItem) => void;
    onUploadRevision: (file: FileItem) => void;
    onShare: (file: FileItem) => void;
    onMove: (file: FileItem) => void;
    onRename: (file: FileItem) => void;
    onLockedClick?: (file: FileItem) => void;
}

export default function FileGridCard({
    file,
    onPreview,
    onVersions,
    onUploadRevision,
    onShare,
    onMove,
    onRename,
    onLockedClick,
}: FileGridCardProps) {
    const pageProps = usePage().props as any;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || pageProps.auth?.user?.role === 'admin');
    const isRestrictedForEmployee = Boolean(file.is_locked && !isAdmin);

    const toggleStar = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isRestrictedForEmployee) return;
        router.post(`/files/${file.id}/star`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(file.is_starred ? 'Removed from starred' : 'Added to starred'),
        });
    };

    const handleCopy = () => {
        router.post(`/files/${file.id}/copy`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('File duplicated'),
        });
    };

    const handleTrash = () => {
        router.delete(`/files/${file.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(`'${file.name}' moved to Trash`),
        });
    };

    const handleRestore = () => {
        router.post(`/files/${file.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(`'${file.name}' restored`),
        });
    };

    const handleForceDelete = () => {
        if (confirm(`Permanently delete '${file.name}'? This cannot be undone.`)) {
            router.delete(`/files/${file.id}/force`, {
                preserveScroll: true,
                onSuccess: () => toast.success(`'${file.name}' permanently deleted`),
            });
        }
    };

    const handleToggleLock = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!isAdmin) return;

        if (file.is_locked) {
            router.post(`/files/${file.id}/unlock`, {}, {
                preserveScroll: true,
                onSuccess: () => toast.success(`File '${file.name}' unlocked for employees`),
            });
        } else {
            router.post(`/files/${file.id}/lock`, { lock_note: 'LOCKED BY ADMIN — Employee Access Restricted' }, {
                preserveScroll: true,
                onSuccess: () => toast.success(`File '${file.name}' is now LOCKED BY ADMIN`),
            });
        }
    };

    const handleCardClick = () => {
        if (isRestrictedForEmployee) {
            if (onLockedClick) {
                onLockedClick(file);
            } else {
                toast.error(`LOCKED BY ADMIN: '${file.name}' cannot be opened by staff.`);
            }
            return;
        }
        onPreview(file);
    };

    return (
        <div
            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                isRestrictedForEmployee
                    ? 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 cursor-not-allowed'
                    : 'border-border bg-card hover:border-emerald-500/50 hover:shadow-md cursor-pointer'
            }`}
            onClick={handleCardClick}
        >
            {/* Top row: Extension badge, Version, Lock action, Star, Menu */}
            <div className="flex items-center justify-between gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/80 whitespace-nowrap">
                        {file.extension || 'FILE'}
                    </span>
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 whitespace-nowrap">
                        v{file.current_version}
                    </span>
                </div>

                {!isRestrictedForEmployee && (
                    <div className="flex items-center gap-0.5 shrink-0">
                        {!file.is_trashed && isAdmin && (
                            <button
                                type="button"
                                onClick={handleToggleLock}
                                className={`p-1.5 rounded-md transition-colors ${
                                    file.is_locked
                                        ? 'text-rose-600 bg-rose-500/10 hover:bg-rose-500/20'
                                        : 'text-muted-foreground hover:text-amber-600 hover:bg-muted/80'
                                }`}
                                title={file.is_locked ? 'Click to Unlock File for Employees' : 'Click to Lock File (Restrict Employees)'}
                            >
                                {file.is_locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                            </button>
                        )}

                        {!file.is_trashed && (
                            <button
                                type="button"
                                onClick={toggleStar}
                                className={`p-1.5 rounded-md hover:bg-muted/80 transition-colors ${
                                    file.is_starred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-amber-500'
                                }`}
                                title={file.is_starred ? 'Unstar' : 'Star'}
                            >
                                <Star className={`size-4 ${file.is_starred ? 'fill-amber-500' : ''}`} />
                            </button>
                        )}

                        {/* Actions Menu */}
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
                                {!file.is_trashed ? (
                                    <>
                                        <DropdownMenuItem onClick={() => onPreview(file)} className="gap-2.5 cursor-pointer">
                                            <Eye className="size-4 text-emerald-600" />
                                            <span>Preview File</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <a href={`/files/${file.id}/download`} download className="gap-2.5 cursor-pointer flex items-center">
                                                <Download className="size-4 text-sky-600" />
                                                <span>Download</span>
                                            </a>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => onVersions(file)} className="gap-2.5 cursor-pointer">
                                            <History className="size-4 text-indigo-600" />
                                            <span>Version History ({file.versions_count || file.current_version})</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => onUploadRevision(file)} className="gap-2.5 cursor-pointer">
                                            <UploadCloud className="size-4 text-purple-600" />
                                            <span>Upload Revision (v{file.current_version + 1})</span>
                                        </DropdownMenuItem>

                                        {isAdmin && (
                                            <DropdownMenuItem onClick={() => handleToggleLock()} className="gap-2.5 cursor-pointer">
                                                {file.is_locked ? (
                                                    <>
                                                        <Unlock className="size-4 text-emerald-600" />
                                                        <span>Unlock File</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="size-4 text-rose-600" />
                                                        <span>Lock File (Admin)</span>
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        )}

                                        <DropdownMenuItem onClick={() => onShare(file)} className="gap-2.5 cursor-pointer">
                                            <Share2 className="size-4 text-teal-600" />
                                            <span>Share File</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem onClick={() => onMove(file)} className="gap-2.5 cursor-pointer">
                                            <CornerDownRight className="size-4 text-blue-600" />
                                            <span>Move to...</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={handleCopy} className="gap-2.5 cursor-pointer">
                                            <Copy className="size-4 text-blue-500" />
                                            <span>Duplicate (Copy)</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => onRename(file)} className="gap-2.5 cursor-pointer">
                                            <Pencil className="size-4 text-slate-600" />
                                            <span>Edit Details & Tags</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem onClick={handleTrash} className="gap-2.5 cursor-pointer text-rose-600 focus:text-rose-600">
                                            <Trash2 className="size-4" />
                                            <span>Move to Trash</span>
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem onClick={handleRestore} className="gap-2.5 cursor-pointer text-emerald-600">
                                            <RotateCcw className="size-4" />
                                            <span>Restore File</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleForceDelete} className="gap-2.5 cursor-pointer text-rose-600">
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

            {/* Thumbnail / Icon center */}
            <div className="relative flex flex-col items-center justify-center py-5 px-2 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                <FileIcon extension={file.extension} category={file.category} className="size-12 stroke-[1.6]" />
                {file.is_locked && (
                    <div
                        className={`mt-2.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                            isRestrictedForEmployee
                                ? 'bg-rose-600 text-white'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}
                        title={file.lock_note || 'LOCKED BY ADMIN'}
                    >
                        <Lock className="size-3 shrink-0" />
                        <span>LOCKED BY ADMIN</span>
                    </div>
                )}
            </div>

            {/* Bottom info */}
            <div className="mt-3">
                <h4
                    className={`truncate text-sm font-semibold ${
                        isRestrictedForEmployee
                            ? 'text-muted-foreground'
                            : 'text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                    }`}
                    title={file.name}
                >
                    {file.name}
                </h4>

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-1.5">
                    <span>{file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`}</span>
                    <div className="flex items-center gap-1 min-w-0">
                        {file.folder && (
                            <span
                                className="truncate max-w-[120px] text-[10px] px-1.5 py-0.5 rounded bg-muted/90 font-medium"
                                title={file.folder.name}
                            >
                                {file.folder.name}
                            </span>
                        )}
                        {file.project && (
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted/90 font-medium">
                                {file.project.code}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tags */}
                {file.tags && file.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {file.tags.slice(0, 2).map((t) => (
                            <span
                                key={t.id}
                                className="text-[10px] px-1.5 py-0.2 rounded font-medium border"
                                style={{
                                    backgroundColor: `${t.color}15`,
                                    borderColor: `${t.color}35`,
                                    color: t.color,
                                }}
                            >
                                {t.name}
                            </span>
                        ))}
                        {file.tags.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">+{file.tags.length - 2}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
