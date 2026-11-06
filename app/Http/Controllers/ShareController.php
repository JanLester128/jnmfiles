<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\FileShare;
use App\Models\Folder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShareController extends Controller
{
    /**
     * Create an internal share or public shareable link.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'shareable_type' => ['required', 'string', 'in:file,folder'],
            'shareable_id' => ['required', 'integer'],
            'share_type' => ['required', 'string', 'in:user,public'],
            'user_id' => ['nullable', 'required_if:share_type,user', 'exists:users,id'],
            'permission' => ['required', 'string', 'in:view,download,edit'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'password' => ['nullable', 'string', 'min:4'],
        ]);

        $modelClass = $validated['shareable_type'] === 'file' ? File::class : Folder::class;
        $item = $modelClass::findOrFail($validated['shareable_id']);

        $token = null;
        if ($validated['share_type'] === 'public') {
            $token = Str::random(32);
        }

        $passwordHash = ! empty($validated['password']) ? Hash::make($validated['password']) : null;

        $share = FileShare::create([
            'shareable_type' => $modelClass,
            'shareable_id' => $item->id,
            'user_id' => $validated['share_type'] === 'user' ? $validated['user_id'] : null,
            'shared_by' => Auth::id(),
            'permission' => $validated['permission'],
            'share_token' => $token,
            'password' => $passwordHash,
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        Activity::log(
            action: 'shared',
            subjectName: $item->name,
            subjectType: $validated['shareable_type'] === 'file' ? 'File' : 'Folder',
            subjectId: $item->id,
            projectId: $item->project_id,
            details: [
                'type' => $validated['share_type'],
                'permission' => $validated['permission'],
                'has_password' => ! empty($passwordHash),
            ]
        );

        return back()->with('success', 'Share link generated successfully.');
    }

    /**
     * Revoke share.
     */
    public function destroy(FileShare $share): RedirectResponse
    {
        $share->delete();

        return back()->with('success', 'Share revoked.');
    }

    /**
     * View all files and folders shared with me.
     */
    public function sharedWithMe(Request $request): Response
    {
        $user = $request->user();

        $sharedFiles = File::whereHas('shares', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
            ->with(['creator:id,name', 'project:id,code,name'])
            ->where('is_trashed', false)
            ->get();

        $sharedFolders = Folder::whereHas('shares', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
            ->with(['creator:id,name', 'project:id,code,name'])
            ->where('is_trashed', false)
            ->get();

        return Inertia::render('share/shared-with-me', [
            'files' => $sharedFiles,
            'folders' => $sharedFolders,
        ]);
    }

    /**
     * Public landing page for shared file/folder.
     */
    public function publicAccess(string $token, Request $request): Response|RedirectResponse
    {
        $share = FileShare::where('share_token', $token)->firstOrFail();

        if ($share->isExpired()) {
            return Inertia::render('share/expired');
        }

        // If password is required and not yet verified in session
        $sessionKey = 'share_auth_'.$token;
        if ($share->hasPassword() && ! $request->session()->get($sessionKey)) {
            if ($request->isMethod('post')) {
                $request->validate(['password' => 'required|string']);
                if (Hash::check($request->input('password'), $share->password)) {
                    $request->session()->put($sessionKey, true);

                    return redirect()->route('share.public', ['token' => $token]);
                }

                return back()->withErrors(['password' => 'Incorrect password.']);
            }

            return Inertia::render('share/password-protect', [
                'token' => $token,
                'shareable_type' => class_basename($share->shareable_type),
            ]);
        }

        // Increment count
        $share->increment('access_count');
        $share->update(['last_accessed_at' => now()]);

        $item = $share->shareable;
        if (! $item) {
            abort(404, 'Item no longer exists.');
        }

        $shareData = [
            'token' => $token,
            'permission' => $share->permission,
            'expires_at' => $share->expires_at?->toIso8601String(),
            'item_type' => class_basename($share->shareable_type),
            'item' => $item,
            'sharer' => $share->sharer?->name ?? 'JNM Files Engineering Team',
        ];

        return Inertia::render('share/public-view', [
            'share' => $shareData,
        ]);
    }

    /**
     * Public download handler.
     */
    public function publicDownload(string $token, Request $request): StreamedResponse
    {
        $share = FileShare::where('share_token', $token)->firstOrFail();

        if ($share->isExpired() || $share->permission === 'view') {
            abort(403, 'Download not permitted or link has expired.');
        }

        $sessionKey = 'share_auth_'.$token;
        if ($share->hasPassword() && ! $request->session()->get($sessionKey)) {
            abort(403, 'Password verification required.');
        }

        $file = $share->shareable;
        if (! ($file instanceof File)) {
            abort(400, 'Direct download only available for files.');
        }

        if (! Storage::disk($file->disk)->exists($file->file_path)) {
            abort(404, 'File not found on storage.');
        }

        Activity::log(
            action: 'downloaded',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id,
            details: ['source' => 'Public Share Link', 'token' => $token]
        );

        return Storage::disk($file->disk)->download($file->file_path, $file->original_filename);
    }
}
