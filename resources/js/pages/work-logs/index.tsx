import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Check,
    CheckCircle2,
    ClipboardList,
    Clock,
    Edit2,
    FileCheck2,
    Filter,
    PauseCircle,
    Plus,
    Printer,
    RotateCcw,
    Search,
    ShieldCheck,
    Trash2,
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

export interface WorkLogItem {
    id: number;
    work_type: string;
    lot_no: string;
    location: string;
    owner: string;
    progress_status: string;
    plan_completed: string;
    survey_type: string;
    date_of_survey: string;
    dlsd_downloaded: string;
    print_status?: string | null;
    date_printed?: string;
    creator?: { id: number; name: string } | null;
    updater?: { id: number; name: string } | null;
    created_at?: string;
    updated_at?: string;
}

interface WorkLogsPageProps {
    workLogs: WorkLogItem[];
    options?: {
        workTypes: string[];
        progressStatuses: string[];
        surveyTypes: string[];
        dlsdOptions: string[];
        printStatuses?: string[];
    };
}

const DEFAULT_WORK_TYPES = ['SCHEME', 'SURVEY RETURN', 'SKETCH', 'OTHERS'];

const DEFAULT_PROGRESS_STATUSES = [
    'Complete',
    'In progress',
    'pending',
    'file submitted',
    'survey only',
    'pause',
];

const DEFAULT_SURVEY_TYPES = [
    'RELOCATION',
    'SUBDIVISION',
    'CONSULTATION',
    'CONSO-SUBD',
    'SEGREGATION',
    'TOPOGRAPHIC',
    'CONSTRUCTION',
    'PLAN(ORIGINAL SURVEY)',
    'OTHERS',
    'JOINT SURVEY',
    'AS-STAKED SURVEY',
];

const DEFAULT_DLSD_OPTIONS = ['Yes', 'No'];

function getWorkTypeBadgeClass(type: string): string {
    switch (type) {
        case 'SCHEME':
            return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
        case 'SURVEY RETURN':
            return 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30';
        case 'SKETCH':
            return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
        default:
            return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
}

function getProgressBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
        case 'complete':
            return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
        case 'in progress':
            return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
        case 'pending':
            return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
        case 'file submitted':
            return 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30';
        case 'survey only':
            return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
        case 'pause':
            return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
        default:
            return 'bg-muted text-foreground border-border';
    }
}

function getDlsdBadgeClass(val: string): string {
    return val.toLowerCase() === 'yes'
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
}

interface InlineTextCellProps {
    initialValue: string;
    placeholder: string;
    ariaLabel: string;
    disabled?: boolean;
    className?: string;
    onCommit: (nextValue: string) => void;
}

function InlineTextCell({
    initialValue,
    placeholder,
    ariaLabel,
    disabled = false,
    className = '',
    onCommit,
}: InlineTextCellProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (disabled) {
        return (
            <span className={`block px-2 py-1 text-xs ${className}`}>
                {initialValue || <span className="text-muted-foreground/50 italic">—</span>}
            </span>
        );
    }

    const commitIfChanged = () => {
        const trimmed = value.trim();
        if (trimmed !== (initialValue || '').trim()) {
            onCommit(trimmed);
        }
    };

    return (
        <input
            type="text"
            aria-label={ariaLabel}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commitIfChanged}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                    setValue(initialValue);
                    e.currentTarget.blur();
                }
            }}
            className={`w-full h-8 rounded-md border border-border/50 hover:border-border focus:border-emerald-500 bg-background/60 focus:bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${className}`}
        />
    );
}

