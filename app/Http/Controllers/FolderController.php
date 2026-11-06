<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\FileVersion;
use App\Models\Folder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class FolderController extends Controller
{
    /**
     * Create a new folder.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:folders,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'max:25'],
            'category' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $parentId = $validated['parent_id'] ?? null;
        $projectId = $validated['project_id'] ?? null;

        if ($parentId) {
            $parent = Folder::find($parentId);
            if ($parent && $parent->isLockedFor($user)) {
                return back()->with('error', 'Access Denied: Cannot create a subfolder inside a folder locked by the Administrator.');
            }
            if (! $projectId) {
                $projectId = $parent?->project_id;
            }
        }

        $folder = Folder::create([
            'name' => $validated['name'],
            'parent_id' => $parentId,
            'project_id' => $projectId,
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#059669',
            'category' => $validated['category'] ?? 'general',
            'is_system' => false,
            'is_locked' => false,
            'is_starred' => false,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'created_folder',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $projectId
        );

        return back()->with('success', "Folder '{$folder->name}' created.");
    }

    /**
     * Rename or update folder settings.
     */
    public function update(Request $request, Folder $folder): RedirectResponse
    {
        if ($folder->isLockedFor($request->user())) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'max:25'],
            'category' => ['nullable', 'string', 'max:50'],
        ]);

        $oldName = $folder->name;
        $folder->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? $folder->description,
            'color' => $validated['color'] ?? $folder->color,
            'category' => $validated['category'] ?? $folder->category,
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'renamed',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id,
            details: ['old_name' => $oldName, 'new_name' => $folder->name]
        );

        return back()->with('success', 'Folder updated.');
    }

    /**
     * Lock folder so that employees/staff cannot open it (Admin only).
     */
    public function lock(Request $request, Folder $folder): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user && $user->isAdmin(), 403, 'Only administrators can lock folders.');

        $request->validate([
            'lock_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $folder->update([
            'is_locked' => true,
            'locked_by' => $user->id,
            'lock_reason' => $request->input('lock_reason') ?: 'Locked by Administrator - Employee Access Restricted',
            'updated_by' => $user->id,
        ]);

        Activity::log(
            action: 'locked_folder',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id,
            details: ['reason' => $folder->lock_reason]
        );

        return back()->with('success', "Folder '{$folder->name}' is now locked. Employees cannot open it.");
    }

    /**
     * Unlock folder so employees can access it (Admin only).
     */
    public function unlock(Folder $folder): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user && $user->isAdmin(), 403, 'Only administrators can unlock folders.');

        $folder->update([
            'is_locked' => false,
            'locked_by' => null,
            'lock_reason' => null,
            'updated_by' => $user->id,
        ]);

        Activity::log(
            action: 'unlocked_folder',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id
        );

        return back()->with('success', "Folder '{$folder->name}' unlocked for employees.");
    }

    /**
     * Download entire folder as a ZIP archive.
     */
    public function downloadZip(Folder $folder): BinaryFileResponse|RedirectResponse
    {
        $user = Auth::user();
        if ($folder->isLockedFor($user)) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $tempDir = storage_path('app/temp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $sanitizedFolderName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $folder->name);
        $zipFileName = $sanitizedFolderName.'_'.date('Ymd_His').'.zip';
        $zipFilePath = $tempDir.'/'.$zipFileName;

        $zip = new ZipArchive;
        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->with('error', 'Could not create ZIP archive on server.');
        }

        $this->addFolderToZip($folder, $zip, '', $user);

        $zip->close();

        Activity::log(
            action: 'downloaded_folder_zip',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id
        );

        return response()->download($zipFilePath, $zipFileName)->deleteFileAfterSend(true);
    }

    /**
     * Helper to recursively append folder files and unlocked subfolders into ZipArchive.
     */
    private function addFolderToZip(Folder $folder, ZipArchive $zip, string $parentPath, $user): void
    {
        if ($folder->isLockedFor($user)) {
            return;
        }

        $currentPath = $parentPath === '' ? $folder->name : $parentPath.'/'.$folder->name;
        $zip->addEmptyDir($currentPath);

        $files = $folder->files()->where('is_trashed', false)->get();
        foreach ($files as $file) {
            if (Storage::disk($file->disk)->exists($file->file_path)) {
                $fileContent = Storage::disk($file->disk)->get($file->file_path);
                $zip->addFromString($currentPath.'/'.$file->original_filename, $fileContent);
            }
        }

        $subfolders = $folder->children()->where('is_trashed', false)->get();
        foreach ($subfolders as $sub) {
            $this->addFolderToZip($sub, $zip, $currentPath, $user);
        }
    }

    /**
     * Move folder to another location.
     */
    public function move(Request $request, Folder $folder): RedirectResponse
    {
        $user = $request->user();
        if ($folder->isLockedFor($user)) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $validated = $request->validate([
            'parent_id' => ['nullable', 'exists:folders,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
        ]);

        $newParentId = $validated['parent_id'] ?? null;
        if ($newParentId && $folder->containsFolder((int) $newParentId)) {
            return back()->with('error', 'Cannot move a folder into itself or one of its subfolders.');
        }

        if ($newParentId) {
            $targetParent = Folder::find($newParentId);
            if ($targetParent && $targetParent->isLockedFor($user)) {
                return back()->with('error', 'Access Denied: Cannot move into a locked folder.');
            }
        }

        $folder->update([
            'parent_id' => $newParentId,
            'project_id' => $validated['project_id'] ?? $folder->project_id,
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'moved',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id
        );

        return back()->with('success', 'Folder moved.');
    }

    /**
     * Duplicate folder and its files recursively.
     */
    public function copy(Request $request, Folder $folder): RedirectResponse
    {
        if ($folder->isLockedFor($request->user())) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $newFolderName = 'Copy_of_'.$folder->name;
        $newFolder = $folder->replicate();
        $newFolder->name = $newFolderName;
        $newFolder->is_system = false;
        $newFolder->is_locked = false;
        $newFolder->created_by = Auth::id();
        $newFolder->updated_by = Auth::id();
        $newFolder->save();

        foreach ($folder->files as $file) {
            if (Storage::disk($file->disk)->exists($file->file_path)) {
                $subDir = dirname($file->file_path);
                $newStoragePath = $subDir.'/'.Str::random(16).'_'.$file->name;
                Storage::disk($file->disk)->copy($file->file_path, $newStoragePath);

                $newFile = $file->replicate();
                $newFile->folder_id = $newFolder->id;
                $newFile->file_path = $newStoragePath;
                $newFile->created_by = Auth::id();
                $newFile->updated_by = Auth::id();
                $newFile->save();

                FileVersion::create([
                    'file_id' => $newFile->id,
                    'version_number' => 1,
                    'file_path' => $newStoragePath,
                    'disk' => $file->disk,
                    'size_bytes' => $file->size_bytes,
                    'checksum' => hash_file('sha256', Storage::disk($file->disk)->path($newStoragePath)),
                    'changelog' => 'Copied with parent folder',
                    'created_by' => Auth::id(),
                ]);
            }
        }

        Activity::log(
            action: 'copied',
            subjectName: $newFolder->name,
            subjectType: 'Folder',
            subjectId: $newFolder->id,
            projectId: $newFolder->project_id,
            details: ['source_folder' => $folder->name]
        );

        return back()->with('success', "Folder '{$newFolderName}' created.");
    }

    /**
     * Move folder to Trash.
     */
    public function trash(Request $request, Folder $folder): RedirectResponse
    {
        if ($folder->isLockedFor($request->user())) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        if ($folder->is_system && ! $request->user()?->isAdmin()) {
            return back()->with('error', 'System root folders cannot be moved to trash.');
        }

        $folder->update([
            'is_trashed' => true,
            'trashed_at' => now(),
            'updated_by' => Auth::id(),
        ]);

        $folder->files()->update([
            'is_trashed' => true,
            'trashed_at' => now(),
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'deleted',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id
        );

        return back()->with('success', "Folder '{$folder->name}' moved to Trash.");
    }

    /**
     * Restore folder from Trash.
     */
    public function restore(Request $request, Folder $folder): RedirectResponse
    {
        if ($folder->isLockedFor($request->user())) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $folder->update([
            'is_trashed' => false,
            'trashed_at' => null,
            'updated_by' => Auth::id(),
        ]);

        $folder->files()->update([
            'is_trashed' => false,
            'trashed_at' => null,
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'restored',
            subjectName: $folder->name,
            subjectType: 'Folder',
            subjectId: $folder->id,
            projectId: $folder->project_id
        );

        return back()->with('success', "Folder '{$folder->name}' restored.");
    }

    /**
     * Permanently purge folder from database.
     */
    public function forceDelete(Request $request, Folder $folder): RedirectResponse
    {
        if ($folder->isLockedFor($request->user())) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $folderName = $folder->name;
        $folderId = $folder->id;
        $projectId = $folder->project_id;

        foreach ($folder->files as $file) {
            foreach ($file->versions as $version) {
                if (Storage::disk($version->disk)->exists($version->file_path)) {
                    Storage::disk($version->disk)->delete($version->file_path);
                }
            }
            if (Storage::disk($file->disk)->exists($file->file_path)) {
                Storage::disk($file->disk)->delete($file->file_path);
            }
            $file->forceDelete();
        }

        $folder->forceDelete();

        Activity::log(
            action: 'permanently_deleted',
            subjectName: $folderName,
            subjectType: 'Folder',
            subjectId: $folderId,
            projectId: $projectId
        );

        return back()->with('success', "Folder '{$folderName}' permanently deleted.");
    }

    /**
     * Toggle Star on folder.
     */
    public function toggleStar(Request $request, Folder $folder): RedirectResponse
    {
        if ($folder->isLockedFor($request->user())) {
            return back()->with('error', 'Access Denied: This folder is locked by the Administrator.');
        }

        $folder->update(['is_starred' => ! $folder->is_starred]);

        return back();
    }
}
