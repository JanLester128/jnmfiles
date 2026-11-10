import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Filter,
    Printer,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { WorkLogItem } from './index';

interface PrintQueuePageProps {
    printLogs: WorkLogItem[];
    options?: {
        printStatuses: string[];
    };
}

const DEFAULT_PRINT_STATUSES = ['TO PRINT', 'PRINTED'];

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

function getPrintStatusBadgeClass(status?: string | null): string {
    if (status === 'PRINTED') {
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    }

    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40';
}

export default function WorkLogsPrintQueue({
    printLogs = [],
    options,
}: PrintQueuePageProps) {
    const printStatuses = options?.printStatuses ?? DEFAULT_PRINT_STATUSES;

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const handlePrintStatusChange = (log: WorkLogItem, nextStatus: string) => {
        router.put(
            `/work-logs/${log.id}`,
            {
                print_status: nextStatus,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success(`Print status updated to ${nextStatus}.`);
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to update print status.');
                },
            }
        );
    };

    const handleDatePrintedChange = (logId: number, nextDate: string) => {
        router.put(
            `/work-logs/${logId}`,
            {
                date_printed: nextDate === '' ? null : nextDate,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Date Printed updated.');
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0] as string;
                    toast.error(first || 'Failed to update Date Printed.');
                },
            }
        );
    };

    const handleRemoveFromQueue = (log: WorkLogItem) => {
        router.delete(`/work-logs/${log.id}/print-queue`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Removed from TO PRINT / PRINTED list.');
            },
            onError: () => {
                toast.error('Failed to remove item from print list.');
            },
        });
    };

    const filteredLogs = printLogs.filter((log) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            (log.lot_no || '').toLowerCase().includes(q) ||
            (log.location || '').toLowerCase().includes(q) ||
            (log.owner || '').toLowerCase().includes(q) ||
            (log.work_type || '').toLowerCase().includes(q) ||
            (log.survey_type || '').toLowerCase().includes(q);

        const matchesStatus =
            filterStatus === 'ALL' || (log.print_status || 'TO PRINT') === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const totalCount = printLogs.length;
    const toPrintCount = printLogs.filter(
        (l) => (l.print_status || 'TO PRINT') === 'TO PRINT'
    ).length;
    const printedCount = printLogs.filter((l) => l.print_status === 'PRINTED').length;

    return (
        <>
            <Head title="TO PRINT or PRINTED - Work Logs" />

            <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1650px] mx-auto w-full">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            <Printer className="size-6 text-emerald-600" />
                            <span>TO PRINT or PRINTED</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Lots checked from Work Logs appear here as <strong>TO PRINT</strong>. Once printed, manually change the dropdown to <strong>PRINTED</strong> and set the <strong>DATE PRINTED</strong>.
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Total in Print List
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</p>
                        </div>
                        <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <Printer className="size-5" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                TO PRINT
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{toPrintCount}</p>
                        </div>
                        <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Clock className="size-5" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                PRINTED
                            </p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{printedCount}</p>
                        </div>
                        <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="size-5" />
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
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
                            <span className="font-medium">Print Status:</span>
                        </div>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 text-xs w-[160px]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All (TO PRINT &amp; PRINTED)</SelectItem>
                                {printStatuses.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(search.trim() !== '' || filterStatus !== 'ALL') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearch('');
                                    setFilterStatus('ALL');
                                }}
                                className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="size-3.5" />
                                <span>Reset</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* TO PRINT / PRINTED Table */}
                <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                            <thead>
                                <tr className="border-b border-border bg-emerald-950/90 text-white font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-3 min-w-[140px] border-r border-emerald-800/40">
                                        SCHEME / TYPE
                                    </th>
                                    <th className="py-3 px-3 min-w-[130px] border-r border-emerald-800/40">
                                        LOT NO.
                                    </th>
                                    <th className="py-3 px-3 min-w-[170px] border-r border-emerald-800/40">
                                        LOCATION
                                    </th>
                                    <th className="py-3 px-3 min-w-[160px] border-r border-emerald-800/40">
                                        OWNER
                                    </th>
                                    <th className="py-3 px-3 min-w-[155px] border-r border-emerald-800/40">
                                        SURVEY
                                    </th>
                                    <th className="py-3 px-3 min-w-[135px] border-r border-emerald-800/40">
                                        PLAN COMPLETED
                                    </th>
                                    <th className="py-3 px-3 min-w-[165px] border-r border-emerald-800/40">
                                        TO PRINT / PRINTED
                                    </th>
                                    <th className="py-3 px-3 min-w-[155px] border-r border-emerald-800/40">
                                        DATE PRINTED
                                    </th>
                                    <th className="py-3 px-3 text-right min-w-[90px]">
                                        REMOVE
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Printer className="size-8 text-muted-foreground/50" />
                                                <p className="text-sm font-medium text-foreground">
                                                    No lots in the TO PRINT / PRINTED list yet
                                                </p>
                                                <p className="text-xs text-muted-foreground max-w-md">
                                                    Click the Check button on any row in the Work Logs page to send a Lot No. here for printing.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const currentStatus = log.print_status || 'TO PRINT';
                                        return (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-muted/40 transition-colors"
                                            >
                                                {/* Scheme / Type */}
                                                <td className="py-2.5 px-3 border-r border-border/60">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-bold ${getWorkTypeBadgeClass(
                                                            log.work_type
                                                        )}`}
                                                    >
                                                        {log.work_type}
                                                    </span>
                                                </td>

                                                {/* Lot No. */}
                                                <td className="py-2.5 px-3 border-r border-border/60 font-bold text-foreground">
                                                    {log.lot_no || (
                                                        <span className="text-muted-foreground/50 italic">—</span>
                                                    )}
                                                </td>

                                                {/* Location */}
                                                <td className="py-2.5 px-3 border-r border-border/60 text-foreground">
                                                    {log.location || (
                                                        <span className="text-muted-foreground/50 italic">—</span>
                                                    )}
                                                </td>

                                                {/* Owner */}
                                                <td className="py-2.5 px-3 border-r border-border/60 font-medium text-foreground">
                                                    {log.owner || (
                                                        <span className="text-muted-foreground/50 italic">—</span>
                                                    )}
                                                </td>

                                                {/* Survey */}
                                                <td className="py-2.5 px-3 border-r border-border/60 font-semibold text-foreground">
                                                    {log.survey_type}
                                                </td>

                                                {/* Plan Completed */}
                                                <td className="py-2.5 px-3 border-r border-border/60 font-mono text-foreground">
                                                    {log.plan_completed || (
                                                        <span className="text-muted-foreground/50 italic">—</span>
                                                    )}
                                                </td>

                                                {/* TO PRINT / PRINTED Dropdown */}
                                                <td className="py-2.5 px-3 border-r border-border/60">
                                                    <select
                                                        aria-label={`Print status for ${log.lot_no || log.id}`}
                                                        value={currentStatus}
                                                        onChange={(e) =>
                                                            handlePrintStatusChange(log, e.target.value)
                                                        }
                                                        className={`w-full h-8 rounded-md border px-2.5 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getPrintStatusBadgeClass(
                                                            currentStatus
                                                        )}`}
                                                    >
                                                        {printStatuses.map((status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                                className="bg-background text-foreground font-semibold"
                                                            >
                                                                {status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* DATE PRINTED */}
                                                <td className="py-2.5 px-3 border-r border-border/60 font-mono">
                                                    <input
                                                        type="date"
                                                        aria-label={`Date printed for ${log.lot_no || log.id}`}
                                                        value={log.date_printed || ''}
                                                        onChange={(e) =>
                                                            handleDatePrintedChange(
                                                                log.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full h-8 rounded-md border border-border/60 hover:border-border focus:border-emerald-500 bg-background/60 focus:bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                    />
                                                </td>

                                                {/* Remove from Print List */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveFromQueue(log)}
                                                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                        title="Remove from Print List"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                            Showing <strong className="text-foreground">{filteredLogs.length}</strong> of{' '}
                            <strong className="text-foreground">{totalCount}</strong> print queue entries
                        </span>
                        <span>
                            Tip: Change the dropdown from <strong>TO PRINT</strong> to <strong>PRINTED</strong> and select the <strong>DATE PRINTED</strong> when printing is complete.
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

