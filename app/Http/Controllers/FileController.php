<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\FileVersion;
use App\Models\Folder;
use App\Models\Tag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    /**
     * Upload single or multiple files into current folder / project.
     * Preserves original CAD and surveying files without corruption or lossy compression.
     */
    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'files' => ['required', 'array'],
            'files.*' => ['file', 'max:512000'], // 500 MB max per file
            'folder_id' => ['nullable', 'exists:folders,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'coordinate_system' => ['nullable', 'string', 'max:150'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ]);

        $user = $request->user();
        $folderId = $request->input('folder_id');
        $projectId = $request->input('project_id');

        if ($folderId) {
            $folder = Folder::find($folderId);
            if ($folder && $folder->isLockedFor($user)) {
                return back()->with('error', 'Access Denied: Cannot upload files into a folder locked by the Administrator.');
            }
            if (! $projectId) {
                $projectId = $folder?->project_id;
            }
        }

        $uploadedCount = 0;
        $totalBytes = 0;

        foreach ($request->file('files') as $uploadedFile) {
            $originalName = $uploadedFile->getClientOriginalName();
            $extension = strtolower($uploadedFile->getClientOriginalExtension());
            $mimeType = $uploadedFile->getClientMimeType() ?: 'application/octet-stream';
            $size = $uploadedFile->getSize();

            $category = File::detectCategory($extension);
            $disk = 'local'; // private storage

            // Handle duplicate display names in the same folder
            $displayName = $originalName;
            $counter = 1;
            $nameWithoutExt = pathinfo($originalName, PATHINFO_FILENAME);

            while (File::where('folder_id', $folderId)->where('name', $displayName)->where('is_trashed', false)->exists()) {
                $displayName = "{$nameWithoutExt} ({$counter}).{$extension}";
                $counter++;
            }

            // Generate unique storage path on private disk to prevent binary overwrites
            $subDir = 'files/'.($projectId ? 'PRJ-'.$projectId : 'general').'/'.date('Y/m');
            $uniqueDiskName = Str::random(20).'_'.preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $originalName);
            $storedPath = $uploadedFile->storeAs($subDir, $uniqueDiskName, $disk);

            $fileHash = hash_file('sha256', $uploadedFile->getRealPath());

            $metadata = [];
            if ($request->filled('coordinate_system')) {
                $metadata['coordinate_system'] = $request->input('coordinate_system');
            }

            // Create File Record
            $file = File::create([
                'folder_id' => $folderId,
                'project_id' => $projectId,
                'name' => $displayName,
                'original_filename' => $originalName,
                'file_path' => $storedPath,
                'disk' => $disk,
                'mime_type' => $mimeType,
                'extension' => $extension,
                'size_bytes' => $size,
                'access_count' => 0,
                'current_version' => 1,
                'category' => $category,
                'is_starred' => false,
                'description' => $request->input('description'),
                'metadata' => $metadata,
                'created_by' => $user?->id ?? 1,
                'updated_by' => $user?->id ?? 1,
            ]);

            // Create Version 1
            FileVersion::create([
                'file_id' => $file->id,
                'version_number' => 1,
                'file_path' => $storedPath,
                'disk' => $disk,
                'size_bytes' => $size,
                'checksum' => $fileHash,
                'changelog' => 'Initial upload',
                'metadata' => $metadata,
                'created_by' => $user?->id ?? 1,
            ]);

            // Sync tags
            if ($request->has('tags') && is_array($request->input('tags'))) {
                $tagIds = [];
                foreach ($request->input('tags') as $tagName) {
                    $tag = Tag::firstOrCreate(['name' => trim($tagName)]);
                    $tagIds[] = $tag->id;
                }
                $file->tags()->sync($tagIds);
            }

            // Activity Log
            Activity::log(
                action: 'uploaded',
                subjectName: $displayName,
                subjectType: 'File',
                subjectId: $file->id,
                projectId: $projectId,
                details: [
                    'size' => $file->formatted_size,
                    'category' => $category,
                    'extension' => $extension,
                ]
            );

            $uploadedCount++;
            $totalBytes += $size;
        }

        if ($user) {
            $user->increment('storage_used_bytes', $totalBytes);
        }

        return back()->with('success', "Successfully uploaded {$uploadedCount} file(s).");
    }

    /**
     * Download file securely with bit-for-bit integrity and audit logging.
     */
    public function download(Request $request, File $file): StreamedResponse
    {
        if ($file->is_trashed) {
            abort(404, 'File is in trash.');
        }

        if ($file->isLockedFor($request->user())) {
            abort(403, 'LOCKED BY ADMIN: Access to this file is restricted by the Administrator.');
        }

        if (! Storage::disk($file->disk)->exists($file->file_path)) {
            abort(404, 'File binary not found on storage.');
        }

        // Track access stats for dashboard
        $file->increment('access_count');
        $file->update(['last_accessed_at' => now()]);

        Activity::log(
            action: 'downloaded',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id
        );

        return Storage::disk($file->disk)->download($file->file_path, $file->original_filename);
    }

    /**
     * Secure preview for inline viewer.
     */
    public function preview(Request $request, File $file)
    {
        if ($file->is_trashed) {
            abort(404);
        }

        if ($file->isLockedFor($request->user())) {
            abort(403, 'LOCKED BY ADMIN: Access to this file is restricted by the Administrator.');
        }

        if (! Storage::disk($file->disk)->exists($file->file_path)) {
            abort(404);
        }

        $file->increment('access_count');
        $file->update(['last_accessed_at' => now()]);

        if (in_array($file->extension, ['xml', 'dlsd', 'csv', 'txt', 'geojson', 'json', 'dxf', 'kml', 'log', 'obs', 'nav', 'raw'], true)) {
            $content = Storage::disk($file->disk)->get($file->file_path);

            return response($content, 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
            ]);
        }

        return Storage::disk($file->disk)->response($file->file_path, $file->name);
    }

    /**
     * Rename or update file metadata.
     */
    public function update(Request $request, File $file): RedirectResponse
    {
        if ($file->isLockedFor($request->user())) {
            return back()->with('error', 'LOCKED BY ADMIN: This file is locked by the Administrator.');
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'coordinate_system' => ['nullable', 'string', 'max:150'],
            'tags' => ['nullable', 'array'],
        ]);

        $oldName = $file->name;
        $file->name = $validated['name'];
        $file->description = $validated['description'] ?? $file->description;

        if (isset($validated['coordinate_system'])) {
            $meta = $file->metadata ?? [];
            $meta['coordinate_system'] = $validated['coordinate_system'];
            $file->metadata = $meta;
        }

        $file->updated_by = Auth::id();
        $file->save();

        if ($request->has('tags')) {
            $tagIds = [];
            foreach ($request->input('tags') as $tagName) {
                $tag = Tag::firstOrCreate(['name' => trim($tagName)]);
                $tagIds[] = $tag->id;
            }
            $file->tags()->sync($tagIds);
        }

        Activity::log(
            action: 'renamed',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id,
            details: ['old_name' => $oldName, 'new_name' => $file->name]
        );

        return back()->with('success', 'File updated successfully.');
    }

    /**
     * Move file to another folder / project.
     */
    public function move(Request $request, File $file): RedirectResponse
    {
        $user = $request->user();
        if ($file->isLockedFor($user)) {
            return back()->with('error', 'LOCKED BY ADMIN: Cannot move a locked file.');
        }

        $validated = $request->validate([
            'folder_id' => ['nullable', 'exists:folders,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
        ]);

        $targetFolderId = $validated['folder_id'] ?? null;
        $targetProjectId = $validated['project_id'] ?? null;

        if ($targetFolderId) {
            $targetFolder = Folder::find($targetFolderId);
            if ($targetFolder && $targetFolder->isLockedFor($user)) {
                return back()->with('error', 'LOCKED BY ADMIN: Cannot move a file into a locked folder.');
            }
            if (! $targetProjectId) {
                $targetProjectId = $targetFolder?->project_id;
            }
        }

        $oldFolder = $file->folder?->name ?? 'Root';
        $file->folder_id = $targetFolderId;
        $file->project_id = $targetProjectId;
        $file->updated_by = Auth::id();
        $file->save();

        $newFolder = $file->fresh()->folder?->name ?? 'Root';

        Activity::log(
            action: 'moved',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $targetProjectId,
            details: ['from_folder' => $oldFolder, 'to_folder' => $newFolder]
        );

        return back()->with('success', "Moved '{$file->name}' to {$newFolder}.");
    }

    /**
     * Duplicate file (Windows File Explorer copy/paste).
     */
    public function copy(File $file): RedirectResponse
    {
        $disk = $file->disk;
        if (! Storage::disk($disk)->exists($file->file_path)) {
            return back()->with('error', 'Source file does not exist on storage.');
        }

        $subDir = dirname($file->file_path);
        $newFilename = 'Copy_of_'.$file->name;
        $newStoragePath = $subDir.'/'.Str::random(16).'_'.$newFilename;

        Storage::disk($disk)->copy($file->file_path, $newStoragePath);

        $newFile = $file->replicate();
        $newFile->name = $newFilename;
        $newFile->original_filename = $newFilename;
        $newFile->file_path = $newStoragePath;
        $newFile->current_version = 1;
        $newFile->is_locked = false;
        $newFile->locked_by = null;
        $newFile->locked_at = null;
        $newFile->access_count = 0;
        $newFile->created_by = Auth::id();
        $newFile->updated_by = Auth::id();
        $newFile->save();

        FileVersion::create([
            'file_id' => $newFile->id,
            'version_number' => 1,
            'file_path' => $newStoragePath,
            'disk' => $disk,
            'size_bytes' => $newFile->size_bytes,
            'checksum' => hash_file('sha256', Storage::disk($disk)->path($newStoragePath)),
            'changelog' => "Duplicated from {$file->name}",
            'metadata' => $newFile->metadata,
            'created_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'copied',
            subjectName: $newFile->name,
            subjectType: 'File',
            subjectId: $newFile->id,
            projectId: $newFile->project_id,
            details: ['source_file' => $file->name]
        );

        return back()->with('success', "Created duplicate '{$newFilename}'.");
    }

    /**
     * Move file to Trash.
     */
    public function trash(Request $request, File $file): RedirectResponse
    {
        if ($file->isLockedFor($request->user())) {
            return back()->with('error', 'LOCKED BY ADMIN: This file is locked by the Administrator.');
        }
        $file->update([
            'is_trashed' => true,
            'trashed_at' => now(),
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'deleted',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id
        );

        return back()->with('success', "'{$file->name}' moved to Trash.");
    }

    /**
     * Restore file from Trash.
     */
    public function restore(File $file): RedirectResponse
    {
        $file->update([
            'is_trashed' => false,
            'trashed_at' => null,
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'restored',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id
        );

        return back()->with('success', "'{$file->name}' restored.");
    }

    /**
     * Permanently purge file from storage and database.
     */
    public function forceDelete(Request $request, File $file): RedirectResponse
    {
        if ($file->isLockedFor($request->user())) {
            return back()->with('error', 'LOCKED BY ADMIN: This file is locked by the Administrator.');
        }
        foreach ($file->versions as $version) {
            if (Storage::disk($version->disk)->exists($version->file_path)) {
                Storage::disk($version->disk)->delete($version->file_path);
            }
        }

        if (Storage::disk($file->disk)->exists($file->file_path)) {
            Storage::disk($file->disk)->delete($file->file_path);
        }

        $fileName = $file->name;
        $fileId = $file->id;
        $projectId = $file->project_id;

        $file->forceDelete();

        Activity::log(
            action: 'permanently_deleted',
            subjectName: $fileName,
            subjectType: 'File',
            subjectId: $fileId,
            projectId: $projectId
        );

        return back()->with('success', "'{$fileName}' permanently deleted.");
    }

    /**
     * Toggle Star (Google Drive quick favorite).
     */
    public function toggleStar(File $file): RedirectResponse
    {
        $file->update(['is_starred' => ! $file->is_starred]);

        return back();
    }

    /**
     * Lock File (Admin authority: restricts employees from opening/downloading).
     */
    public function lock(Request $request, File $file): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user && $user->isAdmin(), 403, 'Only administrators can lock files.');

        $request->validate([
            'lock_note' => ['nullable', 'string', 'max:255'],
        ]);

        $file->update([
            'is_locked' => true,
            'locked_by' => $user->id,
            'locked_at' => now(),
            'lock_note' => $request->input('lock_note') ?: 'LOCKED BY ADMIN — Employee Access Restricted',
        ]);

        Activity::log(
            action: 'locked',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id,
            details: ['note' => $file->lock_note]
        );

        return back()->with('success', "File '{$file->name}' is now LOCKED BY ADMIN.");
    }

    /**
     * Unlock File (Admin authority).
     */
    public function unlock(File $file): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user && $user->isAdmin(), 403, 'Only administrators can unlock files.');

        $file->update([
            'is_locked' => false,
            'locked_by' => null,
            'locked_at' => null,
            'lock_note' => null,
        ]);

        Activity::log(
            action: 'unlocked',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id
        );

        return back()->with('success', "File '{$file->name}' unlocked.");
    }
}
