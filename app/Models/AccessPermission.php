<?php

namespace App\Models;

use App\Ability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * An explicit permission grant for a user on a file, folder or project.
 *
 * @property int $id
 * @property string $permissionable_type
 * @property int $permissionable_id
 * @property int $user_id
 * @property bool $can_view
 * @property bool $can_upload
 * @property bool $can_edit
 * @property bool $can_delete
 * @property bool $can_download
 * @property bool $can_share
 * @property int|null $granted_by
 */
class AccessPermission extends Model
{
    protected $fillable = [
        'permissionable_type',
        'permissionable_id',
        'user_id',
        'can_view',
        'can_upload',
        'can_edit',
        'can_delete',
        'can_download',
        'can_share',
        'granted_by',
    ];

    protected function casts(): array
    {
        return [
            'can_view' => 'boolean',
            'can_upload' => 'boolean',
            'can_edit' => 'boolean',
            'can_delete' => 'boolean',
            'can_download' => 'boolean',
            'can_share' => 'boolean',
        ];
    }

    public function permissionable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function granter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }

    /**
     * The grant as an ability => bool permission set. A grant always includes view access.
     *
     * @return array<string, bool>
     */
    public function toPermissionSet(): array
    {
        $permissions = [];

        foreach (Ability::cases() as $ability) {
            $permissions[$ability->value] = (bool) $this->{$ability->column()};
        }

        $permissions[Ability::View->value] = true;

        return $permissions;
    }

    /**
     * Convert an ability => bool permission set into column attributes.
     *
     * @param  array<string, bool>  $permissions
     * @return array<string, bool>
     */
    public static function columnsFromPermissionSet(array $permissions): array
    {
        $columns = [];

        foreach (Ability::cases() as $ability) {
            $columns[$ability->column()] = (bool) ($permissions[$ability->value] ?? false);
        }

        $columns[Ability::View->column()] = true;

        return $columns;
    }

    /**
     * Preset permission sets used by the sharing dialog.
     *
     * @return array<string, bool>
     */
    public static function preset(string $level): array
    {
        return match ($level) {
            'editor' => Ability::set(Ability::View, Ability::Download, Ability::Upload, Ability::Edit),
            'read_only' => Ability::set(Ability::View),
            default => Ability::set(Ability::View, Ability::Download),
        };
    }
}
