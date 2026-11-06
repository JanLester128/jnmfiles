import { Head } from '@inertiajs/react';
import {
    CheckCircle2,
    Compass,
    Download,
    Eye,
    FileCheck,
    Globe,
    HardDrive,
    Lock,
    Shield,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import FileIcon from '@/components/drive/file-icon';
import { Button } from '@/components/ui/button';
import type { FileItem } from '@/types/file-management';

interface PublicShareProps {
    share: {
        token: string;
        permission: string;
        expires_at: string | null;
        item_type: string;
        item: FileItem;
        sharer: string;
    };
}

export default function PublicShareView({ share }: PublicShareProps) {
    const file = share.item;
    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(file.extension?.toLowerCase() || '');
    const isCsv = file.extension?.toLowerCase() === 'csv';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-foreground">
            <Head title={`Shared Document - ${file.name} | JNM Files`} />

            {/* Top Navigation Bar */}
            <header className="border-b border-border bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <Compass className="size-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            JNM Files Client Portal
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Verified
                            </span>
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            Land Surveying & Civil Engineering Secure Cloud Delivery
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Shared by <strong>{share.sharer}</strong>
                    </span>
                    {share.permission !== 'view' && (
                        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                            <a href={`/s/${share.token}/download`} download>
                                <Download className="size-3.5" />
                                <span>Download File</span>
                            </a>
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Content Card */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
                    {/* File Meta Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center shrink-0 border border-border">
                                <FileIcon extension={file.extension} category={file.category} className="size-8" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-muted text-foreground">
                                        {file.extension}
                                    </span>
                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                        Version {file.current_version}
                                    </span>
                                </div>
                                <h1 className="text-xl font-bold text-foreground mt-1 truncate" title={file.name}>
                                    {file.name}
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`} • Stored on secure private cloud
                                </p>
                            </div>
                        </div>

                        {share.permission !== 'view' && (
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto">
                                <a href={`/s/${share.token}/download`} download>
                                    <Download className="size-4" />
                                    <span>Download Document</span>
                                </a>
                            </Button>
                        )}
                    </div>

                    {/* Description & Technical Survey Notes */}
                    {file.description && (
                        <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Survey Notes / Narrative
                            </span>
                            <p className="text-foreground leading-relaxed">{file.description}</p>
                        </div>
                    )}

                    {/* Geodetic Attributes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/20 border border-border text-xs font-mono">
                        <div>
                            <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                                Coordinate System
                            </span>
                            <span className="font-medium text-foreground truncate block">
                                {file.metadata?.coordinate_system || 'WGS84 / UTM 51N'}
                            </span>
                        </div>

                        <div>
                            <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                                Access Permission
                            </span>
                            <span className="font-medium text-emerald-600 uppercase font-sans font-bold block">
                                {share.permission}
                            </span>
                        </div>

                        <div>
                            <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                                Link Security
                            </span>
                            <span className="font-medium text-foreground flex items-center gap-1 font-sans">
                                <ShieldCheck className="size-3.5 text-emerald-600" />
                                256-bit Encrypted
                            </span>
                        </div>
                    </div>

                    {/* Link Expiration notice */}
                    {share.expires_at && (
                        <p className="text-[11px] text-muted-foreground text-center">
                            This secure link will expire on {new Date(share.expires_at).toLocaleDateString()}.
                        </p>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} JNM Geodetics & Civil Engineering Inc. Confidential Client Document Hub.</p>
            </footer>
        </div>
    );
}

