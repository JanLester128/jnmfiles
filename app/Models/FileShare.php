<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class FileShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'shareable_type',
        'shareable_id',
        'user_id',
        'shared_by',
        'permission',
        'share_token',
        'password',
        'expires_at',
        'access_count',
        'last_accessed_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected $appends = [
        'has_password',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_accessed_at' => 'datetime',
            'access_count' => 'integer',
        ];
    }

    public function getHasPasswordAttribute(): bool
    {
        return $this->hasPassword();
    }

    public function shareable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sharer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function hasPassword(): bool
    {
        return ! empty($this->password);
    }
}
