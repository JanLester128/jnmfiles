<?php

namespace App\Models;

use Database\Factories\WorkLogFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkLog extends Model
{
    /** @use HasFactory<WorkLogFactory> */
    use HasFactory;

    public const WORK_TYPES = [
        'SCHEME',
        'SURVEY RETURN',
        'SKETCH',
        'OTHERS',
    ];

    public const PROGRESS_STATUSES = [
        'Complete',
        'In progress',
        'pending',
        'file submitted',
        'survey only',
        'pause',
    ];

    public const SURVEY_TYPES = [
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

    public const DLSD_OPTIONS = [
        'Yes',
        'No',
    ];

    public const PRINT_STATUSES = [
        'TO PRINT',
        'PRINTED',
    ];

    protected $fillable = [
        'work_type',
        'lot_no',
        'location',
        'owner',
        'progress_status',
        'plan_completed',
        'survey_type',
        'date_of_survey',
        'dlsd_downloaded',
        'print_status',
        'date_printed',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'plan_completed' => 'date:Y-m-d',
            'date_of_survey' => 'date:Y-m-d',
            'date_printed' => 'date:Y-m-d',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
