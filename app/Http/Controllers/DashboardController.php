<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\FileShare;
use App\Models\Folder;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard tailored to the logged-in user's role (Admin vs Employee).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdmin();
        $allLockedFolderIds = Folder::allLockedFolderIds();
        $lockedFolderIdsForEmployee = $isAdmin ? [] : $allLockedFolderIds;

        // 1. Core Statistics
        $filesBaseQuery = File::where('is_trashed', false);
        if (! $isAdmin) {
            $filesBaseQuery->where('is_locked', false);
            if ($lockedFolderIdsForEmployee !== []) {
                $filesBaseQuery->where(function ($q) use ($lockedFolderIdsForEmployee) {
                    $q->whereNull('folder_id')->orWhereNotIn('folder_id', $lockedFolderIdsForEmployee);
                });
            }
        }

        $totalFiles = (clone $filesBaseQuery)->count();
        $totalFolders = Folder::where('is_trashed', false)->count();
        $lockedFoldersCount = $allLockedFolderIds === []
            ? 0
            : Folder::where('is_trashed', false)->whereIn('id', $allLockedFolderIds)->count();
        $lockedFilesCount = File::where('is_trashed', false)
            ->where(function ($q) use ($allLockedFolderIds) {
                $q->where('is_locked', true);
                if ($allLockedFolderIds !== []) {
                    $q->orWhereIn('folder_id', $allLockedFolderIds);
                }
            })
            ->count();
        $lockedByAdminTotal = $lockedFoldersCount + File::where('is_trashed', false)
            ->where('is_locked', true)
            ->when($allLockedFolderIds !== [], function ($q) use ($allLockedFolderIds) {
                $q->where(function ($inner) use ($allLockedFolderIds) {
                    $inner->whereNull('folder_id')->orWhereNotIn('folder_id', $allLockedFolderIds);
                });
            })
            ->count();
        $unlockedFoldersCount = max(0, $totalFolders - $lockedFoldersCount);

        $totalProjects = Project::count();
        $activeProjects = Project::whereIn('status', ['planning', 'field_work', 'processing', 'review'])->count();
        $sharedFilesCount = FileShare::where('shareable_type', File::class)->count();

        $totalStorageBytes = (int) (clone $filesBaseQuery)->sum('size_bytes');
        $userStorageUsed = (int) File::where('is_trashed', false)->where('created_by', $user?->id)->sum('size_bytes');
        $userStorageLimit = 536870912000; // 500 GB

        $totalEmployees = User::where('role', '!=', 'admin')->count();
        $activeEmployees = User::where('role', '!=', 'admin')->where('is_active', true)->count();
        $disabledEmployees = User::where('role', '!=', 'admin')->where('is_active', false)->count();

        // 2. Recent Files (Filtered for Employees so locked folder files never leak)
        $recentFiles = (clone $filesBaseQuery)
            ->with(['project:id,code,name', 'creator:id,name', 'folder:id,name,is_locked'])
            ->latest('updated_at')
            ->take(8)
            ->get();

        // 3. Top-level Folders for quick workspace browsing
        $rootFolders = Folder::with(['locker:id,name'])
            ->withCount('files')
            ->where('is_trashed', false)
            ->whereNull('parent_id')
            ->orderBy('name')
            ->take(12)
            ->get();

        // 4. Recent Audit Activities
        $recentActivities = Activity::with('user:id,name')
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('dashboard', [
            'stats' => [
                'total_files' => $totalFiles,
                'total_folders' => $totalFolders,
                'locked_folders' => $lockedFoldersCount,
                'locked_files' => $lockedFilesCount,
                'locked_by_admin' => $lockedByAdminTotal,
                'unlocked_folders' => $unlockedFoldersCount,
                'total_projects' => $totalProjects,
                'active_projects' => $activeProjects,
                'shared_files' => $sharedFilesCount,
                'total_storage_bytes' => $totalStorageBytes,
                'user_storage_used' => $userStorageUsed,
                'user_storage_limit' => $userStorageLimit,
                'total_employees' => $totalEmployees,
                'active_employees' => $activeEmployees,
                'disabled_employees' => $disabledEmployees,
            ],
            'root_folders' => $rootFolders,
            'recent_files' => $recentFiles,
            'recent_activities' => $recentActivities,
        ]);
    }

    /**
     * Switch role helper (only allowed when authenticated as admin).
     */
    public function switchRole(Request $request): RedirectResponse
    {
        $role = $request->input('role', 'admin');

        $targetUser = User::where('role', $role)->where('is_active', true)->first();
        if ($targetUser) {
            Auth::login($targetUser);

            return back()->with('success', "Switched active identity to: {$targetUser->name}");
        }

        return back();
    }
}
