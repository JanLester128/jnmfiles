<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Folder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'parent_id',
        'name',
        'description',
        'color',
        'category',
        'is_system',
        'is_locked',
        'lock_reason',
        'locked_by',
        'access_count',
        'is_starred',
        'is_trashed',
        'trashed_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_locked' => 'boolean',
            'access_count' => 'integer',
            'is_starred' => 'boolean',
            'is_trashed' => 'boolean',
            'trashed_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function locker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function shares(): MorphMany
    {
        return $this->morphMany(FileShare::class, 'shareable');
    }

    public function accessPermissions(): MorphMany
    {
        return $this->morphMany(AccessPermission::class, 'permissionable');
    }

    public function favorites(): MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }

    protected static function booted(): void
    {
        static::forceDeleted(function (Folder $folder): void {
            $folder->accessPermissions()->delete();
            $folder->favorites()->delete();
            $folder->shares()->delete();
        });
    }

    /**
     * IDs of every folder nested below this one (any depth, including trashed ones).
     *
     * @return array<int, int>
     */
    public function descendantIds(): array
    {
        $descendants = [];
        $frontier = [$this->id];

        while ($frontier !== []) {
            $children = Folder::withTrashed()->whereIn('parent_id', $frontier)->pluck('id')->all();
            $children = array_values(array_diff($children, $descendants));
            $descendants = array_merge($descendants, $children);
            $frontier = $children;
        }

        return $descendants;
    }

    /**
     * Whether the given folder ID is this folder or one of its descendants.
     */
    public function containsFolder(int $folderId): bool
    {
        return $folderId === $this->id || in_array($folderId, $this->descendantIds(), true);
    }

    /**
     * Check if this folder (or any of its parent folders) is locked for the given user.
     * Administrators can access all folders; employees cannot access locked folders.
     */
    public function isLockedFor(?User $user): bool
    {
        if ($user && $user->isAdmin()) {
            return false;
        }

        $current = $this;
        $visited = [];

        while ($current !== null && ! isset($visited[$current->id])) {
            $visited[$current->id] = true;
            if ($current->is_locked) {
                return true;
            }
            $current = $current->parent;
        }

        return false;
    }

    /**
     * Return IDs of all locked folders and all their nested descendant folders.
     *
     * @return array<int, int>
     */
    public static function allLockedFolderIds(): array
    {
        $lockedRoots = self::withTrashed()->where('is_locked', true)->get();
        $ids = [];

        foreach ($lockedRoots as $folder) {
            $ids[] = $folder->id;
            $ids = array_merge($ids, $folder->descendantIds());
        }

        return array_values(array_unique($ids));
    }

    /**
     * Get ancestry breadcrumbs for navigation.
     *
     * @return array<int, array{id: int, name: string, project_id: int|null}>
     */
    public function getBreadcrumbs(): array
    {
        $trail = [];
        $current = $this;

        while ($current !== null) {
            array_unshift($trail, [
                'id' => $current->id,
                'name' => $current->name,
                'project_id' => $current->project_id,
            ]);
            $current = $current->parent;
        }

        return $trail;
    }
}
