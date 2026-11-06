<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A personal favorite (starred item) belonging to a single user.
 */
class Favorite extends Model
{
    protected $fillable = [
        'user_id',
        'favoritable_type',
        'favoritable_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function favoritable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Toggle a favorite for the user. Returns true when the item is now starred.
     */
    public static function toggleFor(User $user, Model $item): bool
    {
        $attributes = [
            'user_id' => $user->id,
            'favoritable_type' => $item::class,
            'favoritable_id' => $item->getKey(),
        ];

        $existing = self::where($attributes)->first();

        if ($existing) {
            $existing->delete();

            return false;
        }

        self::create($attributes);

        return true;
    }
}
