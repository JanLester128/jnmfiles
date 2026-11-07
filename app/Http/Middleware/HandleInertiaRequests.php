<?php

namespace App\Http\Middleware;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $unreadMessagesCount = 0;
        $chatContacts = [];

        if ($user) {
            if (Schema::hasTable('users')) {
                $chatContacts = User::where('id', '!=', $user->id)
                    ->where(function ($query) {
                        $query->where('is_active', true)->orWhereNull('is_active');
                    })
                    ->orderByDesc('role')
                    ->orderBy('name')
                    ->get(['id', 'name', 'email', 'role', 'department', 'title', 'avatar'])
                    ->map(fn (User $contact) => [
                        'id' => $contact->id,
                        'name' => $contact->name,
                        'email' => $contact->email,
                        'role' => $contact->role,
                        'department' => $contact->department,
                        'title' => $contact->title,
                        'avatar' => $contact->avatar,
                        'unread_count' => 0,
                        'last_message' => null,
                    ])
                    ->values()
                    ->all();
            }

            if (Schema::hasTable('messages')) {
                $directUnread = Message::where('recipient_id', $user->id)
                    ->where('is_broadcast', false)
                    ->whereNull('read_at')
                    ->count();

                $broadcastUnreadQuery = Message::where('is_broadcast', true)
                    ->where('sender_id', '!=', $user->id);

                if ($user->last_seen_broadcast_at) {
                    $broadcastUnreadQuery->where('created_at', '>', $user->last_seen_broadcast_at);
                }

                $unreadMessagesCount = $directUnread + $broadcastUnreadQuery->count();
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'isAdmin' => $user ? $user->isAdmin() : false,
                'unreadMessagesCount' => $unreadMessagesCount,
                'chatContacts' => $chatContacts,
            ],
            'appearance' => $user ? ($user->appearance ?? 'light') : 'light',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
