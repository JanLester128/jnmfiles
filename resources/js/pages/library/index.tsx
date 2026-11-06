import { Head, Link } from '@inertiajs/react';
import {
    BookMarked,
    CheckCircle2,
    Compass,
    Download,
    Eye,
    FileCheck,
    FileText,
    Folder,
    HardDrive,
    Search,
    Shield,
    UploadCloud,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import FileIcon from '@/components/drive/file-icon';
import FilePreviewModal from '@/components/drive/file-preview-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FileItem, FolderItem } from '@/types/file-management';

interface LibraryProps {
    rootFolder: FolderItem | null;
    subfolders: FolderItem[];
    files: FileItem[];
    selectedCategory: string;
}

export default function LibraryIndex({
    rootFolder,
    subfolders,
    files,
    selectedCategory,
}: LibraryProps) {
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [search, setSearch] = useState('');

    const filteredFiles = files.filter(
        (f) =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <Head title="Company SOPs & Engineering Standards - JNM Files" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 text-white shadow-md border border-indigo-800/40">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Central Repository
                            </span>
                            <span className="text-xs text-slate-300">ISO 9001 & ISO 17123 Compliance</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Company Standards, SOPs & Calibration Hub
                        </h1>
                        <p className="text-sm text-slate-300 max-w-3xl">
                            Official company surveying protocols, Civil 3D CAD layer naming standards, annual optical & EDM calibration records, and regulatory guidelines accessible to all employees.
                        </p>
                    </div>
                </div>

                {/* Subfolder Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {subfolders.map((folder) => (
                        <Link
                            key={folder.id}
                            href={`/drive?folder_id=${folder.id}`}
                            className="p-4 rounded-xl border border-border bg-card hover:border-indigo-500/50 hover:shadow-sm transition-all flex items-start gap-3.5 group"
                        >
                            <div
                                className="size-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${folder.color || '#4f46e5'}20`, color: folder.color || '#4f46e5' }}
                            >
                                <Folder className="size-5 fill-current" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                    {folder.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {folder.description || 'Company standard folder'}
                                </p>
                                <span className="text-[11px] font-semibold text-emerald-600 mt-2 block">
                                    {folder.files_count || 0} active documents →
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Search & Document Listing */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <BookMarked className="size-5 text-indigo-600" />
                            <span>Official Documents & Calibration Logs ({filteredFiles.length})</span>
                        </h3>

                        <div className="relative sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search standards, certs, manuals..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                        {filteredFiles.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No documentation files matching your search.
                            </div>
                        ) : (
                            filteredFiles.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => setPreviewFile(file)}
                                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        <FileIcon extension={file.extension} category={file.category} className="size-8 shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-bold text-foreground hover:text-indigo-600">
                                                    {file.name}
                                                </h4>
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                                                    v{file.current_version}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                                    Verified
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                {file.description || 'Company standard documentation'}
                                            </p>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                                                <span>{file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`}</span>
                                                <span>•</span>
                                                <span>Folder: {file.folder?.name || 'Library'}</span>
                                                <span>•</span>
                                                <span>Managed by: {file.creator?.name || 'Director of Surveying'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPreviewFile(file)}
                                            className="h-8 text-xs gap-1.5"
                                        >
                                            <Eye className="size-3.5 text-emerald-600" />
                                            <span>Read</span>
                                        </Button>
                                        <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                                            <a href={`/files/${file.id}/download`} download>
                                                <Download className="size-3.5" />
                                                <span>Download</span>
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <FilePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </>
    );
}

