import { Link, router, usePage } from '@inertiajs/react';
import {
    Copy,
    CornerDownRight,
    Download,
    Eye,
    Folder,
    History,
    Lock,
    MoreHorizontal,
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
import type { FileItem, FolderItem } from '@/types/file-management';

interface FileListTableProps {
    folders: FolderItem[];
    files: FileItem[];
    onPreview: (file: FileItem) => void;
    onVersions: (file: FileItem) => void;
    onUploadRevision: (file: FileItem) => void;
    onShareFile: (file: FileItem) => void;
    onShareFolder?: (folder: FolderItem) => void;
    onMoveFile: (file: FileItem) => void;
    onMoveFolder?: (folder: FolderItem) => void;
    onRenameFile: (file: FileItem) => void;
    onRenameFolder?: (folder: FolderItem) => void;
    onLockedFolderClick?: (folder: FolderItem) => void;
    onLockedFileClick?: (file: FileItem) => void;
}

export default function FileListTable({
    folders,
    files,
    onPreview,
    onVersions,
    onUploadRevision,
    onShareFile,
    onShareFolder,
    onMoveFile,
    onMoveFolder,
    onRenameFile,
    onRenameFolder,
    onLockedFolderClick,
    onLockedFileClick,
}: FileListTableProps) {
    const pageProps = usePage().props as any;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || pageProps.auth?.user?.role === 'admin');
    const toggleFileStar = (file: FileItem, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(`/files/${file.id}/star`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(file.is_starred ? 'Removed from starred' : 'Added to starred'),
        });
    };

    const toggleFolderStar = (folder: FolderItem, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(`/folders/${folder.id}/star`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(folder.is_starred ? 'Removed from starred' : 'Added to starred'),
        });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-3 w-10 text-center"></th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Last Modified</th>
                        <th className="py-3 px-4 w-12 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {/* Folders first, like Windows Explorer */}
                    {folders.map((folder) => {
                        const isRestricted = Boolean(folder.is_locked && !isAdmin);
                        const folderHref = `/drive?folder_id=${folder.id}${folder.project_id ? `&project_id=${folder.project_id}` : ''}`;
                        const handleFolderRowClick = (e: React.MouseEvent) => {
                            if (isRestricted) {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onLockedFolderClick) {
                                    onLockedFolderClick(folder);
                                }
                            }
                        };
                        return (
                            <tr
                                key={`folder-${folder.id}`}
                                className={`group transition-colors ${isRestricted ? 'bg-rose-500/5 cursor-not-allowed' : 'hover:bg-muted/40 cursor-pointer'}`}
                                onClick={isRestricted ? handleFolderRowClick : undefined}
                            >
                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    {!folder.is_trashed && !isRestricted && (
                                        <button
                                            type="button"
                                            onClick={(e) => toggleFolderStar(folder, e)}
                                            className="text-muted-foreground hover:text-amber-500"
                                        >
                                            <Star className={`size-4 ${folder.is_starred ? 'text-amber-500 fill-amber-500' : ''}`} />
                                        </button>
                                    )}
                                </td>

                                <td className="py-2.5 px-4 font-medium text-foreground">
                                    <Link href={isRestricted ? '#' : folderHref} onClick={handleFolderRowClick} className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="flex aspect-square size-7 items-center justify-center rounded-md shrink-0"
                                            style={{ backgroundColor: `${folder.color || '#059669'}20`, color: folder.color || '#059669' }}
                                        >
                                            <Folder className="size-4 fill-current" />
                                        </div>
                                        <span className="truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 font-semibold">
                                            {folder.name}
                                        </span>
                                        {folder.is_locked && (
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                <Lock className="size-2.5 shrink-0" />
                                                <span>LOCKED BY ADMIN</span>
                                            </span>
                                        )}
                                    </Link>
                                </td>

                                <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                                    <span className="capitalize">{folder.category?.replace('_', ' ') || 'Folder'}</span>
                                </td>

                                <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                                    {folder.files_count ?? 0} {(folder.files_count ?? 0) === 1 ? 'file' : 'files'}
                                </td>

                                <td className="py-2.5 px-4 text-xs">
                                    {folder.project ? (
                                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                                            {folder.project.code}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </td>

                                <td className="py-2.5 px-4 text-xs text-muted-foreground">
                                    {formatDate(folder.updated_at)}
                                </td>

                                <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    {!isRestricted ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                                                    <MoreHorizontal className="size-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuItem asChild>
                                                    <Link href={folderHref} className="gap-2 cursor-pointer">
                                                        <Folder className="size-4 text-sky-600" />
                                                        <span>Open Folder</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                {onRenameFolder && (
                                                    <DropdownMenuItem onClick={() => onRenameFolder(folder)} className="gap-2 cursor-pointer">
                                                        <Pencil className="size-4" />
                                                        <span>Rename</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {onMoveFolder && (
                                                    <DropdownMenuItem onClick={() => onMoveFolder(folder)} className="gap-2 cursor-pointer">
                                                        <CornerDownRight className="size-4" />
                                                        <span>Move</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600">
                                            <Lock className="size-3" />
                                            Locked
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}

                    {/* Files */}
                    {files.map((file) => {
                        const isFileRestricted = Boolean(file.is_locked && !isAdmin);
                        const handleFileRowClick = () => {
                            if (isFileRestricted) {
                                if (onLockedFileClick) {
                                    onLockedFileClick(file);
                                }
                                return;
                            }
                            onPreview(file);
                        };
                        return (
                        <tr
                            key={`file-${file.id}`}
                            className={`group transition-colors ${isFileRestricted ? 'bg-rose-500/5 cursor-not-allowed' : 'hover:bg-muted/40 cursor-pointer'}`}
                            onClick={handleFileRowClick}
                        >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                {!file.is_trashed && !isFileRestricted && (
                                    <button
                                        type="button"
                                        onClick={(e) => toggleFileStar(file, e)}
                                        className="text-muted-foreground hover:text-amber-500"
                                    >
                                        <Star className={`size-4 ${file.is_starred ? 'text-amber-500 fill-amber-500' : ''}`} />
                                    </button>
                                )}
                            </td>

                            <td className="py-2.5 px-4">
                                <div className="flex items-center gap-3">
                                    <div className="shrink-0">
                                        <FileIcon extension={file.extension} category={file.category} className="size-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate max-w-xs md:max-w-md">
                                                {file.name}
                                            </span>
                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                                v{file.current_version}
                                            </span>
                                            {file.is_locked && (
                                                <span
                                                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                                    title={file.lock_note || 'LOCKED BY ADMIN'}
                                                >
                                                    <Lock className="size-2.5 shrink-0" />
                                                    <span>LOCKED BY ADMIN</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <td className="py-2.5 px-4 text-xs capitalize text-muted-foreground">
                                {file.category.replace('_', ' ')}
                            </td>

                            <td className="py-2.5 px-4 text-xs font-mono text-muted-foreground">
                                {file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`}
                            </td>

                            <td className="py-2.5 px-4 text-xs">
                                {file.project ? (
                                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted font-medium">
                                        {file.project.code}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </td>

                            <td className="py-2.5 px-4 text-xs text-muted-foreground">
                                {formatDate(file.updated_at)}
                            </td>

                            <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                {!isFileRestricted ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                                                <MoreHorizontal className="size-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => onPreview(file)} className="gap-2 cursor-pointer">
                                                <Eye className="size-4 text-emerald-600" />
                                                <span>Preview</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a href={`/files/${file.id}/download`} download className="gap-2 cursor-pointer flex items-center">
                                                    <Download className="size-4 text-sky-600" />
                                                    <span>Download</span>
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onVersions(file)} className="gap-2 cursor-pointer">
                                                <History className="size-4 text-indigo-600" />
                                                <span>Version History</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onUploadRevision(file)} className="gap-2 cursor-pointer">
                                                <UploadCloud className="size-4 text-purple-600" />
                                                <span>Upload Revision</span>
                                            </DropdownMenuItem>
                                            {isAdmin && (
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (file.is_locked) {
                                                            router.post(`/files/${file.id}/unlock`, {}, {
                                                                preserveScroll: true,
                                                                onSuccess: () => toast.success(`File '${file.name}' unlocked`),
                                                            });
                                                        } else {
                                                            router.post(`/files/${file.id}/lock`, { lock_note: 'LOCKED BY ADMIN — Employee Access Restricted' }, {
                                                                preserveScroll: true,
                                                                onSuccess: () => toast.success(`File '${file.name}' is now LOCKED BY ADMIN`),
                                                            });
                                                        }
                                                    }}
                                                    className="gap-2 cursor-pointer"
                                                >
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
                                            <DropdownMenuItem onClick={() => onShareFile(file)} className="gap-2 cursor-pointer">
                                                <Share2 className="size-4 text-teal-600" />
                                                <span>Share</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onMoveFile(file)} className="gap-2 cursor-pointer">
                                                <CornerDownRight className="size-4" />
                                                <span>Move</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onRenameFile(file)} className="gap-2 cursor-pointer">
                                                <Pencil className="size-4" />
                                                <span>Edit Details</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {!file.is_trashed ? (
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        router.delete(`/files/${file.id}`, {
                                                            preserveScroll: true,
                                                            onSuccess: () => toast.success(`'${file.name}' moved to Trash`),
                                                        });
                                                    }}
                                                    className="gap-2 cursor-pointer text-rose-600"
                                                >
                                                    <Trash2 className="size-4" />
                                                    <span>Trash</span>
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        router.post(`/files/${file.id}/restore`, {}, {
                                                            preserveScroll: true,
                                                            onSuccess: () => toast.success(`'${file.name}' restored`),
                                                        });
                                                    }}
                                                    className="gap-2 cursor-pointer text-emerald-600"
                                                >
                                                    <RotateCcw className="size-4" />
                                                    <span>Restore</span>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600">
                                        <Lock className="size-3" />
                                        Locked
                                    </span>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

