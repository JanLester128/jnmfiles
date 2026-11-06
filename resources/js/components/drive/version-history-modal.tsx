import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Download,
    History,
    Loader2,
    RotateCcw,
    ShieldCheck,
    UploadCloud,
    User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FileItem, FileVersion } from '@/types/file-management';

interface VersionHistoryModalProps {
    file: FileItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function VersionHistoryModal({ file, isOpen, onClose }: VersionHistoryModalProps) {
    const [versions, setVersions] = useState<FileVersion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newRevisionFile, setNewRevisionFile] = useState<File | null>(null);
    const [changelog, setChangelog] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (file && isOpen) {
            fetchVersions();
        }
    }, [file, isOpen]);

    const fetchVersions = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/files/${file.id}/versions`);
            const data = await res.json();
            setVersions(data.versions || []);
        } catch (e) {
            toast.error('Failed to load version history');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadRevision = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !newRevisionFile || !changelog.trim()) {
            toast.error('Please select revision file and provide changelog notes');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('revision_file', newRevisionFile);
        formData.append('changelog', changelog.trim());

        router.post(`/files/${file.id}/versions`, formData, {
            onSuccess: () => {
                toast.success('New revision uploaded successfully');
                setNewRevisionFile(null);
                setChangelog('');
                setIsUploading(false);
                fetchVersions();
            },
            onError: (errors) => {
                setIsUploading(false);
                const first = Object.values(errors)[0] as string;
                toast.error(first || 'Failed to upload revision');
            },
        });
    };

    const handleRestore = (ver: FileVersion) => {
        if (!file) return;
        if (confirm(`Restore Version ${ver.version_number} as current active file?`)) {
            router.post(`/files/${file.id}/versions/${ver.id}/restore`, {}, {
                onSuccess: () => {
                    toast.success(`Restored to Version ${ver.version_number}`);
                    fetchVersions();
                },
            });
        }
    };

    if (!file) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="size-5 text-indigo-600" />
                        <span>File Version History & Audit</span>
                    </DialogTitle>
                    <DialogDescription>
                        Track revisions, engineering changes, and download past versions for{' '}
                        <span className="font-semibold text-foreground font-mono">{file.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                {/* Upload New Version Section */}
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <UploadCloud className="size-4 text-emerald-600" />
                        Upload Engineering Revision (v{file.current_version + 1})
                    </h4>
                    <form onSubmit={handleUploadRevision} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="rev_file" className="text-xs font-semibold">
                                    Revision File *
                                </Label>
                                <Input
                                    id="rev_file"
                                    type="file"
                                    onChange={(e) => setNewRevisionFile(e.target.files?.[0] || null)}
                                    className="h-8 text-xs file:mr-2 file:py-0 file:px-2 file:text-xs"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="rev_changelog" className="text-xs font-semibold">
                                    Revision Changelog Notes *
                                </Label>
                                <Input
                                    id="rev_changelog"
                                    value={changelog}
                                    onChange={(e) => setChangelog(e.target.value)}
                                    placeholder="e.g. Adjusted curve radius per municipal review"
                                    className="h-8 text-xs"
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isUploading || !newRevisionFile || !changelog.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                    Uploading Version...
                                </>
                            ) : (
                                `Commit & Release v${file.current_version + 1}`
                            )}
                        </Button>
                    </form>
                </div>

                {/* Version List */}
                <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Revision Timeline ({versions.length} versions)
                    </h4>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="divide-y divide-border rounded-xl border border-border bg-card">
                            {versions.map((ver) => {
                                const isCurrent = ver.version_number === file.current_version;
                                const dateFormatted = new Date(ver.created_at).toLocaleString();
                                return (
                                    <div
                                        key={ver.id}
                                        className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                            isCurrent ? 'bg-emerald-500/5 dark:bg-emerald-950/20' : ''
                                        }`}
                                    >
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-foreground text-background">
                                                    v{ver.version_number}
                                                </span>
                                                {isCurrent && (
                                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="size-3" />
                                                        Current Active Version
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {ver.formatted_size || `${(ver.size_bytes / 1024).toFixed(1)} KB`}
                                                </span>
                                                <span className="text-xs text-muted-foreground">• {dateFormatted}</span>
                                            </div>

                                            <p className="text-xs text-foreground font-medium">
                                                {ver.changelog || 'No changelog specified.'}
                                            </p>

                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <User className="size-3" />
                                                    {ver.creator?.name || 'Engineer'}
                                                </span>
                                                {ver.checksum && (
                                                    <span className="flex items-center gap-1 font-mono text-[10px]" title="SHA-256 Checksum">
                                                        <ShieldCheck className="size-3 text-emerald-600" />
                                                        SHA: {ver.checksum.substring(0, 10)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                            <a
                                                href={`/files/${file.id}/versions/${ver.id}/download`}
                                                download
                                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-accent font-medium text-foreground transition-colors"
                                            >
                                                <Download className="size-3.5 text-sky-600" />
                                                <span>Download</span>
                                            </a>

                                            {!isCurrent && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRestore(ver)}
                                                    className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                                                >
                                                    <RotateCcw className="size-3.5" />
                                                    <span>Restore</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

