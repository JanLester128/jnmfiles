<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class File extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'folder_id',
        'project_id',
        'name',
        'original_filename',
        'file_path',
        'disk',
        'mime_type',
        'extension',
        'size_bytes',
        'access_count',
        'last_accessed_at',
        'current_version',
        'category',
        'is_starred',
        'is_trashed',
        'trashed_at',
        'is_locked',
        'locked_by',
        'locked_at',
        'lock_note',
        'description',
        'metadata',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'access_count' => 'integer',
            'last_accessed_at' => 'datetime',
            'current_version' => 'integer',
            'is_starred' => 'boolean',
            'is_trashed' => 'boolean',
            'trashed_at' => 'datetime',
            'is_locked' => 'boolean',
            'locked_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(FileVersion::class)->orderByDesc('version_number');
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

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'file_tag');
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

    /**
     * Determine whether this file (or its parent folder) is locked for the given user.
     * Administrators always have full access.
     */
    public function isLockedFor(?User $user): bool
    {
        if ($user && $user->isAdmin()) {
            return false;
        }

        if ($this->is_locked) {
            return true;
        }

        return $this->folder ? $this->folder->isLockedFor($user) : false;
    }

    protected static function booted(): void
    {
        static::forceDeleted(function (File $file): void {
            $file->accessPermissions()->delete();
            $file->favorites()->delete();
            $file->shares()->delete();
        });
    }

    /**
     * Map file extension to Land Surveying / Engineering category.
     */
    public static function detectCategory(string $extension): string
    {
        $ext = strtolower(trim($extension));

        $map = [
            // DLSD & XML Land Survey Files
            'dlsd' => 'dlsd',
            'xml' => 'xml',

            // AutoCAD & Design Files
            'dwg' => 'cad',
            'dxf' => 'cad',
            'dwt' => 'cad',
            'dwf' => 'cad',
            'dgn' => 'cad',
            'rvt' => 'cad',
            'ifc' => 'cad',
            'step' => 'cad',
            'stp' => 'cad',

            // GIS and Surveying Files
            'shp' => 'gis',
            'shx' => 'gis',
            'dbf' => 'gis',
            'prj' => 'gis',
            'kml' => 'gis',
            'kmz' => 'gis',
            'geojson' => 'gis',
            'gpkg' => 'gis',
            'dem' => 'gis',

            // LiDAR & Point Cloud
            'las' => 'lidar',
            'laz' => 'lidar',
            'e57' => 'lidar',
            'pts' => 'lidar',
            'xyz' => 'lidar',

            // Survey Raw Data & Coordinates
            'raw' => 'raw_survey',
            'rw5' => 'raw_survey',
            'crd' => 'raw_survey',
            'dat' => 'raw_survey',
            'jxl' => 'raw_survey',
            'rinex' => 'raw_survey',
            'obs' => 'raw_survey',
            'nav' => 'raw_survey',
            'csv' => 'raw_survey',
            'txt' => 'raw_survey',
            'asc' => 'raw_survey',

            // Documents
            'pdf' => 'document',
            'doc' => 'document',
            'docx' => 'document',
            'ppt' => 'document',
            'pptx' => 'document',
            'rtf' => 'document',

            // Spreadsheets
            'xls' => 'spreadsheet',
            'xlsx' => 'spreadsheet',

            // Images
            'jpg' => 'photo',
            'jpeg' => 'photo',
            'png' => 'photo',
            'tif' => 'photo',
            'tiff' => 'photo',
            'bmp' => 'photo',
            'webp' => 'photo',

            // Archives
            'zip' => 'archive',
            'rar' => 'archive',
            '7z' => 'archive',
            'tar' => 'archive',
            'gz' => 'archive',
        ];

        return $map[$ext] ?? 'other';
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = (float) $this->size_bytes;
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2).' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2).' KB';
        }

        return $bytes.' B';
    }
}
