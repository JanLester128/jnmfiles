import { router } from '@inertiajs/react';
import { CloudUpload, FileCheck2, Folder, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
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

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolderId?: number | null;
    currentFolderName?: string | null;
    currentProjectId?: number | null;
}

export default function UploadModal({
    isOpen,
    onClose,
    currentFolderId,
    currentFolderName,
    currentProjectId,
}: UploadModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setSelectedFiles(Array.from(e.dataTransfer.files));
        }
    };

    const removeFile = (idx: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            toast.error('Please select at least one file to upload');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();

        selectedFiles.forEach((file) => {
            formData.append('files[]', file);
        });

        if (currentFolderId) {
            formData.append('folder_id', currentFolderId.toString());
        }
        if (currentProjectId) {
            formData.append('project_id', currentProjectId.toString());
        }

        if (description.trim()) {
            formData.append('description', description.trim());
        }

        router.post('/files/upload', formData, {
            onSuccess: () => {
                toast.success(`Successfully uploaded ${selectedFiles.length} file(s)`);
                setSelectedFiles([]);
                setDescription('');
                setIsUploading(false);
                onClose();
            },
            onError: (errors) => {
                setIsUploading(false);
                const firstError = Object.values(errors)[0] as string;
                toast.error(firstError || 'Upload failed');
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CloudUpload className="size-5 text-emerald-600" />
                        <span>Upload Files</span>
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-1.5 pt-1">
                        <Folder className="size-3.5 text-emerald-600 shrink-0" />
                        <span>
                            Target folder:{' '}
                            <strong className="text-foreground">
                                {currentFolderName || 'My Files (Root)'}
                            </strong>
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Drag and Drop Zone */}
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center"
                    >
                        <CloudUpload className="size-10 text-emerald-600 mb-2" />
                        <p className="text-sm font-semibold text-foreground">
                            Drag and drop files here, or <span className="text-emerald-600 underline">browse</span>
                        </p>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                            {['DLSD', 'XML', 'DWG', 'JPG', 'PNG'].map((ext) => (
                                <span
                                    key={ext}
                                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                >
                                    .{ext}
                                </span>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                            Original survey files are preserved without modification or compression
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Selected files preview */}
                    {selectedFiles.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-lg bg-muted/40 border border-border">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-card border border-border">
                                    <div className="flex items-center gap-2 truncate">
                                        <FileCheck2 className="size-3.5 text-emerald-600 shrink-0" />
                                        <span className="truncate font-medium">{file.name}</span>
                                        <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="text-muted-foreground hover:text-rose-600 p-0.5"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="file_desc" className="text-xs font-semibold">
                            Notes / Description (optional)
                        </Label>
                        <Input
                            id="file_desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional remarks for these files..."
                            className="h-9 text-xs"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isUploading || selectedFiles.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin mr-1.5" />
                                    Uploading...
                                </>
                            ) : (
                                `Upload ${selectedFiles.length || ''} File(s)`
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
