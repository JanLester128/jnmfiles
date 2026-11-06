<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\Folder;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display listing of land surveying & engineering projects.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $status = $request->query('status');
        $surveyType = $request->query('survey_type');

        $query = Project::with(['manager:id,name,role', 'creator:id,name'])
            ->withCount(['files', 'folders', 'members']);

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($surveyType && $surveyType !== 'all') {
            $query->where('survey_type', $surveyType);
        }

        $projects = $query->latest()->get()->map(function ($prj) {
            $prj->storage_used_bytes = (int) File::where('project_id', $prj->id)->where('is_trashed', false)->sum('size_bytes');

            return $prj;
        });

        $allUsers = User::where('is_active', true)->select('id', 'name', 'email', 'role')->get();

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'users' => $allUsers,
            'filters' => [
                'q' => $search,
                'status' => $status ?? 'all',
                'survey_type' => $surveyType ?? 'all',
            ],
        ]);
    }

    /**
     * Create a new project and scaffold standard engineering folders.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:projects,code'],
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'survey_type' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'in:planning,field_work,processing,review,approved,archived'],
            'description' => ['nullable', 'string', 'max:2000'],
            'coordinate_system' => ['nullable', 'string', 'max:150'],
            'datum' => ['nullable', 'string', 'max:100'],
            'benchmark_ref' => ['nullable', 'string', 'max:150'],
            'start_date' => ['nullable', 'date'],
            'target_date' => ['nullable', 'date'],
            'manager_id' => ['nullable', 'exists:users,id'],
            'is_confidential' => ['boolean'],
        ]);

        $user = $request->user();

        $project = Project::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'location' => $validated['location'] ?? null,
            'survey_type' => $validated['survey_type'],
            'status' => $validated['status'],
            'description' => $validated['description'] ?? null,
            'coordinate_system' => $validated['coordinate_system'] ?? 'WGS84 / UTM Zone 51N',
            'datum' => $validated['datum'] ?? 'Mean Sea Level (MSL)',
            'benchmark_ref' => $validated['benchmark_ref'] ?? null,
            'start_date' => $validated['start_date'] ?? now()->toDateString(),
            'target_date' => $validated['target_date'] ?? null,
            'manager_id' => $validated['manager_id'] ?? $user->id,
            'is_confidential' => $request->boolean('is_confidential'),
            'created_by' => $user->id,
        ]);

        // Auto-create Root Folder
        $rootFolder = Folder::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'name' => $project->code.' - Root',
            'description' => "Root repository for {$project->name}",
            'color' => '#2563eb',
            'category' => 'general',
            'is_system' => true,
            'created_by' => $user->id,
        ]);

        $project->update(['root_folder_id' => $rootFolder->id]);

        // Scaffold standard engineering folder hierarchy
        $standardFolders = [
            ['name' => '01_Field_Raw_Data', 'cat' => 'raw_survey', 'color' => '#2563eb', 'desc' => 'Raw GNSS logs, total station coordinates, field notes'],
            ['name' => '02_CAD_and_Drawings', 'cat' => 'cad_drawings', 'color' => '#0891b2', 'desc' => 'Civil 3D drawings, boundary plats, contour dwg/dxf'],
            ['name' => '03_GIS_and_LiDAR', 'cat' => 'gis_lidar', 'color' => '#9333ea', 'desc' => 'Shapefiles, GeoJSON, LAS point clouds, DEM rasters'],
            ['name' => '04_Photos_and_Inspection', 'cat' => 'field_photos', 'color' => '#ea580c', 'desc' => 'Field boundary monuments, site condition photos, drone photos'],
            ['name' => '05_Client_Deliverables', 'cat' => 'deliverables', 'color' => '#16a34a', 'desc' => 'Certified signed plats, calculation sheets, survey narrative reports'],
            ['name' => '06_Legal_and_Permits', 'cat' => 'legal_docs', 'color' => '#64748b', 'desc' => 'Land titles, deeds of sale, municipal zoning clearances'],
        ];

        foreach ($standardFolders as $sf) {
            Folder::create([
                'project_id' => $project->id,
                'parent_id' => $rootFolder->id,
                'name' => $sf['name'],
                'description' => $sf['desc'],
                'category' => $sf['cat'],
                'color' => $sf['color'],
                'is_system' => true,
                'created_by' => $user->id,
            ]);
        }

        // Add creator and manager as members
        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'role' => $user->role === 'admin' ? 'Principal Engineer' : 'Lead Surveyor',
        ]);

        if ($project->manager_id && $project->manager_id !== $user->id) {
            ProjectMember::create([
                'project_id' => $project->id,
                'user_id' => $project->manager_id,
                'role' => 'Project Manager',
            ]);
        }

        Activity::log(
            action: 'created_project',
            subjectName: $project->name,
            subjectType: 'Project',
            subjectId: $project->id,
            projectId: $project->id,
            details: ['code' => $project->code, 'client' => $project->client_name]
        );

        return redirect()->route('projects.show', $project)->with('success', "Project {$project->code} initialized with standard surveying folders.");
    }

    /**
     * Show project details, documents, and team members.
     */
    public function show(Project $project): Response
    {
        $project->load([
            'manager:id,name,email,role,phone',
            'creator:id,name',
            'members' => fn ($q) => $q->select('users.id', 'users.name', 'users.email', 'users.role', 'users.phone'),
            'rootFolder',
        ]);

        $projectFiles = File::with(['creator:id,name', 'folder:id,name', 'locker:id,name'])
            ->where('project_id', $project->id)
            ->where('is_trashed', false)
            ->latest()
            ->take(20)
            ->get();

        $projectFolders = Folder::where('project_id', $project->id)
            ->where('is_trashed', false)
            ->withCount('files')
            ->get();

        $storageUsed = (int) File::where('project_id', $project->id)->where('is_trashed', false)->sum('size_bytes');

        $activities = Activity::with('user:id,name')
            ->where('project_id', $project->id)
            ->latest()
            ->take(15)
            ->get();

        $allUsers = User::where('is_active', true)->select('id', 'name', 'email', 'role')->get();

        return Inertia::render('projects/show', [
            'project' => $project,
            'files' => $projectFiles,
            'folders' => $projectFolders,
            'storageUsed' => $storageUsed,
            'activities' => $activities,
            'availableUsers' => $allUsers,
        ]);
    }

    /**
     * Update project metadata.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'survey_type' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'in:planning,field_work,processing,review,approved,archived'],
            'description' => ['nullable', 'string', 'max:2000'],
            'coordinate_system' => ['nullable', 'string', 'max:150'],
            'datum' => ['nullable', 'string', 'max:100'],
            'benchmark_ref' => ['nullable', 'string', 'max:150'],
            'target_date' => ['nullable', 'date'],
            'manager_id' => ['nullable', 'exists:users,id'],
            'is_confidential' => ['boolean'],
        ]);

        $project->update($validated);

        Activity::log(
            action: 'updated_project',
            subjectName: $project->name,
            subjectType: 'Project',
            subjectId: $project->id,
            projectId: $project->id
        );

        return back()->with('success', "Project {$project->code} updated.");
    }

    /**
     * Delete/archive a project.
     */
    public function destroy(Project $project): RedirectResponse
    {
        $projectName = $project->name;
        $projectCode = $project->code;
        $project->delete();

        Activity::log(
            action: 'archived_project',
            subjectName: $projectName,
            subjectType: 'Project',
            subjectId: $project->id,
            details: ['code' => $projectCode]
        );

        return redirect()->route('projects.index')->with('success', "Project {$projectCode} deleted.");
    }

    /**
     * Add employee to project team.
     */
    public function addMember(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role' => ['required', 'string', 'max:50'],
        ]);

        ProjectMember::updateOrCreate(
            ['project_id' => $project->id, 'user_id' => $validated['user_id']],
            ['role' => $validated['role']]
        );

        $member = User::find($validated['user_id']);

        Activity::log(
            action: 'added_member',
            subjectName: $member->name,
            subjectType: 'User',
            subjectId: $member->id,
            projectId: $project->id,
            details: ['role' => $validated['role']]
        );

        return back()->with('success', "Added {$member->name} to project team.");
    }

    /**
     * Remove employee from project team.
     */
    public function removeMember(Project $project, User $user): RedirectResponse
    {
        ProjectMember::where('project_id', $project->id)->where('user_id', $user->id)->delete();

        Activity::log(
            action: 'removed_member',
            subjectName: $user->name,
            subjectType: 'User',
            subjectId: $user->id,
            projectId: $project->id
        );

        return back()->with('success', "Removed {$user->name} from project team.");
    }
}
