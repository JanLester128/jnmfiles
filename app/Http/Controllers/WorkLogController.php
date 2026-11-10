<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\WorkLog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WorkLogController extends Controller
{
    /**
     * Ensure the work_logs table and print columns exist in the database.
     */
    protected function ensureTableExists(): void
    {
        if (! Schema::hasTable('work_logs')) {
            Schema::create('work_logs', function (Blueprint $table) {
                $table->id();
                $table->string('work_type')->default('SCHEME')->index();
                $table->string('lot_no')->nullable();
                $table->string('location')->nullable();
                $table->string('owner')->nullable();
                $table->string('progress_status')->default('pending')->index();
                $table->date('plan_completed')->nullable();
                $table->string('survey_type')->default('RELOCATION')->index();
                $table->date('date_of_survey')->nullable();
                $table->string('dlsd_downloaded', 10)->default('No');
                $table->string('print_status', 30)->nullable()->index();
                $table->date('date_printed')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });

            return;
        }

        if (! Schema::hasColumn('work_logs', 'print_status')) {
            Schema::table('work_logs', function (Blueprint $table) {
                $table->string('print_status', 30)->nullable()->index()->after('dlsd_downloaded');
                $table->date('date_printed')->nullable()->after('print_status');
            });
        }
    }

    /**
     * Format a WorkLog model for Inertia responses.
     *
     * @return array<string, mixed>
     */
    protected function formatLog(WorkLog $log): array
    {
        return [
            'id' => $log->id,
            'work_type' => $log->work_type,
            'lot_no' => $log->lot_no ?? '',
            'location' => $log->location ?? '',
            'owner' => $log->owner ?? '',
            'progress_status' => $log->progress_status,
            'plan_completed' => $log->plan_completed?->format('Y-m-d') ?? '',
            'survey_type' => $log->survey_type,
            'date_of_survey' => $log->date_of_survey?->format('Y-m-d') ?? '',
            'dlsd_downloaded' => $log->dlsd_downloaded,
            'print_status' => $log->print_status,
            'date_printed' => $log->date_printed?->format('Y-m-d') ?? '',
            'creator' => $log->creator ? ['id' => $log->creator->id, 'name' => $log->creator->name] : null,
            'updater' => $log->updater ? ['id' => $log->updater->id, 'name' => $log->updater->name] : null,
            'created_at' => $log->created_at?->toISOString(),
            'updated_at' => $log->updated_at?->toISOString(),
        ];
    }

    /**
     * Display the company Work Logs page.
     */
    public function index(): Response
    {
        $this->ensureTableExists();

        $workLogs = WorkLog::with(['creator:id,name', 'updater:id,name'])
            ->latest()
            ->get()
            ->map(fn (WorkLog $log): array => $this->formatLog($log));

        return Inertia::render('work-logs/index', [
            'workLogs' => $workLogs,
            'options' => [
                'workTypes' => WorkLog::WORK_TYPES,
                'progressStatuses' => WorkLog::PROGRESS_STATUSES,
                'surveyTypes' => WorkLog::SURVEY_TYPES,
                'dlsdOptions' => WorkLog::DLSD_OPTIONS,
                'printStatuses' => WorkLog::PRINT_STATUSES,
            ],
        ]);
    }

    /**
     * Display the TO PRINT or PRINTED page.
     */
    public function printQueue(): Response
    {
        $this->ensureTableExists();

        $printLogs = WorkLog::with(['creator:id,name', 'updater:id,name'])
            ->whereNotNull('print_status')
            ->orderByRaw("CASE WHEN print_status = 'TO PRINT' THEN 0 ELSE 1 END")
            ->latest('updated_at')
            ->get()
            ->map(fn (WorkLog $log): array => $this->formatLog($log));

        return Inertia::render('work-logs/print-queue', [
            'printLogs' => $printLogs,
            'options' => [
                'printStatuses' => WorkLog::PRINT_STATUSES,
            ],
        ]);
    }

    /**
     * Record a work log item into the TO PRINT or PRINTED list when the check action is clicked.
     */
    public function sendToPrint(Request $request, WorkLog $workLog): RedirectResponse
    {
        $this->ensureTableExists();

        $workLog->update([
            'print_status' => $workLog->print_status ?: 'TO PRINT',
            'updated_by' => $request->user()?->id,
        ]);

        Activity::log(
            action: 'sent_work_log_to_print',
            subjectName: $workLog->lot_no ?: ($workLog->owner ?: $workLog->work_type),
            subjectType: 'WorkLog',
            subjectId: $workLog->id,
            details: ['print_status' => $workLog->print_status]
        );

        return back()->with('success', 'Recorded in TO PRINT / PRINTED list.');
    }

    /**
     * Remove a work log item from the TO PRINT / PRINTED list without deleting the work log itself.
     */
    public function removeFromPrintQueue(Request $request, WorkLog $workLog): RedirectResponse
    {
        $this->ensureTableExists();

        $workLog->update([
            'print_status' => null,
            'date_printed' => null,
            'updated_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Removed from TO PRINT / PRINTED list.');
    }

    /**
     * Create a new work log entry (Admin inputs Scheme/Type, Lot No., Location, Owner, etc.).
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can create new work log entries.');

        $this->ensureTableExists();

        $validated = $request->validate([
            'work_type' => ['required', 'string', Rule::in(WorkLog::WORK_TYPES)],
            'lot_no' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'owner' => ['nullable', 'string', 'max:255'],
            'progress_status' => ['required', 'string', Rule::in(WorkLog::PROGRESS_STATUSES)],
            'plan_completed' => ['nullable', 'date'],
            'survey_type' => ['required', 'string', Rule::in(WorkLog::SURVEY_TYPES)],
            'date_of_survey' => ['nullable', 'date'],
            'dlsd_downloaded' => ['required', 'string', Rule::in(WorkLog::DLSD_OPTIONS)],
        ]);

        $userId = $request->user()?->id;

        $workLog = WorkLog::create([
            ...$validated,
            'plan_completed' => ! empty($validated['plan_completed']) ? $validated['plan_completed'] : null,
            'date_of_survey' => ! empty($validated['date_of_survey']) ? $validated['date_of_survey'] : null,
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);

        Activity::log(
            action: 'created_work_log',
            subjectName: $workLog->lot_no ?: ($workLog->owner ?: $workLog->work_type),
            subjectType: 'WorkLog',
            subjectId: $workLog->id,
            details: [
                'work_type' => $workLog->work_type,
                'progress_status' => $workLog->progress_status,
                'survey_type' => $workLog->survey_type,
            ]
        );

        return back()->with('success', 'Work log entry added.');
    }

    /**
     * Update an existing work log entry (supports full form or inline column update).
     * Columns 1-4 (work_type, lot_no, location, owner) remain editable by Admin even after recording.
     */
    public function update(Request $request, WorkLog $workLog): RedirectResponse
    {
        $this->ensureTableExists();

        $isAdmin = (bool) $request->user()?->isAdmin();

        if (! $isAdmin && $request->hasAny(['work_type', 'lot_no', 'location', 'owner'])) {
            abort(403, 'Only administrators can modify Scheme/Type, Lot No., Location, or Owner.');
        }

        $validated = $request->validate([
            'work_type' => ['sometimes', 'required', 'string', Rule::in(WorkLog::WORK_TYPES)],
            'lot_no' => ['sometimes', 'nullable', 'string', 'max:255'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'owner' => ['sometimes', 'nullable', 'string', 'max:255'],
            'progress_status' => ['sometimes', 'required', 'string', Rule::in(WorkLog::PROGRESS_STATUSES)],
            'plan_completed' => ['sometimes', 'nullable', 'date'],
            'survey_type' => ['sometimes', 'required', 'string', Rule::in(WorkLog::SURVEY_TYPES)],
            'date_of_survey' => ['sometimes', 'nullable', 'date'],
            'dlsd_downloaded' => ['sometimes', 'required', 'string', Rule::in(WorkLog::DLSD_OPTIONS)],
            'print_status' => ['sometimes', 'nullable', 'string', Rule::in(WorkLog::PRINT_STATUSES)],
            'date_printed' => ['sometimes', 'nullable', 'date'],
        ]);

        foreach (['plan_completed', 'date_of_survey', 'date_printed'] as $dateField) {
            if (array_key_exists($dateField, $validated) && empty($validated[$dateField])) {
                $validated[$dateField] = null;
            }
        }

        $workLog->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        Activity::log(
            action: 'updated_work_log',
            subjectName: $workLog->lot_no ?: ($workLog->owner ?: $workLog->work_type),
            subjectType: 'WorkLog',
            subjectId: $workLog->id,
            details: $validated
        );

        return back()->with('success', 'Work log entry updated.');
    }

    /**
     * Remove a work log entry (Admin only).
     */
    public function destroy(Request $request, WorkLog $workLog): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can delete work log entries.');

        $this->ensureTableExists();

        $label = $workLog->lot_no ?: ($workLog->owner ?: $workLog->work_type);
        $workLog->delete();

        Activity::log(
            action: 'deleted_work_log',
            subjectName: $label,
            subjectType: 'WorkLog'
        );

        return back()->with('success', 'Work log entry removed.');
    }
}
