import { router } from '@inertiajs/react';
import { Loader2, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import type { FileItem, FolderItem } from '@/types/file-management';

interface RenameModalProps {
    item: FileItem | FolderItem | null;
    type: 'file' | 'folder';
    isOpen: boolean;
    onClose: () => void;
}

export default function RenameModal({ item, type, isOpen, onClose }: RenameModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [coordinateSystem, setCoordinateSystem] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (item) {
            setName(item.name);
            setDescription(item.description || '');
            if (type === 'file') {
                const f = item as FileItem;
                setCoordinateSystem(f.metadata?.coordinate_system || '');
            }
        }
    }, [item, type]);

    if (!item) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        setIsSaving(true);
        const endpoint = type === 'file' ? `/files/${item.id}` : `/folders/${item.id}`;
        const payload: Record<string, any> = {
            name: name.trim(),
            description: description.trim() || null,
        };

        if (type === 'file' && coordinateSystem.trim()) {
            payload.coordinate_system = coordinateSystem.trim();
        }

        router.put(endpoint, payload, {
            onSuccess: () => {
                toast.success('Updated successfully');
                setIsSaving(false);
                onClose();
            },
            onError: (errors) => {
                setIsSaving(false);
                const first = Object.values(errors)[0] as string;
                toast.error(first || 'Update failed');
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-5 text-emerald-600" />
                        <span>Edit {type === 'file' ? 'File' : 'Folder'} Details</span>
                    </DialogTitle>
                    <DialogDescription>
                        Rename item and update surveying engineering attributes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="rename_val" className="text-xs font-semibold">
                            Name *
                        </Label>
                        <Input
                            id="rename_val"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            className="h-9 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="desc_val" className="text-xs font-semibold">
                            Description / Purpose
                        </Label>
                        <Input
                            id="desc_val"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Engineering or project note..."
                            className="h-9 text-xs"
                        />
                    </div>

                    {type === 'file' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="crs_val" className="text-xs font-semibold">
                                Coordinate Reference System (CRS)
                            </Label>
                            <Input
                                id="crs_val"
                                value={coordinateSystem}
                                onChange={(e) => setCoordinateSystem(e.target.value)}
                                placeholder="e.g. WGS84 / UTM Zone 51N"
                                className="h-9 text-xs"
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSaving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin mr-1.5" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

