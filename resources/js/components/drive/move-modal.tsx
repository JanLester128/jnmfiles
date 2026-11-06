import { router } from '@inertiajs/react';
import { CornerDownRight, Folder, HardDrive, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FileItem, FolderItem } from '@/types/file-management';

export interface TransferableFolder {
    id: number;
    name: string;
    parent_id: number | null;
    path: string;
}

interface MoveModalProps {
    item: FileItem | FolderItem | null;
    type: 'file' | 'folder';
    folders?: TransferableFolder[];
    isOpen: boolean;
    onClose: () => void;
}

export default function MoveModal({ item, type, folders = [], isOpen, onClose }: MoveModalProps) {
    const [targetFolderId, setTargetFolderId] = useState<string>('');
    const [isMoving, setIsMoving] = useState(false);

    // Compute only the valid folders where this item can actually be transferred
    const { canMoveToRoot, validFolders } = useMemo(() => {
        if (!item) {
            return { canMoveToRoot: false, validFolders: [] as TransferableFolder[] };
        }

        if (type === 'file') {
            const fileItem = item as FileItem;
            const currentFolderId = fileItem.folder_id ?? null;

            return {
                // Only show Root if the file is currently inside a folder
                canMoveToRoot: currentFolderId !== null,
                validFolders: folders.filter((f) => f.id !== currentFolderId),
            };
        }

        // For moving a folder: exclude itself, its current parent, and all of its own descendants
        const folderItem = item as FolderItem;
        const currentParentId = folderItem.parent_id ?? null;

        const descendantIds = new Set<number>();
        const queue: number[] = [folderItem.id];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            for (const f of folders) {
                if (f.parent_id === currentId && !descendantIds.has(f.id)) {
                    descendantIds.add(f.id);
                    queue.push(f.id);
                }
            }
        }

        return {
            // Only show Root if the folder is currently inside a parent folder
            canMoveToRoot: currentParentId !== null,
            validFolders: folders.filter(
                (f) => f.id !== folderItem.id && !descendantIds.has(f.id) && f.id !== currentParentId
            ),
        };
    }, [item, type, folders]);

    const hasDestinations = canMoveToRoot || validFolders.length > 0;

    useEffect(() => {
        if (isOpen) {
            if (canMoveToRoot) {
                setTargetFolderId('root');
            } else if (validFolders.length > 0) {
                setTargetFolderId(validFolders[0].id.toString());
            } else {
                setTargetFolderId('');
            }
        }
    }, [isOpen, canMoveToRoot, validFolders]);

    if (!item) return null;

    const handleMove = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetFolderId) return;

        setIsMoving(true);

        const folderId = targetFolderId === 'root' ? null : parseInt(targetFolderId, 10);
        const endpoint = type === 'file' ? `/files/${item.id}/move` : `/folders/${item.id}/move`;

        router.post(
            endpoint,
            { folder_id: folderId, parent_id: folderId },
            {
                onSuccess: () => {
                    toast.success(`Moved '${item.name}'`);
                    setIsMoving(false);
                    onClose();
                },
                onError: (errors) => {
                    setIsMoving(false);
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Move failed');
                },
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CornerDownRight className="size-5 text-indigo-600" />
                        <span>Move {type === 'file' ? 'File' : 'Folder'}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Select the destination folder to transfer <span className="font-semibold text-foreground">{item.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleMove} className="space-y-4 py-2">
                    {hasDestinations ? (
                        <div className="space-y-1.5">
                            <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Select destination folder..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {canMoveToRoot && (
                                        <SelectItem value="root">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="size-4 text-emerald-600" />
                                                <span>My Files Root (Top Level)</span>
                                            </div>
                                        </SelectItem>
                                    )}
                                    {validFolders.map((f) => (
                                        <SelectItem key={f.id} value={f.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <Folder className="size-4 text-sky-600 shrink-0" />
                                                <span className="truncate">{f.path || f.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                            No destination folders available where <strong className="text-foreground">{item.name}</strong> can be transferred. Create another unlocked folder first.
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isMoving}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isMoving || !hasDestinations || !targetFolderId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isMoving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin mr-1.5" />
                                    Moving...
                                </>
                            ) : (
                                'Confirm Move'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
