import {
    Database,
    Download,
    History,
    Loader2,
    Share2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import FileIcon from '@/components/drive/file-icon';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-management';

interface FilePreviewModalProps {
    file: FileItem | null;
    isOpen: boolean;
    onClose: () => void;
    onOpenVersions?: (file: FileItem) => void;
    onOpenShare?: (file: FileItem) => void;
}

export default function FilePreviewModal({
    file,
    isOpen,
    onClose,
    onOpenVersions,
    onOpenShare,
}: FilePreviewModalProps) {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (file && isOpen) {
            const ext = (file.extension || '').toLowerCase();
            const isTextual = ['xml', 'dlsd', 'csv', 'txt', 'geojson', 'json', 'dxf', 'kml', 'log', 'obs', 'nav', 'raw'].includes(ext);
            if (isTextual) {
                setIsLoading(true);
                fetch(`/files/${file.id}/preview`)
                    .then((res) => res.text())
                    .then((text) => {
                        setTextContent(text);
                        setIsLoading(false);
                    })
                    .catch(() => {
                        setTextContent(null);
                        setIsLoading(false);
                    });
            } else {
                setTextContent(null);
            }
        }
    }, [file, isOpen]);

    if (!file) return null;

    const ext = (file.extension || '').toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
    const isPdf = ext === 'pdf';
    const isCsv = ext === 'csv';

    const csvRows = isCsv && textContent
        ? textContent
              .trim()
              .split('\n')
              .map((row) => row.split(','))
        : [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-6">
                <DialogHeader className="shrink-0">
                    <div className="flex items-center justify-between gap-4 pr-6">
                        <div className="flex items-center gap-3 min-w-0">
                            <FileIcon extension={file.extension} category={file.category} className="size-8 shrink-0" />
                            <div className="min-w-0">
                                <DialogTitle className="truncate text-base font-bold text-foreground">
                                    {file.name}
                                </DialogTitle>
                                <DialogDescription className="text-xs flex items-center gap-2 mt-0.5">
                                    <span className="font-mono uppercase font-bold text-emerald-600">
                                        .{file.extension}
                                    </span>
                                    <span>• {file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`}</span>
                                    <span>• v{file.current_version}</span>
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {onOpenShare && (
                                <Button size="sm" variant="outline" onClick={() => onOpenShare(file)} className="h-8 text-xs gap-1.5">
                                    <Share2 className="size-3.5 text-teal-600" />
                                    <span>Share</span>
                                </Button>
                            )}
                            {onOpenVersions && (
                                <Button size="sm" variant="outline" onClick={() => onOpenVersions(file)} className="h-8 text-xs gap-1.5">
                                    <History className="size-3.5 text-indigo-600" />
                                    <span>Versions</span>
                                </Button>
                            )}
                            <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <a href={`/files/${file.id}/download`} download>
                                    <Download className="size-3.5" />
                                    <span>Download</span>
                                </a>
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden my-3 rounded-xl border border-border bg-muted/20 flex flex-col min-h-[350px]">
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <Loader2 className="size-8 animate-spin text-emerald-600" />
                        </div>
                    ) : isImage ? (
                        <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
                            <img
                                src={`/files/${file.id}/preview`}
                                alt={file.name}
                                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                            />
                        </div>
                    ) : isPdf ? (
                        <iframe
                            src={`/files/${file.id}/preview`}
                            title={file.name}
                            className="w-full flex-1 min-h-[60vh] rounded-lg"
                        />
                    ) : isCsv && csvRows.length > 0 ? (
                        <div className="flex-1 overflow-auto p-2">
                            <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 flex items-center justify-between bg-muted/60 rounded-t-lg border-b border-border">
                                <span className="flex items-center gap-1">
                                    <Database className="size-3.5 text-sky-600" />
                                    Survey Coordinate Table ({csvRows.length - 1} rows)
                                </span>
                            </div>
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted text-muted-foreground font-semibold">
                                        {csvRows[0].map((header, hIdx) => (
                                            <th key={hIdx} className="p-2 border-b border-border font-mono">
                                                {header.trim()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {csvRows.slice(1).map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-muted/40 font-mono text-[11px]">
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="p-2">
                                                    {cell.trim()}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : textContent ? (
                        <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-foreground bg-card/60 whitespace-pre-wrap leading-relaxed">
                            {textContent}
                        </pre>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                            <FileIcon extension={file.extension} category={file.category} className="size-16 mb-3" />
                            <h4 className="text-sm font-semibold text-foreground">
                                {file.extension.toUpperCase()} Survey / CAD File
                            </h4>
                            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                                Original {file.extension.toUpperCase()} file stored securely without modification. Download to open in AutoCAD or your land surveying software.
                            </p>
                            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <a href={`/files/${file.id}/download`} download>
                                    <Download className="size-4 mr-1.5" />
                                    Download {file.original_filename}
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
