import { router } from '@inertiajs/react';
import { Folder, FolderPlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
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

interface NewFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolderId?: number | null;
    currentFolderName?: string | null;
    currentProjectId?: number | null;
}

const COLOR_OPTIONS = [
    { label: 'Emerald', value: '#059669' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Cyan', value: '#0891b2' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Purple', value: '#9333ea' },
    { label: 'Rose', value: '#e11d48' },
];

export default function NewFolderModal({
    isOpen,
    onClose,
    currentFolderId,
    currentFolderName,
    currentProjectId,
}: NewFolderModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#059669');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Folder name is required');
            return;
        }

        setIsSubmitting(true);
        router.post(
            '/folders',
            {
                name: name.trim(),
                description: description.trim() || null,
                color,
                category: 'general',
                parent_id: currentFolderId || null,
                project_id: currentProjectId || null,
            },
            {
                onSuccess: () => {
                    toast.success(`Folder '${name}' created`);
                    setName('');
                    setDescription('');
                    setIsSubmitting(false);
                    onClose();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to create folder');
                },
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="size-5 text-emerald-600" />
                        <span>Create New Folder</span>
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-1.5 pt-1">
                        <Folder className="size-3.5 text-emerald-600 shrink-0" />
                        <span>
                            Location:{' '}
                            <strong className="text-foreground">
                                {currentFolderName || 'My Files (Root)'}
                            </strong>
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="folder_name" className="text-xs font-semibold">
                            Folder Name *
                        </Label>
                        <Input
                            id="folder_name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Lot Survey 2026, DLSD Data, CAD Plans..."
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="folder_desc" className="text-xs font-semibold">
                            Description (optional)
                        </Label>
                        <Input
                            id="folder_desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional notes about this folder..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Folder Color</Label>
                        <div className="flex items-center gap-2">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`size-6 rounded-full transition-transform ${
                                        color === c.value ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin mr-1.5" />
                                    Creating...
                                </>
                            ) : (
                                'Create Folder'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
