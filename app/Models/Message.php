<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'sender_id',
        'recipient_id',
        'is_broadcast',
        'body',
        'attached_file_id',
        'attached_folder_id',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'is_broadcast' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function attachedFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'attached_file_id');
    }

    public function attachedFolder(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'attached_folder_id');
    }
}
