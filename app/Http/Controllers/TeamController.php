<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    /**
     * Display the employee directory and access management (Admin only).
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can manage employee accounts.');

        // Ensure the old default seeded staff account is removed so only Admin-created staff exist
        User::where('email', 'Employee')
            ->where('name', 'Survey Staff')
            ->delete();

        $users = User::withCount(['projects', 'assignedProjects', 'files'])
            ->orderByDesc('role')
            ->orderBy('name')
            ->get()
            ->map(function (User $u) {
                $u->setAttribute(
                    'actual_storage_used',
                    (int) File::where('created_by', $u->id)->where('is_trashed', false)->sum('size_bytes')
                );

                return $u;
            });

        return Inertia::render('team/index', [
            'team' => $users,
        ]);
    }

    /**
     * Create a new staff / employee account (Admin only).
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can create employee accounts.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:4'],
            'role' => ['required', 'string', 'in:admin,employee,manager,project_manager,surveyor,cad_tech,viewer'],
            'department' => ['nullable', 'string', 'max:100'],
            'title' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'storage_limit_gb' => ['nullable', 'numeric', 'min:1', 'max:500'],
        ]);

        $normalizedRole = $validated['role'] === 'admin' ? 'admin' : 'employee';
        $quotaGb = (float) ($validated['storage_limit_gb'] ?? 500);

        $newUser = User::create([
            'name' => $validated['name'],
            'email' => trim($validated['email']),
            'password' => Hash::make($validated['password']),
            'role' => $normalizedRole,
            'department' => ($validated['department'] ?? null) ?: 'Land Surveying Operations',
            'title' => ($validated['title'] ?? null) ?: ($normalizedRole === 'admin' ? 'Administrator' : 'Staff / Survey Employee'),
            'phone' => $validated['phone'] ?? null,
            'storage_limit_bytes' => (int) ($quotaGb * 1073741824),
            'storage_used_bytes' => 0,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        Activity::log(
            action: 'created_employee_account',
            subjectName: $newUser->name,
            subjectType: 'User',
            subjectId: $newUser->id,
            details: ['email' => $newUser->email, 'role' => $newUser->role]
        );

        return back()->with('success', "Employee account '{$newUser->name}' ({$newUser->email}) created.");
    }

    /**
     * Update an employee account, credentials, or active status (Admin only).
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can update employee accounts.');

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:4'],
            'role' => ['required', 'string', 'in:admin,employee,manager,project_manager,surveyor,cad_tech,viewer'],
            'department' => ['nullable', 'string', 'max:100'],
            'title' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'storage_limit_gb' => ['nullable', 'numeric', 'min:1'],
            'is_active' => ['boolean'],
        ]);

        $normalizedRole = $validated['role'] === 'admin' ? 'admin' : 'employee';
        $isSelf = $user->id === $request->user()->id;

        $attributes = [
            'name' => $validated['name'] ?? $user->name,
            'email' => isset($validated['email']) ? trim($validated['email']) : $user->email,
            'role' => $isSelf ? 'admin' : $normalizedRole,
            'department' => $validated['department'] ?? $user->department,
            'title' => $validated['title'] ?? $user->title,
            'phone' => $validated['phone'] ?? $user->phone,
            'storage_limit_bytes' => isset($validated['storage_limit_gb'])
                ? (int) ($validated['storage_limit_gb'] * 1073741824)
                : $user->storage_limit_bytes,
            'is_active' => $isSelf ? true : $request->boolean('is_active', $user->is_active),
        ];

        if (! empty($validated['password'])) {
            $attributes['password'] = Hash::make($validated['password']);
        }

        $user->update($attributes);

        Activity::log(
            action: 'updated_employee_account',
            subjectName: $user->name,
            subjectType: 'User',
            subjectId: $user->id,
            details: ['role' => $user->role, 'is_active' => $user->is_active]
        );

        return back()->with('success', "Updated account for {$user->name}.");
    }

    /**
     * Enable or disable an employee account with 1 click (Admin only).
     */
    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can enable or disable accounts.');

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot disable your own administrator account.');
        }

        $newStatus = ! $user->is_active;
        $user->update(['is_active' => $newStatus]);

        Activity::log(
            action: $newStatus ? 'enabled_employee_account' : 'disabled_employee_account',
            subjectName: $user->name,
            subjectType: 'User',
            subjectId: $user->id,
            details: ['email' => $user->email, 'is_active' => $newStatus]
        );

        $statusLabel = $newStatus ? 'enabled' : 'disabled';

        return back()->with('success', "Account for {$user->name} has been {$statusLabel}.");
    }

    /**
     * Remove an employee account (Admin only).
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot delete your own administrator account.');
        }

        $name = $user->name;
        $user->delete();

        Activity::log(
            action: 'deleted_employee_account',
            subjectName: $name,
            subjectType: 'User'
        );

        return back()->with('success', "Account '{$name}' removed.");
    }
}
