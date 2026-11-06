<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\FileShare;
use App\Models\Folder;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DriveController extends Controller
{
    /**
     * Display the File Explorer interface with strict folder-lock enforcement for employees.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdmin();

        $folderId = $request->query('folder_id');
        $projectId = $request->query('project_id');
        $category = $request->query('category');
        $starred = $request->boolean('starred');
        $trashed = $request->boolean('trashed');
        $shared = $request->boolean('shared');
        $search = trim((string) $request->query('q', ''));
        $sortBy = $request->query('sort', 'name');
        $direction = strtolower($request->query('direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $viewMode = $request->query('view', 'grid');

        $currentFolder = null;
        $currentProject = null;
        $breadcrumbs = [];

        if ($projectId) {
            $currentProject = Project::with('manager:id,name')->find($projectId);
        }

        if ($folderId) {
            $currentFolder = Folder::with(['project', 'parent', 'locker:id,name'])->find($folderId);
            if ($currentFolder) {
                // Strictly block employees from opening any locked folder (or any subfolder inside a locked folder)
                if ($currentFolder->isLockedFor($user)) {
                    $reason = $currentFolder->lock_reason ?: 'Restricted by Administrator';

                    return redirect()->route('drive.index', array_filter([
                        'folder_id' => $currentFolder->parent_id,
                        'project_id' => $currentFolder->project_id,
                    ]))->with('error', "Access Denied: The folder '{$currentFolder->name}' is locked by the Administrator ({$reason}). Employees cannot open this folder.");
                }

                $currentFolder->increment('access_count');
                $breadcrumbs = $currentFolder->getBreadcrumbs();

                if (! $currentProject && $currentFolder->project_id) {
                    $currentProject = $currentFolder->project;
                }
            }
        }

        $lockedFolderIds = $isAdmin ? [] : Folder::allLockedFolderIds();

        // Folders Query
        $foldersQuery = Folder::with(['creator:id,name', 'locker:id,name', 'project:id,code,name'])
            ->withCount('files');

        // Files Query
        $filesQuery = File::with([
            'creator:id,name',
            'locker:id,name',
            'project:id,code,name',
            'tags',
            'folder:id,name,is_locked',
        ])->withCount('versions');

        if ($trashed) {
            $foldersQuery->where('is_trashed', true);
            $filesQuery->where('is_trashed', true);

            if (! $isAdmin && $lockedFolderIds !== []) {
                $foldersQuery->whereNotIn('id', $lockedFolderIds);
                $filesQuery->where(function ($q) use ($lockedFolderIds) {
                    $q->whereNull('folder_id')->orWhereNotIn('folder_id', $lockedFolderIds);
                });
            }
        } else {
            $foldersQuery->where('is_trashed', false);
            $filesQuery->where('is_trashed', false);

            if ($starred) {
                $foldersQuery->where('is_starred', true);
                $filesQuery->where('is_starred', true);

                if (! $isAdmin && $lockedFolderIds !== []) {
                    $foldersQuery->whereNotIn('id', $lockedFolderIds);
                    $filesQuery->where(function ($q) use ($lockedFolderIds) {
                        $q->whereNull('folder_id')->orWhereNotIn('folder_id', $lockedFolderIds);
                    });
                }
            } elseif ($shared) {
                $sharedFolderIds = FileShare::where('user_id', $user?->id)
                    ->where('shareable_type', Folder::class)
                    ->pluck('shareable_id');
                $sharedFileIds = FileShare::where('user_id', $user?->id)
                    ->where('shareable_type', File::class)
                    ->pluck('shareable_id');

                $foldersQuery->whereIn('id', $sharedFolderIds);
                $filesQuery->whereIn('id', $sharedFileIds);
            } elseif (! empty($search)) {
                $foldersQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });

                $filesQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('original_filename', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('tags', function ($tq) use ($search) {
                            $tq->where('name', 'like', "%{$search}%");
                        });
                });

                if (! $isAdmin && $lockedFolderIds !== []) {
                    $foldersQuery->where(function ($q) use ($lockedFolderIds) {
                        $q->whereNull('parent_id')->orWhereNotIn('parent_id', $lockedFolderIds);
                    });
                    $filesQuery->where(function ($q) use ($lockedFolderIds) {
                        $q->whereNull('folder_id')->orWhereNotIn('folder_id', $lockedFolderIds);
                    });
                }
            } elseif ($category && $category !== 'all') {
                $foldersQuery->whereRaw('1 = 0');
                $filesQuery->where('category', $category);
                if ($projectId) {
                    $filesQuery->where('project_id', $projectId);
                }
                if (! $isAdmin && $lockedFolderIds !== []) {
                    $filesQuery->where(function ($q) use ($lockedFolderIds) {
                        $q->whereNull('folder_id')->orWhereNotIn('folder_id', $lockedFolderIds);
                    });
                }
            } else {
                // Normal directory navigation
                if ($folderId) {
                    $foldersQuery->where('parent_id', $folderId);
                    $filesQuery->where('folder_id', $folderId);
                } else {
                    if ($projectId) {
                        if ($currentProject && $currentProject->root_folder_id) {
                            $foldersQuery->where('parent_id', $currentProject->root_folder_id);
                            $filesQuery->where('folder_id', $currentProject->root_folder_id);
                        } else {
                            $foldersQuery->where('project_id', $projectId)->whereNull('parent_id');
                            $filesQuery->where('project_id', $projectId)->whereNull('folder_id');
                        }
                    } else {
                        $foldersQuery->whereNull('parent_id')->whereNull('project_id');
                        $filesQuery->whereNull('folder_id')->whereNull('project_id');
                    }
                }
            }
        }

        // Apply Sorting to Folders
        switch ($sortBy) {
            case 'date':
                $foldersQuery->orderBy('updated_at', $direction);
                break;
            case 'created':
                $foldersQuery->orderBy('created_at', $direction);
                break;
            default:
                $foldersQuery->orderBy('name', $direction);
                break;
        }

        // Apply Sorting to Files
        switch ($sortBy) {
            case 'date':
                $filesQuery->orderBy('updated_at', $direction);
                break;
            case 'created':
                $filesQuery->orderBy('created_at', $direction);
                break;
            case 'size':
                $filesQuery->orderBy('size_bytes', $direction);
                break;
            case 'type':
                $filesQuery->orderBy('extension', $direction);
                break;
            default:
                $filesQuery->orderBy('name', $direction);
                break;
        }

        $folders = $foldersQuery->get();
        $files = $filesQuery->get();

        $allProjects = Project::select('id', 'code', 'name', 'status', 'survey_type', 'root_folder_id')
            ->orderBy('code')
            ->get();

        $libraryFolders = Folder::whereNull('project_id')
            ->whereNull('parent_id')
            ->where('is_trashed', false)
            ->with(['children' => fn ($q) => $q->where('is_trashed', false)])
            ->get();

        $storageUsed = (int) File::where('is_trashed', false)->sum('size_bytes');

        // Build list of valid destination folders where items can be moved/transferred
        $transferableFoldersQuery = Folder::where('is_trashed', false)->orderBy('name');
        if (! $isAdmin && $lockedFolderIds !== []) {
            $transferableFoldersQuery->whereNotIn('id', $lockedFolderIds);
        }

        $transferableFolders = $transferableFoldersQuery->get()->map(function (Folder $folder) {
            $crumbs = $folder->getBreadcrumbs();
            $path = implode(' / ', array_column($crumbs, 'name'));

            return [
                'id' => $folder->id,
                'name' => $folder->name,
                'parent_id' => $folder->parent_id,
                'path' => $path ?: $folder->name,
            ];
        })->values();

        return Inertia::render('drive/index', [
            'folders' => $folders,
            'files' => $files,
            'currentFolder' => $currentFolder,
            'currentProject' => $currentProject,
            'breadcrumbs' => $breadcrumbs,
            'allProjects' => $allProjects,
            'libraryFolders' => $libraryFolders,
            'transferableFolders' => $transferableFolders,
            'storageUsed' => $storageUsed,
            'filters' => [
                'folder_id' => $folderId,
                'project_id' => $projectId,
                'category' => $category ?? 'all',
                'starred' => $starred,
                'trashed' => $trashed,
                'shared' => $shared,
                'q' => $search,
                'sort' => $sortBy,
                'direction' => $direction,
                'view' => $viewMode,
            ],
        ]);
    }
}
