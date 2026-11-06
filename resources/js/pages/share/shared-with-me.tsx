import { Head, Link } from '@inertiajs/react';
import {
    Download,
    Eye,
    Folder,
    FolderTree,
    HardDrive,
    Share2,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import FileIcon from '@/components/drive/file-icon';
import FilePreviewModal from '@/components/drive/file-preview-modal';
import FolderCard from '@/components/drive/folder-card';
import { Button } from '@/components/ui/button';
import type { FileItem, FolderItem } from '@/types/file-management';

interface SharedWithMeProps {
    files: FileItem[];
    folders: FolderItem[];
}

export default function SharedWithMe({ files, folders }: SharedWithMeProps) {
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

    const hasItems = files.length > 0 || folders.length > 0;

    return (
        <>
            <Head title="Shared With Me - JNM Files" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Share2 className="size-6 text-teal-600" />
                        <span>Shared With Me</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Land survey drawings, coordinate logs, and folders specifically shared with your account.
                    </p>
                </div>

                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-border bg-card/50 my-6">
                        <div className="size-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-4">
                            <Share2 className="size-8" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">No Shared Files</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            When colleagues share surveying projects, CAD drawings, or deliverables with you, they will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Folders */}
                        {folders.length > 0 && (
                            <div className="space-y-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Folder className="size-3.5 text-teal-600" />
                                    <span>Shared Folders ({folders.length})</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {folders.map((folder) => (
                                        <FolderCard key={folder.id} folder={folder} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files */}
                        {files.length > 0 && (
                            <div className="space-y-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <HardDrive className="size-3.5 text-emerald-600" />
                                    <span>Shared Files ({files.length})</span>
                                </h3>
                                <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                                    {files.map((file) => (
                                        <div
                                            key={file.id}
                                            onClick={() => setPreviewFile(file)}
                                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileIcon extension={file.extension} category={file.category} className="size-7 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground truncate max-w-sm">
                                                            {file.name}
                                                        </span>
                                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                                            v{file.current_version}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        <span>{file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`}</span>
                                                        {file.project && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-muted">
                                                                    {file.project.code}
                                                                </span>
                                                            </>
                                                        )}
                                                        <span>•</span>
                                                        <span>Shared by {file.creator?.name || 'Engineer'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setPreviewFile(file)}
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <Eye className="size-3.5" />
                                                </Button>
                                                <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-sky-600">
                                                    <a href={`/files/${file.id}/download`} download>
                                                        <Download className="size-3.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview modal */}
            <FilePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </>
    );
}

