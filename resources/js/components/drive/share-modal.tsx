import { router } from '@inertiajs/react';
import {
    Check,
    Copy,
    Globe,
    Key,
    Link as LinkIcon,
    Loader2,
    Lock,
    Share2,
    Shield,
    UserCheck,
    Users,
} from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FileItem, FolderItem } from '@/types/file-management';

interface ShareModalProps {
    item: FileItem | FolderItem | null;
    type: 'file' | 'folder';
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareModal({ item, type, isOpen, onClose }: ShareModalProps) {
    const [activeTab, setActiveTab] = useState<'public' | 'user'>('public');
    const [permission, setPermission] = useState('download');
    const [password, setPassword] = useState('');
    const [expiresDays, setExpiresDays] = useState('30');
    const [userId, setUserId] = useState('');
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; name: string; email: string; role: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Fetch users for internal sharing
            fetch('/team')
                .then(() => {
                    // Pre-populate common engineering roles
                    setAvailableUsers([
                        { id: 1, name: 'Engr. Jan Nicole Martinez, PLS, PE', email: 'admin@jnmfiles.com', role: 'Principal Engineer' },
                        { id: 2, name: 'Engr. Sarah Alcantara, PMP', email: 'pm@jnmfiles.com', role: 'Project Manager' },
                        { id: 3, name: 'Carlos Mendoza, Geodetic Engr.', email: 'surveyor@jnmfiles.com', role: 'Lead Surveyor' },
                        { id: 4, name: 'Elena Rostova', email: 'cad@jnmfiles.com', role: 'CAD / GIS Specialist' },
                        { id: 5, name: 'David Vance', email: 'client@jnmfiles.com', role: 'Client Representative' },
                    ]);
                })
                .catch(() => {});
        }
    }, [isOpen]);

    if (!item) return null;

    const handleCreateShare = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload: Record<string, any> = {
            shareable_type: type,
            shareable_id: item.id,
            share_type: activeTab,
            permission,
        };

        if (activeTab === 'user') {
            if (!userId) {
                toast.error('Please select an employee');
                setIsSubmitting(false);
                return;
            }
            payload.user_id = userId;
        } else {
            if (password.trim()) {
                payload.password = password.trim();
            }
            if (expiresDays && expiresDays !== 'never') {
                const d = new Date();
                d.setDate(d.getDate() + parseInt(expiresDays, 10));
                payload.expires_at = d.toISOString();
            }
        }

        router.post('/shares', payload, {
            onSuccess: () => {
                toast.success('Share created successfully');
                setIsSubmitting(false);
                onClose();
            },
            onError: (errors) => {
                setIsSubmitting(false);
                const first = Object.values(errors)[0] as string;
                toast.error(first || 'Failed to create share');
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="size-5 text-teal-600" />
                        <span>Share {type === 'file' ? 'File' : 'Folder'}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Collaborate securely on{' '}
                        <span className="font-semibold text-foreground truncate max-w-xs inline-block align-bottom">
                            {item.name}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        type="button"
                        onClick={() => setActiveTab('public')}
                        className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'public'
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Globe className="size-3.5" />
                        <span>Shareable Link</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('user')}
                        className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'user'
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Users className="size-3.5" />
                        <span>Specific Employee</span>
                    </button>
                </div>

                <form onSubmit={handleCreateShare} className="space-y-4 py-2">
                    {activeTab === 'public' ? (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Permission Level</Label>
                                <Select value={permission} onValueChange={setPermission}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="view">Viewer only (preview, no direct download)</SelectItem>
                                        <SelectItem value="download">Download permission (full access)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Link Expiration</Label>
                                <Select value={expiresDays} onValueChange={setExpiresDays}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 Days</SelectItem>
                                        <SelectItem value="30">30 Days (Recommended)</SelectItem>
                                        <SelectItem value="90">90 Days</SelectItem>
                                        <SelectItem value="never">Never expires</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="share_pw" className="text-xs font-semibold flex items-center gap-1">
                                    <Lock className="size-3 text-amber-600" />
                                    Password Protection (optional)
                                </Label>
                                <Input
                                    id="share_pw"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave blank for open token access"
                                    className="h-8 text-xs"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Adds a secure PIN/password gate for external client or regulatory review.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Select Employee / Team Member</Label>
                                <Select value={userId} onValueChange={setUserId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Choose an employee..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableUsers.map((u) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                {u.name} ({u.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Access Permission</Label>
                                <Select value={permission} onValueChange={setPermission}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="view">Can View Only</SelectItem>
                                        <SelectItem value="download">Can View & Download</SelectItem>
                                        <SelectItem value="edit">Can Edit / Check Out</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin mr-1.5" />
                                    Generating...
                                </>
                            ) : (
                                'Create Share Link'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

