<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    /**
     * Display complete audit trail and activity log.
     */
    public function index(Request $request): Response
    {
        $action = $request->query('action');
        $userId = $request->query('user_id');
        $projectId = $request->query('project_id');
        $search = trim((string) $request->query('q', ''));

        $query = Activity::with(['user:id,name,role', 'project:id,code,name']);

        if ($action && $action !== 'all') {
            $query->where('action', $action);
        }

        if ($userId && $userId !== 'all') {
            $query->where('user_id', $userId);
        }

        if ($projectId && $projectId !== 'all') {
            $query->where('project_id', $projectId);
        }

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('subject_name', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%");
            });
        }

        $activities = $query->latest()->paginate(25)->withQueryString();

        $users = User::select('id', 'name')->get();
        $projects = Project::select('id', 'code', 'name')->get();

        return Inertia::render('activities/index', [
            'activities' => $activities,
            'users' => $users,
            'projects' => $projects,
            'filters' => [
                'action' => $action ?? 'all',
                'user_id' => $userId ?? 'all',
                'project_id' => $projectId ?? 'all',
                'q' => $search,
            ],
        ]);
    }
}
