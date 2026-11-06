import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Briefcase,
    Calendar,
    Compass,
    Database,
    Download,
    Eye,
    Folder,
    FolderTree,
    HardDrive,
    Layers,
    MapPin,
    Plus,
    Shield,
    Trash2,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import FileIcon from '@/components/drive/file-icon';
import FilePreviewModal from '@/components/drive/file-preview-modal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ActivityItem, FileItem, FolderItem, ProjectItem, User } from '@/types/file-management';

interface ProjectShowProps {
    project: ProjectItem;
    files: FileItem[];
    folders: FolderItem[];
    storageUsed: number;
    activities: ActivityItem[];
    availableUsers: User[];
}

export default function ProjectShow({
    project,
    files,
    folders,
    storageUsed,
    activities,
    availableUsers,
}: ProjectShowProps) {
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [memberRole, setMemberRole] = useState('Field Crew');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error('Please select an employee');
            return;
        }

        setIsSubmitting(true);
        router.post(
            `/projects/${project.id}/members`,
            {
                user_id: parseInt(selectedUserId, 10),
                role: memberRole,
            },
            {
                onSuccess: () => {
                    toast.success('Team member assigned to project');
                    setIsSubmitting(false);
                    setIsAddMemberOpen(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                    toast.error('Failed to add member');
                },
            }
        );
    };

    const handleRemoveMember = (userId: number, memberName: string) => {
        if (confirm(`Remove ${memberName} from this project's team?`)) {
            router.delete(`/projects/${project.id}/members/${userId}`, {
                onSuccess: () => toast.success(`Removed ${memberName} from project team`),
            });
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    return (
        <>
            <Head title={`${project.code} - ${project.name}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Project Header Banner */}
                <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300">
                                {project.code}
                            </span>
                            <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                                {project.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                                Client: <strong className="text-foreground">{project.client_name}</strong>
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {project.name}
                        </h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>Survey Type: <strong>{project.survey_type}</strong></span>
                            {project.location && (
                                <>
                                    <span>•</span>
                                    <span>Location: <strong>{project.location}</strong></span>
                                </>
                            )}
                            <span>•</span>
                            <span>Storage: <strong>{formatBytes(storageUsed)}</strong></span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            <Link href={`/drive?project_id=${project.id}`}>
                                <FolderTree className="size-4" />
                                <span>Open Project Drive</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Technical Specifications & Geodetic Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-muted/30 text-xs font-mono">
                    <div>
                        <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                            Coordinate System (CRS)
                        </span>
                        <span className="font-medium text-foreground truncate block">
                            {project.coordinate_system || 'WGS84 / UTM Zone 51N'}
                        </span>
                    </div>

                    <div>
                        <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                            Vertical Datum
                        </span>
                        <span className="font-medium text-foreground truncate block">
                            {project.datum || 'Mean Sea Level (MSL)'}
                        </span>
                    </div>

                    <div>
                        <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                            Primary Geodetic Benchmark
                        </span>
                        <span className="font-medium text-foreground truncate block">
                            {project.benchmark_ref || 'BM-01 Elev: 45.32m'}
                        </span>
                    </div>

                    <div>
                        <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase block">
                            Project Manager
                        </span>
                        <span className="font-medium text-emerald-600 truncate block">
                            {project.manager?.name || 'Engineer in Charge'}
                        </span>
                    </div>
                </div>

                {/* Main 2-Column: Left (Folders & Files), Right (Team & Audit) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Standard Folders & Latest Project Files */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Standard Engineering Subfolders */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Folder className="size-4 text-sky-600" />
                                    <span>Standard Project Folders ({folders.length})</span>
                                </h3>
                                <Link
                                    href={`/drive?project_id=${project.id}`}
                                    className="text-xs font-semibold text-emerald-600 hover:underline"
                                >
                                    Open in Explorer
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {folders.map((fol) => (
                                    <Link
                                        key={fol.id}
                                        href={`/drive?folder_id=${fol.id}&project_id=${project.id}`}
                                        className="p-3 rounded-xl border border-border bg-card hover:border-emerald-500/50 hover:shadow-xs transition-all flex items-center gap-3"
                                    >
                                        <div
                                            className="size-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${fol.color || '#2563eb'}20`, color: fol.color || '#2563eb' }}
                                        >
                                            <Folder className="size-4 fill-current" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-foreground truncate">{fol.name}</h4>
                                            <p className="text-[11px] text-muted-foreground">{fol.files_count || 0} files</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Recent Project Files Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <HardDrive className="size-4 text-emerald-600" />
                                    <span>Project Files & Revisions ({files.length})</span>
                                </h3>
                            </div>

                            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                                {files.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        No files uploaded to this project yet. Open Project Drive to upload drawings and logs.
                                    </div>
                                ) : (
                                    files.map((file) => (
                                        <div
                                            key={file.id}
                                            onClick={() => setPreviewFile(file)}
                                            className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileIcon extension={file.extension} category={file.category} className="size-6 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground truncate max-w-sm">
                                                            {file.name}
                                                        </span>
                                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                                            v{file.current_version}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        <span>{file.formatted_size || `${(file.size_bytes / 1024).toFixed(1)} KB`}</span>
                                                        <span>•</span>
                                                        <span>{file.folder?.name || 'Root'}</span>
                                                        <span>•</span>
                                                        <span>By {file.creator?.name || 'Engineer'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setPreviewFile(file)}
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <Eye className="size-3.5" />
                                                </Button>
                                                <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-sky-600">
                                                    <a href={`/files/${file.id}/download`} download>
                                                        <Download className="size-3.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Team Members & Audit Trail */}
                    <div className="space-y-6">
                        {/* Team Access */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Users className="size-4 text-purple-600" />
                                    <span>Assigned Engineering Team</span>
                                </h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsAddMemberOpen(true)}
                                    className="h-7 text-xs gap-1"
                                >
                                    <UserPlus className="size-3.5" />
                                    <span>Add</span>
                                </Button>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                                {project.members && project.members.length > 0 ? (
                                    project.members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 text-xs"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-foreground truncate">{member.name}</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Role: <strong className="text-emerald-600">{member.pivot?.role || member.role}</strong>
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMember(member.id, member.name)}
                                                className="p-1 text-muted-foreground hover:text-rose-600 transition-colors"
                                                title="Remove member"
                                            >
                                                <UserMinus className="size-3.5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground p-2">No team members assigned.</p>
                                )}
                            </div>
                        </div>

                        {/* Project Audit Log */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Activity className="size-4 text-emerald-600" />
                                <span>Project Audit History</span>
                            </h3>

                            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                {activities.slice(0, 8).map((act) => (
                                    <div key={act.id} className="text-xs pb-2 border-b border-border/60 last:border-0 last:pb-0">
                                        <p className="text-foreground">
                                            <span className="font-semibold text-emerald-600">{act.user?.name || 'Engineer'}</span>{' '}
                                            <span className="capitalize">{act.action.replace('_', ' ')}</span>{' '}
                                            <strong className="truncate">{act.subject_name}</strong>
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {new Date(act.created_at).toLocaleString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <FilePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />

            {/* Add Member Dialog */}
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="size-5 text-emerald-600" />
                            <span>Assign Employee to Project</span>
                        </DialogTitle>
                        <DialogDescription>
                            Grant project access and define their survey role on {project.code}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddMember} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Select Employee</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Choose employee..." />
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
                            <Label className="text-xs font-semibold">Project Role</Label>
                            <Select value={memberRole} onValueChange={setMemberRole}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Principal Engineer">Principal Geodetic Engineer</SelectItem>
                                    <SelectItem value="Project Manager">Project Manager</SelectItem>
                                    <SelectItem value="Lead Surveyor">Lead Field Surveyor</SelectItem>
                                    <SelectItem value="CAD Specialist">CAD & Civil 3D Specialist</SelectItem>
                                    <SelectItem value="Field Crew">Field Survey Crew</SelectItem>
                                    <SelectItem value="Client Representative">Client Representative</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddMemberOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !selectedUserId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Assign to Project
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

