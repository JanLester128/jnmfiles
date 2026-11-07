<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\Folder;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class MessageController extends Controller
{
    /**
     * Return contacts list, unread counts, broadcast channel status, and messages for the active thread.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdmin();
        $contactId = $request->query('contact_id');
        $channel = $request->query('channel'); // 'broadcast' or null

        $lockedFolderIds = $isAdmin ? [] : Folder::allLockedFolderIds();

        // Mark messages as read if viewing a specific contact or broadcast channel
        if ($channel === 'broadcast') {
            $user->forceFill(['last_seen_broadcast_at' => now()])->saveQuietly();
        } elseif ($contactId && is_numeric($contactId)) {
            Message::where('sender_id', (int) $contactId)
                ->where('recipient_id', $user->id)
                ->where('is_broadcast', false)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        // Load all active users (plus any inactive ones with message history)
        $contacts = User::where('id', '!=', $user->id)
            ->where('is_active', true)
            ->orderByDesc('role')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'department', 'title', 'avatar']);

        // Unread counts per sender for the current user
        $unreadBySender = Message::where('recipient_id', $user->id)
            ->where('is_broadcast', false)
            ->whereNull('read_at')
            ->selectRaw('sender_id, count(*) as unread_count')
            ->groupBy('sender_id')
            ->pluck('unread_count', 'sender_id');

        // Latest message per conversation with current user
        $directMessages = Message::where('is_broadcast', false)
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                    ->orWhere('recipient_id', $user->id);
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $latestByPartner = [];
        foreach ($directMessages as $msg) {
            $partnerId = $msg->sender_id === $user->id ? $msg->recipient_id : $msg->sender_id;
            if ($partnerId && ! isset($latestByPartner[$partnerId])) {
                $latestByPartner[$partnerId] = $msg;
            }
        }

        $contactsData = $contacts->map(function (User $contact) use ($unreadBySender, $latestByPartner) {
            /** @var Message|null $lastMsg */
            $lastMsg = $latestByPartner[$contact->id] ?? null;

            return [
                'id' => $contact->id,
                'name' => $contact->name,
                'email' => $contact->email,
                'role' => $contact->role,
                'department' => $contact->department,
                'title' => $contact->title,
                'avatar' => $contact->avatar,
                'unread_count' => (int) ($unreadBySender[$contact->id] ?? 0),
                'last_message' => $lastMsg ? [
                    'id' => $lastMsg->id,
                    'body' => $lastMsg->body ?: ($lastMsg->attached_file_id ? '📎 Attached a file' : '📁 Attached a folder'),
                    'sender_id' => $lastMsg->sender_id,
                    'created_at' => $lastMsg->created_at?->toISOString(),
                ] : null,
            ];
        })->sortByDesc(function (array $c) {
            return [
                $c['unread_count'] > 0 ? 1 : 0,
                $c['last_message']['created_at'] ?? '',
                $c['role'] === 'admin' ? 1 : 0,
            ];
        })->values();

        // Broadcast unread count
        $broadcastUnreadQuery = Message::where('is_broadcast', true)
            ->where('sender_id', '!=', $user->id);

        if ($user->last_seen_broadcast_at) {
            $broadcastUnreadQuery->where('created_at', '>', $user->last_seen_broadcast_at);
        }

        $broadcastUnreadCount = (int) $broadcastUnreadQuery->count();
        $lastBroadcast = Message::with('sender:id,name,role')
            ->where('is_broadcast', true)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        $totalDirectUnread = (int) $unreadBySender->sum();
        $totalUnread = $totalDirectUnread + $broadcastUnreadCount;

        // Fetch thread messages if a thread is selected
        $messages = [];
        if ($channel === 'broadcast') {
            $rawMessages = Message::with([
                'sender:id,name,email,role,title,avatar',
                'attachedFile:id,name,original_filename,extension,size_bytes,category,folder_id,is_trashed,is_locked',
                'attachedFolder:id,name,color,project_id,is_trashed,is_locked',
            ])
                ->where('is_broadcast', true)
                ->orderBy('created_at')
                ->orderBy('id')
                ->limit(150)
                ->get();

            $messages = $this->formatMessages($rawMessages, $lockedFolderIds, $isAdmin);
        } elseif ($contactId && is_numeric($contactId)) {
            $partnerId = (int) $contactId;
            $rawMessages = Message::with([
                'sender:id,name,email,role,title,avatar',
                'attachedFile:id,name,original_filename,extension,size_bytes,category,folder_id,is_trashed,is_locked',
                'attachedFolder:id,name,color,project_id,is_trashed,is_locked',
            ])
                ->where('is_broadcast', false)
                ->where(function ($query) use ($user, $partnerId) {
                    $query->where(function ($q) use ($user, $partnerId) {
                        $q->where('sender_id', $user->id)->where('recipient_id', $partnerId);
                    })->orWhere(function ($q) use ($user, $partnerId) {
                        $q->where('sender_id', $partnerId)->where('recipient_id', $user->id);
                    });
                })
                ->orderBy('created_at')
                ->orderBy('id')
                ->limit(150)
                ->get();

            $messages = $this->formatMessages($rawMessages, $lockedFolderIds, $isAdmin);
        }

        return response()->json([
            'contacts' => $contactsData,
            'broadcast' => [
                'unread_count' => $broadcastUnreadCount,
                'last_message' => $lastBroadcast ? [
                    'id' => $lastBroadcast->id,
                    'body' => $lastBroadcast->body ?: ($lastBroadcast->attached_file_id ? '📎 Attached a file' : '📁 Attached a folder'),
                    'sender_name' => $lastBroadcast->sender?->name ?? 'Administrator',
                    'created_at' => $lastBroadcast->created_at?->toISOString(),
                ] : null,
            ],
            'total_unread' => $totalUnread,
            'messages' => $messages,
        ]);
    }

    /**
     * Send a new direct message or admin broadcast announcement.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdmin();

        $validated = $request->validate([
            'recipient_id' => ['nullable', 'integer', 'exists:users,id'],
            'is_broadcast' => ['sometimes', 'boolean'],
            'body' => ['nullable', 'string', 'max:5000'],
            'attached_file_id' => ['nullable', 'integer', 'exists:files,id'],
            'attached_folder_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        $isBroadcast = (bool) ($validated['is_broadcast'] ?? false);

        if ($isBroadcast && ! $isAdmin) {
            abort(403, 'Only administrators can post broadcast announcements.');
        }

        if (! $isBroadcast && empty($validated['recipient_id'])) {
            return response()->json([
                'message' => 'Please select a recipient for your message.',
            ], 422);
        }

        $body = isset($validated['body']) ? trim($validated['body']) : '';
        $attachedFileId = $validated['attached_file_id'] ?? null;
        $attachedFolderId = $validated['attached_folder_id'] ?? null;

        if ($body === '' && ! $attachedFileId && ! $attachedFolderId) {
            return response()->json([
                'message' => 'Please enter a message or attach a Drive file or folder.',
            ], 422);
        }

        $lockedFolderIds = $isAdmin ? [] : Folder::allLockedFolderIds();

        // Verify employee is not attaching a locked file or folder
        if (! $isAdmin) {
            if ($attachedFolderId && in_array((int) $attachedFolderId, $lockedFolderIds, true)) {
                abort(403, 'You cannot attach a locked folder.');
            }

            if ($attachedFileId) {
                $file = File::find($attachedFileId);
                if (! $file || ($file->folder_id && in_array((int) $file->folder_id, $lockedFolderIds, true))) {
                    abort(403, 'You cannot attach a file from a locked folder.');
                }
            }
        }

        $message = Message::create([
            'sender_id' => $user->id,
            'recipient_id' => $isBroadcast ? null : (int) $validated['recipient_id'],
            'is_broadcast' => $isBroadcast,
            'body' => $body !== '' ? $body : null,
            'attached_file_id' => $attachedFileId,
            'attached_folder_id' => $attachedFolderId,
        ]);

        if ($isBroadcast) {
            $user->forceFill(['last_seen_broadcast_at' => now()])->saveQuietly();

            Activity::log(
                action: 'sent_broadcast_announcement',
                subjectName: 'All Staff Announcement',
                subjectType: 'Message',
                subjectId: $message->id,
                details: ['preview' => mb_substr($body, 0, 120)]
            );
        }

        $message->load([
            'sender:id,name,email,role,title,avatar',
            'attachedFile:id,name,original_filename,extension,size_bytes,category,folder_id,is_trashed,is_locked',
            'attachedFolder:id,name,color,project_id,is_trashed,is_locked',
        ]);

        $formatted = $this->formatMessages(collect([$message]), $lockedFolderIds, $isAdmin)[0];

        return response()->json([
            'message' => $formatted,
        ], 201);
    }

    /**
     * Mark messages in a conversation or broadcast channel as read.
     */
    public function markRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'contact_id' => ['nullable', 'integer', 'exists:users,id'],
            'channel' => ['nullable', 'string', 'in:broadcast,direct'],
        ]);

        if (($validated['channel'] ?? null) === 'broadcast') {
            $user->forceFill(['last_seen_broadcast_at' => now()])->saveQuietly();
        } elseif (! empty($validated['contact_id'])) {
            Message::where('sender_id', (int) $validated['contact_id'])
                ->where('recipient_id', $user->id)
                ->where('is_broadcast', false)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Search accessible Drive files and folders to attach in chat.
     */
    public function driveItems(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdmin();
        $search = trim((string) $request->query('q', ''));
        $lockedFolderIds = $isAdmin ? [] : Folder::allLockedFolderIds();

        $filesQuery = File::where('is_trashed', false)
            ->orderByDesc('updated_at');

        $foldersQuery = Folder::where('is_trashed', false)
            ->orderBy('name');

        if (! $isAdmin && $lockedFolderIds !== []) {
            $foldersQuery->whereNotIn('id', $lockedFolderIds);
            $filesQuery->where(function ($q) use ($lockedFolderIds) {
                $q->whereNull('folder_id')->orWhereNotIn('folder_id', $lockedFolderIds);
            });
        }

        if ($search !== '') {
            $filesQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('original_filename', 'like', "%{$search}%")
                    ->orWhere('extension', 'like', "%{$search}%");
            });

            $foldersQuery->where('name', 'like', "%{$search}%");
        }

        $files = $filesQuery->limit(15)->get([
            'id',
            'name',
            'original_filename',
            'extension',
            'size_bytes',
            'category',
            'folder_id',
        ]);

        $folders = $foldersQuery->limit(10)->get([
            'id',
            'name',
            'color',
            'project_id',
        ]);

        return response()->json([
            'files' => $files,
            'folders' => $folders,
        ]);
    }

    /**
     * Format messages collection and sanitize locked attachments for non-admins.
     *
     * @param  Collection<int, Message>  $messages
     * @param  array<int, int>  $lockedFolderIds
     * @return array<int, array<string, mixed>>
     */
    private function formatMessages($messages, array $lockedFolderIds, bool $isAdmin): array
    {
        return $messages->map(function (Message $msg) use ($lockedFolderIds, $isAdmin) {
            $fileData = null;
            if ($msg->attachedFile && ! $msg->attachedFile->is_trashed) {
                $isFileInLockedFolder = ! $isAdmin
                    && $msg->attachedFile->folder_id
                    && in_array((int) $msg->attachedFile->folder_id, $lockedFolderIds, true);

                if (! $isFileInLockedFolder) {
                    $fileData = [
                        'id' => $msg->attachedFile->id,
                        'name' => $msg->attachedFile->name,
                        'extension' => $msg->attachedFile->extension,
                        'size_bytes' => $msg->attachedFile->size_bytes,
                        'category' => $msg->attachedFile->category,
                        'folder_id' => $msg->attachedFile->folder_id,
                    ];
                }
            }

            $folderData = null;
            if ($msg->attachedFolder && ! $msg->attachedFolder->is_trashed) {
                $isFolderLocked = ! $isAdmin
                    && in_array((int) $msg->attachedFolder->id, $lockedFolderIds, true);

                if (! $isFolderLocked) {
                    $folderData = [
                        'id' => $msg->attachedFolder->id,
                        'name' => $msg->attachedFolder->name,
                        'color' => $msg->attachedFolder->color,
                        'project_id' => $msg->attachedFolder->project_id,
                    ];
                }
            }

            return [
                'id' => $msg->id,
                'sender_id' => $msg->sender_id,
                'recipient_id' => $msg->recipient_id,
                'is_broadcast' => (bool) $msg->is_broadcast,
                'body' => $msg->body,
                'read_at' => $msg->read_at?->toISOString(),
                'created_at' => $msg->created_at?->toISOString(),
                'sender' => $msg->sender ? [
                    'id' => $msg->sender->id,
                    'name' => $msg->sender->name,
                    'email' => $msg->sender->email,
                    'role' => $msg->sender->role,
                    'title' => $msg->sender->title,
                    'avatar' => $msg->sender->avatar,
                ] : null,
                'attached_file' => $fileData,
                'attached_folder' => $folderData,
            ];
        })->values()->all();
    }
}
