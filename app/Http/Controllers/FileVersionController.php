<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\FileVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileVersionController extends Controller
{
    /**
     * Get version history for a file.
     */
    public function index(File $file): JsonResponse
    {
        $versions = $file->versions()
            ->with('creator:id,name,role')
            ->orderByDesc('version_number')
            ->get()
            ->map(function ($ver) use ($file) {
                return [
                    'id' => $ver->id,
                    'version_number' => $ver->version_number,
                    'is_current' => $ver->version_number === $file->current_version,
                    'size_bytes' => $ver->size_bytes,
                    'formatted_size' => $ver->formatted_size,
                    'checksum' => $ver->checksum,
                    'changelog' => $ver->changelog,
                    'creator' => $ver->creator,
                    'created_at' => $ver->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'file_id' => $file->id,
            'file_name' => $file->name,
            'current_version' => $file->current_version,
            'versions' => $versions,
        ]);
    }

    /**
     * Upload a new revision version of a file.
     */
    public function store(Request $request, File $file): RedirectResponse
    {
        $request->validate([
            'revision_file' => ['required', 'file', 'max:512000'],
            'changelog' => ['required', 'string', 'max:1000'],
        ]);

        $uploadedFile = $request->file('revision_file');
        $size = $uploadedFile->getSize();
        $disk = $file->disk ?: 'local';

        $nextVersion = $file->current_version + 1;
        $subDir = 'files/'.($file->project_id ? 'PRJ-'.$file->project_id : 'general').'/'.date('Y/m');
        $randomPrefix = Str::random(16);
        $storedPath = $uploadedFile->storeAs($subDir, $randomPrefix.'_v'.$nextVersion.'_'.$file->name, $disk);

        $checksum = hash_file('sha256', $uploadedFile->getRealPath());

        FileVersion::create([
            'file_id' => $file->id,
            'version_number' => $nextVersion,
            'file_path' => $storedPath,
            'disk' => $disk,
            'size_bytes' => $size,
            'checksum' => $checksum,
            'changelog' => $request->input('changelog'),
            'metadata' => $file->metadata,
            'created_by' => Auth::id(),
        ]);

        // Automatically release check-out lock on check-in/new version
        $wasLocked = $file->is_locked;
        $file->update([
            'current_version' => $nextVersion,
            'file_path' => $storedPath,
            'size_bytes' => $size,
            'is_locked' => false,
            'locked_by' => null,
            'locked_at' => null,
            'lock_note' => null,
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'version_created',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id,
            details: [
                'new_version' => $nextVersion,
                'changelog' => $request->input('changelog'),
                'was_locked' => $wasLocked,
            ]
        );

        return back()->with('success', "Version {$nextVersion} uploaded successfully.");
    }

    /**
     * Download a specific historic version.
     */
    public function download(File $file, FileVersion $version): StreamedResponse
    {
        if ($version->file_id !== $file->id) {
            abort(404);
        }

        if (! Storage::disk($version->disk)->exists($version->file_path)) {
            abort(404, 'Version binary not found on storage.');
        }

        $versionedName = pathinfo($file->original_filename, PATHINFO_FILENAME).'_v'.$version->version_number.'.'.$file->extension;

        return Storage::disk($version->disk)->download($version->file_path, $versionedName);
    }

    /**
     * Restore a historic version to become current.
     */
    public function restore(File $file, FileVersion $version): RedirectResponse
    {
        if ($version->file_id !== $file->id) {
            abort(404);
        }

        $oldVersion = $file->current_version;

        $file->update([
            'current_version' => $version->version_number,
            'file_path' => $version->file_path,
            'size_bytes' => $version->size_bytes,
            'updated_by' => Auth::id(),
        ]);

        Activity::log(
            action: 'version_restored',
            subjectName: $file->name,
            subjectType: 'File',
            subjectId: $file->id,
            projectId: $file->project_id,
            details: [
                'restored_version' => $version->version_number,
                'previous_version' => $oldVersion,
            ]
        );

        return back()->with('success', "Restored file to Version {$version->version_number}.");
    }
}
