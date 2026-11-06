import { Head, Link, router } from '@inertiajs/react';
import {
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    Compass,
    FileText,
    FolderTree,
    HardDrive,
    Layers,
    MapPin,
    Plus,
    Search,
    Shield,
    Users,
} from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ProjectItem, User } from '@/types/file-management';

interface ProjectsPageProps {
    projects: ProjectItem[];
    users: User[];
    filters: {
        q: string;
        status: string;
        survey_type: string;
    };
}

export default function ProjectsIndex({ projects, users, filters }: ProjectsPageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.q || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [code, setCode] = useState(`PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`);
    const [name, setName] = useState('');
    const [clientName, setClientName] = useState('');
    const [location, setLocation] = useState('');
    const [surveyType, setSurveyType] = useState('Boundary Survey');
    const [status, setStatus] = useState('planning');
    const [coordinateSystem, setCoordinateSystem] = useState('WGS84 / UTM Zone 51N (EPSG:32651)');
    const [datum, setDatum] = useState('Mean Sea Level (MSL)');
    const [benchmarkRef, setBenchmarkRef] = useState('BM-01');
    const [managerId, setManagerId] = useState(users[0]?.id?.toString() || '');
    const [description, setDescription] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/projects', { ...filters, q: searchQuery }, { preserveState: true, replace: true });
    };

    const handleFilterStatus = (newStatus: string) => {
        router.get('/projects', { ...filters, status: newStatus }, { preserveState: true, replace: true });
    };

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            '/projects',
            {
                code,
                name,
                client_name: clientName,
                location: location || null,
                survey_type: surveyType,
                status,
                coordinate_system: coordinateSystem,
                datum,
                benchmark_ref: benchmarkRef,
                manager_id: managerId ? parseInt(managerId, 10) : null,
                description: description || null,
            },
            {
                onSuccess: () => {
                    toast.success(`Project ${code} created with standard survey folders`);
                    setIsSubmitting(false);
                    setIsCreateOpen(false);
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to create project');
                },
            }
        );
    };

    const getStatusBadge = (st: string) => {
        switch (st) {
            case 'approved':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
            case 'review':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300';
            case 'processing':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300';
            case 'field_work':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300';
            case 'archived':
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return '0 B';
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1024).toFixed(0) + ' KB';
    };

    return (
        <>
            <Head title="Surveying & Engineering Projects - JNM Files" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Briefcase className="size-6 text-emerald-600" />
                            <span>Land Surveying & Engineering Projects</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Project-based file organization with automated surveying folder templates and employee access control.
                        </p>
                    </div>

                    <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <Plus className="size-4" />
                        <span>New Survey Project</span>
                    </Button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
                    <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by code, title, client, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </form>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {['all', 'planning', 'field_work', 'processing', 'review', 'approved'].map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => handleFilterStatus(st)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors border ${
                                    (filters.status || 'all') === st
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                                }`}
                            >
                                {st.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="flex flex-col justify-between p-5 rounded-xl border border-border bg-card hover:border-emerald-500/40 hover:shadow-sm transition-all"
                        >
                            <div className="space-y-3">
                                {/* Top Badges */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300">
                                            {project.code}
                                        </span>
                                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                        <HardDrive className="size-3 text-emerald-600" />
                                        {formatBytes(project.storage_used_bytes)}
                                    </span>
                                </div>

                                {/* Title & Client */}
                                <div>
                                    <Link
                                        href={`/projects/${project.id}`}
                                        className="text-base font-bold text-foreground hover:text-emerald-600 transition-colors line-clamp-1"
                                    >
                                        {project.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                                        <span>Client: {project.client_name}</span>
                                        {project.location && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="size-3 text-muted-foreground/80" />
                                                    {project.location}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <p className="text-xs text-muted-foreground/90 line-clamp-2">
                                    {project.description || 'No project description recorded.'}
                                </p>

                                {/* Survey Specifications */}
                                <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] grid grid-cols-2 gap-2 font-mono">
                                    <div>
                                        <span className="text-muted-foreground text-[10px] block uppercase font-sans font-semibold">Survey Type</span>
                                        <span className="font-medium truncate block">{project.survey_type}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-[10px] block uppercase font-sans font-semibold">Coordinate System</span>
                                        <span className="font-medium truncate block">{project.coordinate_system || 'WGS84 / UTM 51N'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer info & Navigation buttons */}
                            <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between gap-3 text-xs">
                                <div className="text-muted-foreground flex items-center gap-2">
                                    <span>{project.files_count || 0} files</span>
                                    <span>•</span>
                                    <span>{project.folders_count || 0} folders</span>
                                    <span>•</span>
                                    <span>PM: {project.manager?.name || 'Engineer'}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/drive?project_id=${project.id}`}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold hover:bg-emerald-100 transition-colors text-xs"
                                    >
                                        <FolderTree className="size-3.5" />
                                        <span>Files</span>
                                    </Link>
                                    <Link
                                        href={`/projects/${project.id}`}
                                        className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent font-semibold text-foreground text-xs"
                                    >
                                        Overview →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Project Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Briefcase className="size-5 text-emerald-600" />
                            <span>Create New Survey & Engineering Project</span>
                        </DialogTitle>
                        <DialogDescription>
                            Initializes project workspace and automatically creates the standard 6 surveying subfolders (Field Raw Data, CAD & Drawings, GIS & LiDAR, Photos, Deliverables, Legal & Permits).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateProject} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="prj_code" className="text-xs font-semibold">
                                    Project Code *
                                </Label>
                                <Input
                                    id="prj_code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="e.g. PRJ-2026-005"
                                    required
                                    className="font-mono text-xs uppercase"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="prj_status" className="text-xs font-semibold">
                                    Initial Status
                                </Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planning">Planning & Mobilization</SelectItem>
                                        <SelectItem value="field_work">Field Surveying & Data Collection</SelectItem>
                                        <SelectItem value="processing">CAD & Coordinate Processing</SelectItem>
                                        <SelectItem value="review">QA/QC & Stamping Review</SelectItem>
                                        <SelectItem value="approved">Approved & Certified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="prj_name" className="text-xs font-semibold">
                                Project Name *
                            </Label>
                            <Input
                                id="prj_name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Oakwood Commercial Plaza As-Built & ALTA/NSPS Survey"
                                required
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="prj_client" className="text-xs font-semibold">
                                    Client Organization *
                                </Label>
                                <Input
                                    id="prj_client"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="e.g. Department of Transportation / Prime Developers"
                                    required
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="prj_loc" className="text-xs font-semibold">
                                    Project Location
                                </Label>
                                <Input
                                    id="prj_loc"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Highway Mile 14, West Valley Sector"
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="prj_type" className="text-xs font-semibold">
                                    Survey & Engineering Discipline
                                </Label>
                                <Select value={surveyType} onValueChange={setSurveyType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Boundary Survey">Boundary & Monument Relocation</SelectItem>
                                        <SelectItem value="Topographic Survey">Topographic & Contour Survey</SelectItem>
                                        <SelectItem value="Subdivision Platting">Subdivision & Consolidation Plat</SelectItem>
                                        <SelectItem value="As-Built / ALTA">As-Built & ALTA/NSPS Survey</SelectItem>
                                        <SelectItem value="Construction Staking">Construction Staking & Alignment</SelectItem>
                                        <SelectItem value="Geodetic Control">Primary Geodetic Control Network</SelectItem>
                                        <SelectItem value="Aerial LiDAR & Drone">Aerial LiDAR & UAV Photogrammetry</SelectItem>
                                        <SelectItem value="Hydrographic">Hydrographic & Bathymetric Survey</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="prj_pm" className="text-xs font-semibold">
                                    Assigned Project Manager
                                </Label>
                                <Select value={managerId} onValueChange={setManagerId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                {u.name} ({u.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Coordinate & Geodetic Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                            <div className="space-y-1">
                                <Label htmlFor="prj_crs" className="text-[11px] font-semibold">
                                    Coordinate Reference (CRS)
                                </Label>
                                <Input
                                    id="prj_crs"
                                    value={coordinateSystem}
                                    onChange={(e) => setCoordinateSystem(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="prj_datum" className="text-[11px] font-semibold">
                                    Vertical Datum
                                </Label>
                                <Input
                                    id="prj_datum"
                                    value={datum}
                                    onChange={(e) => setDatum(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="prj_bm" className="text-[11px] font-semibold">
                                    Primary Benchmark
                                </Label>
                                <Input
                                    id="prj_bm"
                                    value={benchmarkRef}
                                    onChange={(e) => setBenchmarkRef(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="prj_desc" className="text-xs font-semibold">
                                Scope of Work & Narrative
                            </Label>
                            <Input
                                id="prj_desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Details on parcel size, required accuracy tolerances, total stations or RTK rovers used..."
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Create Project Workspace
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

