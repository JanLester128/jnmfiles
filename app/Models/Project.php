<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUSES = ['planning', 'field_work', 'processing', 'review', 'on_hold', 'completed', 'archived'];

    protected $fillable = [
        'code',
        'name',
        'client_name',
        'location',
        'survey_type',
        'status',
        'archived_at',
        'description',
        'coordinate_system',
        'datum',
        'benchmark_ref',
        'start_date',
        'target_date',
        'is_confidential',
        'manager_id',
        'created_by',
        'root_folder_id',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'target_date' => 'date',
            'archived_at' => 'datetime',
            'is_confidential' => 'boolean',
        ];
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function rootFolder(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'root_folder_id');
    }

    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function accessPermissions(): MorphMany
    {
        return $this->morphMany(AccessPermission::class, 'permissionable');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function isArchived(): bool
    {
        return $this->status === 'archived';
    }

    /**
     * Whether the user leads this project (assigned manager or creator).
     */
    public function isLedBy(User $user): bool
    {
        return $this->manager_id === $user->id || $this->created_by === $user->id;
    }
}