export default function WorkLogsIndex({ workLogs = [], options }: WorkLogsPageProps) {
    const pageProps = usePage().props as any;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || pageProps.auth?.user?.role === 'admin');

    const workTypes = options?.workTypes ?? DEFAULT_WORK_TYPES;
    const progressStatuses = options?.progressStatuses ?? DEFAULT_PROGRESS_STATUSES;
    const surveyTypes = options?.surveyTypes ?? DEFAULT_SURVEY_TYPES;
    const dlsdOptions = options?.dlsdOptions ?? DEFAULT_DLSD_OPTIONS;

    // Search & Filters
    const [search, setSearch] = useState('');
    const [filterWorkType, setFilterWorkType] = useState<string>('ALL');
    const [filterProgress, setFilterProgress] = useState<string>('ALL');
    const [filterSurvey, setFilterSurvey] = useState<string>('ALL');
    const [filterDlsd, setFilterDlsd] = useState<string>('ALL');

    // Add / Edit / Delete Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<WorkLogItem | null>(null);
    const [deletingLog, setDeletingLog] = useState<WorkLogItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State (used for Add & Edit Dialogs)
    const [formWorkType, setFormWorkType] = useState<string>(workTypes[0] || 'SCHEME');
    const [formLotNo, setFormLotNo] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formOwner, setFormOwner] = useState('');
    const [formProgress, setFormProgress] = useState<string>('pending');
    const [formPlanCompleted, setFormPlanCompleted] = useState('');
    const [formSurveyType, setFormSurveyType] = useState<string>(surveyTypes[0] || 'RELOCATION');
    const [formDateOfSurvey, setFormDateOfSurvey] = useState('');
    const [formDlsd, setFormDlsd] = useState<string>('No');

    const resetForm = () => {
        setFormWorkType(workTypes[0] || 'SCHEME');
        setFormLotNo('');
        setFormLocation('');
        setFormOwner('');
        setFormProgress('pending');
        setFormPlanCompleted('');
        setFormSurveyType(surveyTypes[0] || 'RELOCATION');
        setFormDateOfSurvey('');
        setFormDlsd('No');
    };

    const openAddModal = () => {
        resetForm();
        setIsAddOpen(true);
    };

    const openEditModal = (log: WorkLogItem) => {
        setEditingLog(log);
        setFormWorkType(log.work_type || 'SCHEME');
        setFormLotNo(log.lot_no || '');
        setFormLocation(log.location || '');
        setFormOwner(log.owner || '');
        setFormProgress(log.progress_status || 'pending');
        setFormPlanCompleted(log.plan_completed || '');
        setFormSurveyType(log.survey_type || 'RELOCATION');
        setFormDateOfSurvey(log.date_of_survey || '');
        setFormDlsd(log.dlsd_downloaded || 'No');
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            '/work-logs',
            {
                work_type: formWorkType,
                lot_no: formLotNo.trim(),
                location: formLocation.trim(),
                owner: formOwner.trim(),
                progress_status: formProgress,
                plan_completed: formPlanCompleted || null,
                survey_type: formSurveyType,
                date_of_survey: formDateOfSurvey || null,
                dlsd_downloaded: formDlsd,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Work log entry added.');
                    setIsSubmitting(false);
                    setIsAddOpen(false);
                    resetForm();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to add work log.');
                },
            }
        );
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLog) return;
        setIsSubmitting(true);

        const payload: Record<string, string | null> = {
            progress_status: formProgress,
            plan_completed: formPlanCompleted || null,
            survey_type: formSurveyType,
            date_of_survey: formDateOfSurvey || null,
            dlsd_downloaded: formDlsd,
        };

        if (isAdmin) {
            payload.work_type = formWorkType;
            payload.lot_no = formLotNo.trim();
            payload.location = formLocation.trim();
            payload.owner = formOwner.trim();
        }

        router.put(`/work-logs/${editingLog.id}`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Work log updated.');
                setIsSubmitting(false);
                setEditingLog(null);
            },
            onError: (errors) => {
                setIsSubmitting(false);
                const first = Object.values(errors)[0] as string;
                toast.error(first || 'Failed to update work log.');
            },
        });
    };

    const handleInlineUpdate = (
        logId: number,
        field: keyof WorkLogItem,
        value: string
    ) => {
        const isDateField = field === 'date_of_survey' || field === 'plan_completed';

        router.put(
            `/work-logs/${logId}`,
            {
                [field]: value === '' && isDateField ? null : value,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Updated work log.');
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to update field.');
                },
            }
        );
    };

    const handleSendToPrint = (log: WorkLogItem) => {
        router.post(
            `/work-logs/${log.id}/send-to-print`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Recorded "${log.lot_no || log.owner || log.work_type}" in TO PRINT / PRINTED list.`
                    );
                },
                onError: () => {
                    toast.error('Failed to record in TO PRINT / PRINTED list.');
                },
            }
        );
    };

    const handleDelete = () => {
        if (!deletingLog) return;
        setIsSubmitting(true);

        router.delete(`/work-logs/${deletingLog.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Work log entry deleted.');
                setIsSubmitting(false);
                setDeletingLog(null);
            },
            onError: () => {
                setIsSubmitting(false);
                toast.error('Failed to delete work log entry.');
            },
        });
    };

    const filteredLogs = workLogs.filter((log) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            (log.lot_no || '').toLowerCase().includes(q) ||
            (log.location || '').toLowerCase().includes(q) ||
            (log.owner || '').toLowerCase().includes(q) ||
            (log.plan_completed || '').toLowerCase().includes(q) ||
            (log.work_type || '').toLowerCase().includes(q) ||
            (log.survey_type || '').toLowerCase().includes(q);

        const matchesWorkType = filterWorkType === 'ALL' || log.work_type === filterWorkType;
        const matchesProgress = filterProgress === 'ALL' || log.progress_status === filterProgress;
        const matchesSurvey = filterSurvey === 'ALL' || log.survey_type === filterSurvey;
        const matchesDlsd = filterDlsd === 'ALL' || log.dlsd_downloaded === filterDlsd;

        return (
            matchesSearch &&
            matchesWorkType &&
            matchesProgress &&
            matchesSurvey &&
            matchesDlsd
        );
    });

    const hasActiveFilters =
        search.trim() !== '' ||
        filterWorkType !== 'ALL' ||
        filterProgress !== 'ALL' ||
        filterSurvey !== 'ALL' ||
        filterDlsd !== 'ALL';

    const clearFilters = () => {
        setSearch('');
        setFilterWorkType('ALL');
        setFilterProgress('ALL');
        setFilterSurvey('ALL');
        setFilterDlsd('ALL');
    };

    // Summary counts
    const totalCount = workLogs.length;
    const completedCount = workLogs.filter((l) => l.progress_status.toLowerCase() === 'complete').length;
    const inProgressCount = workLogs.filter((l) => l.progress_status.toLowerCase() === 'in progress').length;
    const pendingCount = workLogs.filter((l) => l.progress_status.toLowerCase() === 'pending').length;
    const pausedOrOtherCount = totalCount - completedCount - inProgressCount - pendingCount;
    const printQueueCount = workLogs.filter((l) => Boolean(l.print_status)).length;

    return (
        <>
            <Head title="Work Logs" />

            <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1650px] mx-auto w-full">
                {/* Page Header & TO PRINT / PRINTED Switcher */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-1 mb-2.5">
                            <Link
                                href="/work-logs"
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs"
                            >
                                <ClipboardList className="size-3.5" />
                                <span>Work Logs</span>
                            </Link>
                            <Link
                                href="/work-logs/print-queue"
                                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Printer className="size-3.5" />
                                <span>TO PRINT / PRINTED</span>
                                <span className="ml-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-bold">
                                    {printQueueCount}
                                </span>
                            </Link>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            <ClipboardList className="size-6 text-emerald-600" />
                            <span>Work Logs</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Company work registry — click the <strong>Check (✓)</strong> button on any row to record it in the <strong>TO PRINT / PRINTED</strong> page.
                        </p>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={openAddModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
                        >
                            <Plus className="size-4" />
                            <span>Add Work Log</span>
                        </Button>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Works
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</p>
                        </div>
                        <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <ClipboardList className="size-5" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Complete
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{completedCount}</p>
                        </div>
                        <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="size-5" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                In Progress
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{inProgressCount}</p>
                        </div>
                        <div className="size-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                            <Clock className="size-5" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Pending / Others
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">
                                {pendingCount + pausedOrOtherCount}
                            </p>
                        </div>
                        <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <PauseCircle className="size-5" />
                        </div>
                    </div>
                </div>

                {/* Search & Column Filters Bar */}
                <div className="p-3 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Lot No., Location, Owner..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                            <Filter className="size-3.5" />
                            <span className="font-medium hidden md:inline">Filters:</span>
                        </div>

                        {/* Filter by 1st Column (Scheme / Type) */}
                        <Select value={filterWorkType} onValueChange={setFilterWorkType}>
                            <SelectTrigger className="h-8 text-xs w-[145px]">
                                <SelectValue placeholder="Scheme / Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types (Col 1)</SelectItem>
                                {workTypes.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filter by 5th Column (Progress/Status) */}
                        <Select value={filterProgress} onValueChange={setFilterProgress}>
                            <SelectTrigger className="h-8 text-xs w-[150px]">
                                <SelectValue placeholder="Progress/Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Progress/Status</SelectItem>
                                {progressStatuses.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filter by 7th Column (Survey) */}
                        <Select value={filterSurvey} onValueChange={setFilterSurvey}>
                            <SelectTrigger className="h-8 text-xs w-[165px]">
                                <SelectValue placeholder="Survey Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Survey Types</SelectItem>
                                {surveyTypes.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filter by 9th Column (DLSD Downloaded) */}
                        <Select value={filterDlsd} onValueChange={setFilterDlsd}>
                            <SelectTrigger className="h-8 text-xs w-[140px]">
                                <SelectValue placeholder="DLSD Downloaded" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">DLSD: All</SelectItem>
                                {dlsdOptions.map((d) => (
                                    <SelectItem key={d} value={d}>
                                        DLSD: {d}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="size-3.5" />
                                <span>Reset</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main 9-Column Work Logs Table */}
                <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
                            <thead>
                                <tr className="border-b border-border bg-emerald-950/90 text-white font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-3 min-w-[155px] border-r border-emerald-800/40">
                                        <div className="flex flex-col gap-0.5">
                                            <span>1. SCHEME / TYPE</span>
                                            <span className="text-[9px] font-normal text-emerald-300/90 normal-case">
                                                SCHEME • SURVEY RETURN • SKETCH • OTHERS
                                            </span>
                                        </div>
                                    </th>
                                    <th className="py-3 px-3 min-w-[135px] border-r border-emerald-800/40">
                                        2. LOT NO.
                                    </th>
                                    <th className="py-3 px-3 min-w-[175px] border-r border-emerald-800/40">
                                        3. LOCATION
                                    </th>
                                    <th className="py-3 px-3 min-w-[165px] border-r border-emerald-800/40">
                                        4. OWNER
                                    </th>
                                    <th className="py-3 px-3 min-w-[155px] border-r border-emerald-800/40">
                                        5. PROGRESS / STATUS
                                    </th>
                                    <th className="py-3 px-3 min-w-[145px] border-r border-emerald-800/40">
                                        6. PLAN COMPLETED
                                    </th>
                                    <th className="py-3 px-3 min-w-[185px] border-r border-emerald-800/40">
                                        7. SURVEY
                                    </th>
                                    <th className="py-3 px-3 min-w-[145px] border-r border-emerald-800/40">
                                        8. DATE OF SURVEY
                                    </th>
                                    <th className="py-3 px-3 min-w-[135px] border-r border-emerald-800/40">
                                        9. DLSD DOWNLOADED
                                    </th>
                                    <th className="py-3 px-3 text-right min-w-[175px]">
                                        ACTIONS (✓ TO PRINT)
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FileCheck2 className="size-8 text-muted-foreground/50" />
                                                <p className="text-sm font-medium text-foreground">
                                                    No work logs found
                                                </p>
                                                <p className="text-xs text-muted-foreground max-w-md">
                                                    {isAdmin
                                                        ? 'Click the "Add Work Log" button above to open the modal and add a new work log entry.'
                                                        : 'No work log entries have been added by the administrator yet.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-muted/40 transition-colors group"
                                        >
                                            {/* 1st Column: Dropdown (SCHEME, SURVEY RETURN, SKETCH, OTHERS) - Admin editable even after recorded */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                {isAdmin ? (
                                                    <select
                                                        aria-label={`Work type for ${log.lot_no || log.id}`}
                                                        value={log.work_type}
                                                        onChange={(e) =>
                                                            handleInlineUpdate(log.id, 'work_type', e.target.value)
                                                        }
                                                        className={`w-full h-8 rounded-md border px-2 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getWorkTypeBadgeClass(
                                                            log.work_type
                                                        )}`}
                                                    >
                                                        {workTypes.map((t) => (
                                                            <option
                                                                key={t}
                                                                value={t}
                                                                className="bg-background text-foreground font-semibold"
                                                            >
                                                                {t}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-bold ${getWorkTypeBadgeClass(
                                                            log.work_type
                                                        )}`}
                                                    >
                                                        {log.work_type}
                                                    </span>
                                                )}
                                            </td>

                                            {/* 2nd Column: LOT No. - Admin editable inline even after recorded */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                <InlineTextCell
                                                    initialValue={log.lot_no}
                                                    placeholder="Lot No..."
                                                    ariaLabel={`Lot No for row ${log.id}`}
                                                    disabled={!isAdmin}
                                                    className="font-semibold"
                                                    onCommit={(val) =>
                                                        handleInlineUpdate(log.id, 'lot_no', val)
                                                    }
                                                />
                                            </td>

                                            {/* 3rd Column: LOCATION - Admin editable inline even after recorded */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                <InlineTextCell
                                                    initialValue={log.location}
                                                    placeholder="Location..."
                                                    ariaLabel={`Location for row ${log.id}`}
                                                    disabled={!isAdmin}
                                                    onCommit={(val) =>
                                                        handleInlineUpdate(log.id, 'location', val)
                                                    }
                                                />
                                            </td>

                                            {/* 4th Column: Owner - Admin editable inline even after recorded */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                <InlineTextCell
                                                    initialValue={log.owner}
                                                    placeholder="Owner..."
                                                    ariaLabel={`Owner for row ${log.id}`}
                                                    disabled={!isAdmin}
                                                    className="font-medium"
                                                    onCommit={(val) =>
                                                        handleInlineUpdate(log.id, 'owner', val)
                                                    }
                                                />
                                            </td>

                                            {/* 5th Column: Progress/Status Dropdown */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                <select
                                                    aria-label={`Progress status for ${log.lot_no || log.id}`}
                                                    value={log.progress_status}
                                                    onChange={(e) =>
                                                        handleInlineUpdate(
                                                            log.id,
                                                            'progress_status',
                                                            e.target.value
                                                        )
                                                    }
                                                    className={`w-full h-8 rounded-md border px-2 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getProgressBadgeClass(
                                                        log.progress_status
                                                    )}`}
                                                >
                                                    {progressStatuses.map((s) => (
                                                        <option
                                                            key={s}
                                                            value={s}
                                                            className="bg-background text-foreground font-semibold"
                                                        >
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* 6th Column: Plan Completed (DATE input) */}
                                            <td className="py-2 px-2.5 border-r border-border/60 font-mono text-xs text-foreground">
                                                <input
                                                    type="date"
                                                    aria-label={`Plan completed date for ${log.lot_no || log.id}`}
                                                    value={log.plan_completed || ''}
                                                    onChange={(e) =>
                                                        handleInlineUpdate(
                                                            log.id,
                                                            'plan_completed',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full h-8 rounded-md border border-border/50 hover:border-border focus:border-emerald-500 bg-background/60 focus:bg-background px-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                />
                                            </td>

                                            {/* 7th Column: SURVEY Dropdown */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                <select
                                                    aria-label={`Survey type for ${log.lot_no || log.id}`}
                                                    value={log.survey_type}
                                                    onChange={(e) =>
                                                        handleInlineUpdate(log.id, 'survey_type', e.target.value)
                                                    }
                                                    className="w-full h-8 rounded-md border border-border bg-muted/60 hover:bg-muted px-2 text-xs font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    {surveyTypes.map((s) => (
                                                        <option
                                                            key={s}
                                                            value={s}
                                                            className="bg-background text-foreground font-semibold"
                                                        >
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* 8th Column: DATE OF SURVEY */}
                                            <td className="py-2 px-2.5 border-r border-border/60 font-mono text-xs text-foreground">
                                                <input
                                                    type="date"
                                                    aria-label={`Date of survey for ${log.lot_no || log.id}`}
                                                    value={log.date_of_survey || ''}
                                                    onChange={(e) =>
                                                        handleInlineUpdate(
                                                            log.id,
                                                            'date_of_survey',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full h-8 rounded-md border border-border/50 hover:border-border focus:border-emerald-500 bg-background/60 focus:bg-background px-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                />
                                            </td>

                                            {/* 9th Column: DLSD DOWNLOADED Dropdown (Yes or No) */}
                                            <td className="py-2 px-2.5 border-r border-border/60">
                                                <select
                                                    aria-label={`DLSD downloaded for ${log.lot_no || log.id}`}
                                                    value={log.dlsd_downloaded}
                                                    onChange={(e) =>
                                                        handleInlineUpdate(
                                                            log.id,
                                                            'dlsd_downloaded',
                                                            e.target.value
                                                        )
                                                    }
                                                    className={`w-full h-8 rounded-md border px-2 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getDlsdBadgeClass(
                                                        log.dlsd_downloaded
                                                    )}`}
                                                >
                                                    {dlsdOptions.map((d) => (
                                                        <option
                                                            key={d}
                                                            value={d}
                                                            className="bg-background text-foreground font-semibold"
                                                        >
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Actions (Check to send to TO PRINT / PRINTED + Edit + Delete) */}
                                            <td className="py-2 px-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {log.print_status ? (
                                                        <Link
                                                            href="/work-logs/print-queue"
                                                            title="View in TO PRINT / PRINTED page"
                                                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                                                log.print_status === 'PRINTED'
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                                                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                                                            }`}
                                                        >
                                                            <Check className="size-3" />
                                                            <span>{log.print_status}</span>
                                                        </Link>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSendToPrint(log)}
                                                            className="h-7 px-2 text-[11px] font-semibold gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                                            title="Record this Lot No. in TO PRINT / PRINTED page"
                                                        >
                                                            <Check className="size-3.5" />
                                                            <span>To Print</span>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditModal(log)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        title="Edit Row"
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setDeletingLog(log)}
                                                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                            title="Delete Row"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                            Showing <strong className="text-foreground">{filteredLogs.length}</strong> of{' '}
                            <strong className="text-foreground">{totalCount}</strong> work log entries
                        </span>
                        <span>
                            {isAdmin
                                ? 'Admin Mode: All 9 columns (including Scheme/Type, Lot No., Location, and Owner) remain editable after recording.'
                                : 'Staff Mode: Columns 1–4 are set by Admin; you can update Progress/Status, Plan Completed date, Survey, Survey Date, and DLSD Downloaded.'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Add Work Log Modal (Admin) */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardList className="size-5 text-emerald-600" />
                            <span>Add New Work Log</span>
                        </DialogTitle>
                        <DialogDescription>
                            Enter the work log details below. All fields remain editable after recording.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    1. Scheme / Work Type *
                                </Label>
                                <Select value={formWorkType} onValueChange={setFormWorkType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workTypes.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="add_lot_no" className="text-xs font-semibold">
                                    2. LOT No.
                                </Label>
                                <Input
                                    id="add_lot_no"
                                    value={formLotNo}
                                    onChange={(e) => setFormLotNo(e.target.value)}
                                    placeholder="e.g. Lot 1024-B"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="add_location" className="text-xs font-semibold">
                                    3. LOCATION
                                </Label>
                                <Input
                                    id="add_location"
                                    value={formLocation}
                                    onChange={(e) => setFormLocation(e.target.value)}
                                    placeholder="e.g. Brgy. San Jose, Tagaytay"
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="add_owner" className="text-xs font-semibold">
                                    4. Owner
                                </Label>
                                <Input
                                    id="add_owner"
                                    value={formOwner}
                                    onChange={(e) => setFormOwner(e.target.value)}
                                    placeholder="e.g. Juan Dela Cruz"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    5. Progress / Status *
                                </Label>
                                <Select value={formProgress} onValueChange={setFormProgress}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {progressStatuses.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="add_plan_completed" className="text-xs font-semibold">
                                    6. Plan Completed (Date)
                                </Label>
                                <Input
                                    id="add_plan_completed"
                                    type="date"
                                    value={formPlanCompleted}
                                    onChange={(e) => setFormPlanCompleted(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">7. SURVEY *</Label>
                                <Select value={formSurveyType} onValueChange={setFormSurveyType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {surveyTypes.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="add_date_of_survey" className="text-xs font-semibold">
                                    8. DATE OF SURVEY
                                </Label>
                                <Input
                                    id="add_date_of_survey"
                                    type="date"
                                    value={formDateOfSurvey}
                                    onChange={(e) => setFormDateOfSurvey(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    9. DLSD DOWNLOADED *
                                </Label>
                                <Select value={formDlsd} onValueChange={setFormDlsd}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dlsdOptions.map((d) => (
                                            <SelectItem key={d} value={d}>
                                                {d}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Save Work Log
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Work Log Modal */}
            <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="size-5 text-emerald-600" />
                            <span>Edit Work Log Entry</span>
                        </DialogTitle>
                        <DialogDescription>
                            Update details for{' '}
                            <strong className="text-foreground">
                                {editingLog?.lot_no || editingLog?.owner || `Work #${editingLog?.id}`}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdate} className="space-y-4 py-2">
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                    <ShieldCheck className="size-3.5" />
                                    Columns 1–4 (Admin Recorded &amp; Editable)
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        1. Scheme / Work Type *
                                    </Label>
                                    <Select
                                        value={formWorkType}
                                        onValueChange={setFormWorkType}
                                        disabled={!isAdmin}
                                    >
                                        <SelectTrigger className="h-9 text-xs bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {workTypes.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_lot_no" className="text-xs font-semibold">
                                        2. LOT No.
                                    </Label>
                                    <Input
                                        id="edit_lot_no"
                                        value={formLotNo}
                                        onChange={(e) => setFormLotNo(e.target.value)}
                                        placeholder="e.g. Lot 1024-B"
                                        disabled={!isAdmin}
                                        className="h-9 text-xs bg-background"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_location" className="text-xs font-semibold">
                                        3. LOCATION
                                    </Label>
                                    <Input
                                        id="edit_location"
                                        value={formLocation}
                                        onChange={(e) => setFormLocation(e.target.value)}
                                        placeholder="e.g. Brgy. San Jose, Tagaytay"
                                        disabled={!isAdmin}
                                        className="h-9 text-xs bg-background"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_owner" className="text-xs font-semibold">
                                        4. Owner
                                    </Label>
                                    <Input
                                        id="edit_owner"
                                        value={formOwner}
                                        onChange={(e) => setFormOwner(e.target.value)}
                                        placeholder="e.g. Juan Dela Cruz"
                                        disabled={!isAdmin}
                                        className="h-9 text-xs bg-background"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    5. Progress / Status *
                                </Label>
                                <Select value={formProgress} onValueChange={setFormProgress}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {progressStatuses.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_plan_completed" className="text-xs font-semibold">
                                    6. Plan Completed (Date)
                                </Label>
                                <Input
                                    id="edit_plan_completed"
                                    type="date"
                                    value={formPlanCompleted}
                                    onChange={(e) => setFormPlanCompleted(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">7. SURVEY *</Label>
                                <Select value={formSurveyType} onValueChange={setFormSurveyType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {surveyTypes.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_date_of_survey" className="text-xs font-semibold">
                                    8. DATE OF SURVEY
                                </Label>
                                <Input
                                    id="edit_date_of_survey"
                                    type="date"
                                    value={formDateOfSurvey}
                                    onChange={(e) => setFormDateOfSurvey(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    9. DLSD DOWNLOADED *
                                </Label>
                                <Select value={formDlsd} onValueChange={setFormDlsd}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dlsdOptions.map((d) => (
                                            <SelectItem key={d} value={d}>
                                                {d}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingLog(null)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingLog} onOpenChange={(open) => !open && setDeletingLog(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Trash2 className="size-5" />
                            <span>Delete Work Log Entry</span>
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the work log entry for{' '}
                            <strong className="text-foreground">
                                {deletingLog?.lot_no || deletingLog?.owner || deletingLog?.work_type}
                            </strong>
                            ? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeletingLog(null)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                        >
                            Delete Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
