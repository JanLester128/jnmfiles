import { Head, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    Folder,
    FolderPlus,
    FolderTree,
    HardDrive,
    Lock,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UploadCloud,
    UserCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BreadcrumbNav from '@/components/drive/breadcrumb-nav';
import FileGridCard from '@/components/drive/file-grid-card';
import FileListTable from '@/components/drive/file-list-table';
import FilePreviewModal from '@/components/drive/file-preview-modal';
import FolderCard from '@/components/drive/folder-card';
import MoveModal, { type TransferableFolder } from '@/components/drive/move-modal';
import NewFolderModal from '@/components/drive/new-folder-modal';
import RenameModal from '@/components/drive/rename-modal';
import ShareModal from '@/components/drive/share-modal';
import Toolbar from '@/components/drive/toolbar';
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
import type { FileItem, FolderItem, ProjectItem } from '@/types/file-management';

interface DrivePageProps {
    folders: FolderItem[];
    files: FileItem[];
    currentFolder: FolderItem | null;
    currentProject: ProjectItem | null;
    breadcrumbs: Array<{ id: number; name: string; project_id?: number | null }>;
    allProjects: ProjectItem[];
    libraryFolders: FolderItem[];
    transferableFolders?: TransferableFolder[];
    storageUsed: number;
    filters: {
        folder_id?: number | string | null;
        project_id?: number | string | null;
        category?: string;
        starred?: boolean;
        trashed?: boolean;
        shared?: boolean;
        q?: string;
        sort?: string;
        direction?: string;
        view?: string;
    };
}

export default function DrivePage({
    folders,
    files,
    currentFolder,
    currentProject,
    breadcrumbs,
    transferableFolders = [],
    filters,
}: DrivePageProps) {
    const pageProps = usePage().props as any;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || pageProps.auth?.user?.role === 'admin');
    const flash = pageProps.flash as { success?: string; error?: string } | undefined;

    const [uploadTargetFolder, setUploadTargetFolder] = useState<FolderItem | null | undefined>(undefined);
    const [newFolderParent, setNewFolderParent] = useState<FolderItem | null | undefined>(undefined);
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [versionFile, setVersionFile] = useState<FileItem | null>(null);
    const [shareItem, setShareItem] = useState<{ item: FileItem | FolderItem; type: 'file' | 'folder' } | null>(null);
    const [moveItem, setMoveItem] = useState<{ item: FileItem | FolderItem; type: 'file' | 'folder' } | null>(null);
    const [renameItem, setRenameItem] = useState<{ item: FileItem | FolderItem; type: 'file' | 'folder' } | null>(null);
    const [lockedItemAlert, setLockedItemAlert] = useState<{ name: string; type: 'file' | 'folder'; reason?: string | null } | null>(null);
    const [showAllFiles, setShowAllFiles] = useState(false);

    const visibleFiles = showAllFiles ? files : [];

    useEffect(() => {
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.error]);

    const isListView = filters.view === 'list';
    const hasItems = folders.length > 0 || files.length > 0;

    const activeUploadFolder = uploadTargetFolder === undefined ? null : uploadTargetFolder ?? currentFolder;
    const activeNewFolderParent = newFolderParent === undefined ? null : newFolderParent ?? currentFolder;

    return (
        <>
            <Head
                title={
                    filters.trashed
                        ? 'Trash'
                        : filters.starred
                          ? 'Starred'
                          : currentFolder
                            ? currentFolder.name
                            : 'My Files'
                }
            />

            <div className="flex flex-col gap-4 p-4 md:p-6 max-w-7xl mx-auto w-full min-h-[85vh]">
                {/* Role-specific banner */}
                <div
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs ${
                        isAdmin
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200'
                    }`}
                >
                    <div className="flex items-center gap-2 font-medium">
                        {isAdmin ? (
                            <>
                                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                                <span>
                                    <strong>Administrator File Explorer:</strong> You have full authority to create folders, upload files, and lock/unlock any folder so employees cannot open it.
                                </span>
                            </>
                        ) : (
                            <>
                                <UserCheck className="size-4 text-sky-600 shrink-0" />
                                <span>
                                    <strong>Employee File Explorer:</strong> You can create folders and upload survey files (DLSD, XML, DWG, JPG, PNG). Folders locked by the Administrator cannot be opened.
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Breadcrumb bar with Back button (shown when inside a folder or project) */}
                {(currentFolder || currentProject || breadcrumbs.length > 0) && (
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <BreadcrumbNav
                            currentFolder={currentFolder}
                            currentProject={currentProject}
                            breadcrumbs={breadcrumbs}
                        />
                    </div>
                )}

                {/* Toolbar */}
                <Toolbar
                    filters={filters}
                    onOpenUpload={() => setUploadTargetFolder(currentFolder)}
                    onOpenNewFolder={() => setNewFolderParent(currentFolder)}
                />

                {/* Trash Banner */}
                {filters.trashed && (
                    <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <Trash2 className="size-4 text-rose-600 shrink-0" />
                            <span>
                                Items in Trash can be restored or permanently deleted at any time.
                            </span>
                        </div>
                    </div>
                )}

                {/* Main File Explorer View Area */}
                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-border bg-card/50 my-6">
                        <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                            <FolderTree className="size-8" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                            {filters.trashed
                                ? 'Trash is Empty'
                                : filters.starred
                                  ? 'No Starred Items Yet'
                                  : filters.q
                                    ? `No results for "${filters.q}"`
                                    : currentFolder
                                      ? `'${currentFolder.name}' is empty`
                                      : 'No folders or files yet'}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-md mt-1 mb-5">
                            {filters.trashed
                                ? 'Deleted files and folders will appear here.'
                                : filters.starred
                                  ? 'Star any file or folder for quick access.'
                                  : 'Create a folder to organize your work or upload DLSD, XML, DWG, JPG, and PNG files directly.'}
                        </p>
                        {!filters.trashed && (
                            <div className="flex items-center gap-2.5 flex-wrap justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setNewFolderParent(currentFolder)}
                                    className="text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300"
                                >
                                    <FolderPlus className="size-4 text-emerald-600" />
                                    <span>{currentFolder ? 'Create Subfolder' : 'Create Folder'}</span>
                                </Button>
                                <Button
                                    onClick={() => setUploadTargetFolder(currentFolder)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                                >
                                    <UploadCloud className="size-4" />
                                    <span>Upload Files (DLSD, XML, DWG, JPG, PNG)</span>
                                </Button>
                            </div>
                        )}
                    </div>
                ) : isListView ? (
                    <div className="space-y-4">
                        {files.length > 0 && (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <HardDrive className="size-3.5 text-emerald-600" />
                                    <span>All Files ({files.length})</span>
                                </h3>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAllFiles((prev) => !prev)}
                                    className="h-7 px-2.5 text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                    {showAllFiles ? (
                                        <>
                                            <ChevronUp className="size-3.5 text-emerald-600" />
                                            <span>Show Less</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="size-3.5 text-emerald-600" />
                                            <span>Show All Files</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        <FileListTable
                            folders={folders}
                            files={visibleFiles}
                            onPreview={(f) => setPreviewFile(f)}
                            onVersions={(f) => setVersionFile(f)}
                            onUploadRevision={(f) => setVersionFile(f)}
                            onShareFile={(f) => setShareItem({ item: f, type: 'file' })}
                            onShareFolder={(fol) => setShareItem({ item: fol, type: 'folder' })}
                            onMoveFile={(f) => setMoveItem({ item: f, type: 'file' })}
                            onMoveFolder={(fol) => setMoveItem({ item: fol, type: 'folder' })}
                            onRenameFile={(f) => setRenameItem({ item: f, type: 'file' })}
                            onRenameFolder={(fol) => setRenameItem({ item: fol, type: 'folder' })}
                            onLockedFolderClick={(fol) => setLockedItemAlert({ name: fol.name, type: 'folder', reason: fol.lock_reason })}
                            onLockedFileClick={(f) => setLockedItemAlert({ name: f.name, type: 'file', reason: f.lock_note })}
                        />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {folders.length > 0 && (
                            <div className="space-y-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Folder className="size-3.5 text-emerald-600" />
                                    <span>Folders ({folders.length})</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {folders.map((folder) => (
                                        <FolderCard
                                            key={folder.id}
                                            folder={folder}
                                            onRename={(fol) => setRenameItem({ item: fol, type: 'folder' })}
                                            onMove={(fol) => setMoveItem({ item: fol, type: 'folder' })}
                                            onShare={(fol) => setShareItem({ item: fol, type: 'folder' })}
                                            onUploadInto={(fol) => setUploadTargetFolder(fol)}
                                            onCreateSubfolder={(fol) => setNewFolderParent(fol)}
                                            onLockedClick={(fol) => setLockedItemAlert({ name: fol.name, type: 'folder', reason: fol.lock_reason })}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {files.length > 0 && (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <HardDrive className="size-3.5 text-emerald-600" />
                                        <span>All Files ({files.length})</span>
                                    </h3>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAllFiles((prev) => !prev)}
                                        className="h-7 px-2.5 text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    >
                                        {showAllFiles ? (
                                            <>
                                                <ChevronUp className="size-3.5 text-emerald-600" />
                                                <span>Show Less</span>
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="size-3.5 text-emerald-600" />
                                                <span>Show All Files</span>
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {showAllFiles && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {files.map((file) => (
                                            <FileGridCard
                                                key={file.id}
                                                file={file}
                                                onPreview={(f) => setPreviewFile(f)}
                                                onVersions={(f) => setVersionFile(f)}
                                                onUploadRevision={(f) => setVersionFile(f)}
                                                onShare={(f) => setShareItem({ item: f, type: 'file' })}
                                                onMove={(f) => setMoveItem({ item: f, type: 'file' })}
                                                onRename={(f) => setRenameItem({ item: f, type: 'file' })}
                                                onLockedClick={(f) => setLockedItemAlert({ name: f.name, type: 'file', reason: f.lock_note })}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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

            {/* Modals */}
            <UploadModal
                isOpen={uploadTargetFolder !== undefined}
                onClose={() => setUploadTargetFolder(undefined)}
                currentFolderId={activeUploadFolder?.id}
                currentFolderName={activeUploadFolder?.name}
                currentProjectId={currentProject?.id || activeUploadFolder?.project_id}
            />

            <NewFolderModal
                isOpen={newFolderParent !== undefined}
                onClose={() => setNewFolderParent(undefined)}
                currentFolderId={activeNewFolderParent?.id}
                currentFolderName={activeNewFolderParent?.name}
                currentProjectId={currentProject?.id || activeNewFolderParent?.project_id}
            />

            <VersionHistoryModal
                file={versionFile}
                isOpen={!!versionFile}
                onClose={() => setVersionFile(null)}
            />

            <FilePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                onOpenVersions={(f) => {
                    setPreviewFile(null);
                    setVersionFile(f);
                }}
                onOpenShare={(f) => {
                    setPreviewFile(null);
                    setShareItem({ item: f, type: 'file' });
                }}
            />

            <ShareModal
                item={shareItem?.item || null}
                type={shareItem?.type || 'file'}
                isOpen={!!shareItem}
                onClose={() => setShareItem(null)}
            />

            <MoveModal
                item={moveItem?.item || null}
                type={moveItem?.type || 'file'}
                folders={transferableFolders}
                isOpen={!!moveItem}
                onClose={() => setMoveItem(null)}
            />

            <RenameModal
                item={renameItem?.item || null}
                type={renameItem?.type || 'file'}
                isOpen={!!renameItem}
                onClose={() => setRenameItem(null)}
            />
        </>
    );
}
