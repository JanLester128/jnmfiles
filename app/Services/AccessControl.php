<?php

namespace App\Services;

use App\Ability;
use App\Models\AccessPermission;
use App\Models\Favorite;
use App\Models\File;
use App\Models\Folder;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Central permission resolver for files, folders and projects.
 *
 * Resolution order for a folder or file (first match wins):
 *  1. Administrators have full access to everything.
 *  2. Anything inside an admin-locked folder (at any depth) is hidden from non-admins.
 *  3. The creator (owner) of the item has full access.
 *  4. The nearest explicit grant (on the item itself, or inherited from the closest parent folder).
 *  5. Project-level access when the item belongs to a project (members / project leads only).
 *  6. Company-wide defaults for items outside projects, based on the user's role.
 *
 * Every lookup is cached for the lifetime of the request (the service is registered as scoped).
 */
class AccessControl
{
    /** @var array<int, object{id: int, parent_id: int|null, project_id: int|null, is_locked: bool, created_by: int|null}>|null */
    private ?array $folders = null;

    /** @var array<int, array<string, AccessPermission>> */
    private array $grants = [];

    /** @var array<int, array<int, string>> */
    private array $memberships = [];

    /** @var array<int, object{id: int, manager_id: int|null, created_by: int|null, status: string}|null>|null */
    private ?array $projects = null;

    /** @var array<string, array<string, bool>|null> */
    private array $memo = [];

    /** @var array<int, bool> */
    private array $lockedMemo = [];

    /**
     * Effective permissions on a folder, or null when the user cannot see it at all.
     *
     * @return array<string, bool>|null
     */
    public function folderPermissions(User $user, Folder|int $folder): ?array
    {
        $folderId = $folder instanceof Folder ? $folder->id : $folder;

        return $this->remember("folder:{$user->id}:{$folderId}", function () use ($user, $folderId): ?array {
            if ($user->isAdmin()) {
                return Ability::all();
            }

            $node = $this->folderNode($folderId);

            if ($node === null || $this->isInsideLockedFolder($folderId)) {
                return null;
            }

            if ($node->created_by === $user->id) {
                return Ability::all();
            }

            $grant = $this->nearestFolderGrant($user, $folderId);

            if ($grant !== null) {
                return $grant->toPermissionSet();
            }

            if ($node->project_id !== null) {
                return $this->projectPermissions($user, $node->project_id);
            }

            return $this->companyDefaults($user);
        });
    }

    /**
     * Effective permissions on a file, or null when the user cannot see it at all.
     *
     * @return array<string, bool>|null
     */
    public function filePermissions(User $user, File $file): ?array
    {
        return $this->remember("file:{$user->id}:{$file->id}", function () use ($user, $file): ?array {
            if ($user->isAdmin()) {
                return Ability::all();
            }

            if ($file->folder_id !== null && $this->isInsideLockedFolder($file->folder_id)) {
                return null;
            }

            if ($file->created_by === $user->id) {
                return Ability::all();
            }

            $grant = $this->grantsFor($user)['file:'.$file->id] ?? null;

            if ($grant !== null) {
                return $grant->toPermissionSet();
            }

            if ($file->folder_id !== null) {
                return $this->folderPermissions($user, $file->folder_id);
            }

            if ($file->project_id !== null) {
                return $this->projectPermissions($user, $file->project_id);
            }

            return $this->companyDefaults($user);
        });
    }

    /**
     * Effective permissions on a project's content, or null when the user is not part of it.
     *
     * @return array<string, bool>|null
     */
    public function projectPermissions(User $user, Project|int $project): ?array
    {
        $projectId = $project instanceof Project ? $project->id : $project;

        return $this->remember("project:{$user->id}:{$projectId}", function () use ($user, $projectId): ?array {
            if ($user->isAdmin()) {
                return Ability::all();
            }

            $node = $this->projectNode($projectId);

            if ($node === null) {
                return null;
            }

            if ($node->manager_id === $user->id || $node->created_by === $user->id) {
                return Ability::all();
            }

            if (! array_key_exists($projectId, $this->membershipsFor($user))) {
                return null;
            }

            $grant = $this->grantsFor($user)['project:'.$projectId] ?? null;
            $permissions = $grant?->toPermissionSet() ?? $this->defaultMemberPermissions($user);

            if ($node->status === 'archived') {
                $permissions = Ability::intersect($permissions, Ability::set(Ability::View, Ability::Download));
            }

            return $permissions;
        });
    }

    public function can(User $user, Ability $ability, File|Folder|Project $item): bool
    {
        $permissions = match (true) {
            $item instanceof File => $this->filePermissions($user, $item),
            $item instanceof Folder => $this->folderPermissions($user, $item),
            default => $this->projectPermissions($user, $item),
        };

        return (bool) ($permissions[$ability->value] ?? false);
    }

    /**
     * Whether the user may create folders and upload files at the top level of the drive.
     */
    public function canWriteToRoot(User $user): bool
    {
        return $user->isAdmin() || $user->isManager();
    }

    /**
     * Whether the user may upload into the given folder (or the drive root when null).
     */
    public function canUploadTo(User $user, ?int $folderId): bool
    {
        if ($folderId === null) {
            return $this->canWriteToRoot($user);
        }

        return $this->can($user, Ability::Upload, Folder::withTrashed()->findOrFail($folderId));
    }

    /**
     * Default permissions for content outside projects, by role.
     *
     * @return array<string, bool>
     */
    public function companyDefaults(User $user): array
    {
        if ($user->isAdmin() || $user->isManager()) {
            return Ability::all();
        }

        return Ability::set(Ability::View, Ability::Upload, Ability::Download);
    }

    /**
     * Default permissions for an assigned project member without an explicit project grant.
     *
     * @return array<string, bool>
     */
    public function defaultMemberPermissions(User $user): array
    {
        if ($user->isManager()) {
            return Ability::set(Ability::View, Ability::Upload, Ability::Edit, Ability::Download, Ability::Share);
        }

        return Ability::set(Ability::View, Ability::Upload, Ability::Download);
    }

    /**
     * IDs of all folders the user can see, or null when the user can see everything.
     *
     * @return array<int, int>|null
     */
    public function visibleFolderIds(User $user): ?array
    {
        if ($user->isAdmin()) {
            return null;
        }

        return array_values(array_filter(
            array_keys($this->allFolders()),
            fn (int $id): bool => $this->folderPermissions($user, $id) !== null,
        ));
    }

    /**
     * IDs of all projects the user can access, or null when the user can access everything.
     *
     * @return array<int, int>|null
     */
    public function visibleProjectIds(User $user): ?array
    {
        if ($user->isAdmin()) {
            return null;
        }

        return array_values(array_filter(
            array_keys($this->allProjects()),
            fn (int $id): bool => $this->projectPermissions($user, $id) !== null,
        ));
    }

    /**
     * Restrict a folder query to folders the user can see.
     *
     * @param  Builder<Folder>  $query
     * @return Builder<Folder>
     */
    public function scopeVisibleFolders(Builder $query, User $user): Builder
    {
        $visible = $this->visibleFolderIds($user);

        if ($visible !== null) {
            $query->whereIn('folders.id', $visible === [] ? [0] : $visible);
        }

        return $query;
    }

    /**
     * Restrict a file query to files the user can see.
     *
     * @param  Builder<File>  $query
     * @return Builder<File>
     */
    public function scopeVisibleFiles(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        $visibleFolders = $this->visibleFolderIds($user) ?: [0];
        $visibleProjects = $this->visibleProjectIds($user) ?: [0];
        $lockedFolders = $this->lockedFolderIds() ?: [0];
        $grantedFileIds = $this->grantedIds($user, 'file') ?: [0];

        return $query->where(function (Builder $visible) use ($user, $visibleFolders, $visibleProjects, $lockedFolders, $grantedFileIds): void {
            $visible->whereIn('files.folder_id', $visibleFolders)
                ->orWhere(function (Builder $root) use ($visibleProjects): void {
                    $root->whereNull('files.folder_id')->where(function (Builder $project) use ($visibleProjects): void {
                        $project->whereNull('files.project_id')->orWhereIn('files.project_id', $visibleProjects);
                    });
                })
                ->orWhere(function (Builder $direct) use ($user, $lockedFolders, $grantedFileIds): void {
                    $direct->where(function (Builder $owned) use ($user, $grantedFileIds): void {
                        $owned->where('files.created_by', $user->id)->orWhereIn('files.id', $grantedFileIds);
                    })->where(function (Builder $unlocked) use ($lockedFolders): void {
                        $unlocked->whereNull('files.folder_id')->orWhereNotIn('files.folder_id', $lockedFolders);
                    });
                });
        });
    }

    /**
     * Restrict a project query to projects the user can access.
     *
     * @param  Builder<Project>  $query
     * @return Builder<Project>
     */
    public function scopeVisibleProjects(Builder $query, User $user): Builder
    {
        $visible = $this->visibleProjectIds($user);

        if ($visible !== null) {
            $query->whereIn('projects.id', $visible === [] ? [0] : $visible);
        }

        return $query;
    }

    /**
     * Attach per-user `abilities` and `is_starred` attributes to models for the frontend.
     *
     * @template TModel of File|Folder
     *
     * @param  Collection<int, TModel>  $items
     * @return Collection<int, TModel>
     */
    public function decorate(Collection $items, User $user): Collection
    {
        if ($items->isEmpty()) {
            return $items;
        }

        $favorites = Favorite::where('user_id', $user->id)
            ->get(['favoritable_type', 'favoritable_id'])
            ->map(fn (Favorite $favorite): string => $favorite->favoritable_type.':'.$favorite->favoritable_id)
            ->flip();

        return $items->each(function (Model $item) use ($user, $favorites): void {
            $permissions = $item instanceof File
                ? $this->filePermissions($user, $item)
                : $this->folderPermissions($user, $item);

            $abilities = $permissions ?? Ability::set();
            $abilities['lock'] = $item instanceof Folder && $user->isAdmin();

            $item->setAttribute('abilities', $abilities);
            $item->setAttribute('is_starred', $favorites->has($item::class.':'.$item->getKey()));
        });
    }

    /**
     * IDs of the user's favorites of a given model class.
     *
     * @param  class-string<Model>  $class
     * @return array<int, int>
     */
    public function favoriteIds(User $user, string $class): array
    {
        return Favorite::where('user_id', $user->id)
            ->where('favoritable_type', $class)
            ->pluck('favoritable_id')
            ->all();
    }

    /**
     * IDs of items of the given kind ('file', 'folder', 'project') explicitly granted to the user.
     *
     * @return array<int, int>
     */
    public function grantedIds(User $user, string $kind): array
    {
        $ids = [];

        foreach ($this->grantsFor($user) as $key => $grant) {
            [$grantKind, $id] = explode(':', $key);

            if ($grantKind === $kind) {
                $ids[] = (int) $id;
            }
        }

        return $ids;
    }

    /**
     * IDs of every folder hidden from non-admins because it is (or sits inside) a locked folder.
     *
     * @return array<int, int>
     */
    public function lockedFolderIds(): array
    {
        return array_values(array_filter(
            array_keys($this->allFolders()),
            fn (int $id): bool => $this->isInsideLockedFolder($id),
        ));
    }

    public function isInsideLockedFolder(int $folderId): bool
    {
        if (! array_key_exists($folderId, $this->lockedMemo)) {
            $node = $this->folderNode($folderId);

            $this->lockedMemo[$folderId] = $node !== null
                && ($node->is_locked || ($node->parent_id !== null && $this->isInsideLockedFolder($node->parent_id)));
        }

        return $this->lockedMemo[$folderId];
    }

    /**
     * Clear cached lookups (call after changing grants, locks or memberships within a request).
     */
    public function flush(): void
    {
        $this->folders = null;
        $this->projects = null;
        $this->grants = [];
        $this->memberships = [];
        $this->memo = [];
        $this->lockedMemo = [];
    }

    private function nearestFolderGrant(User $user, int $folderId): ?AccessPermission
    {
        $grants = $this->grantsFor($user);
        $node = $this->folderNode($folderId);
        $visited = [];

        while ($node !== null && ! isset($visited[$node->id])) {
            $visited[$node->id] = true;

            if (isset($grants['folder:'.$node->id])) {
                return $grants['folder:'.$node->id];
            }

            $node = $node->parent_id !== null ? $this->folderNode($node->parent_id) : null;
        }

        return null;
    }

    /**
     * @param  callable(): (array<string, bool>|null)  $resolver
     * @return array<string, bool>|null
     */
    private function remember(string $key, callable $resolver): ?array
    {
        if (! array_key_exists($key, $this->memo)) {
            $this->memo[$key] = $resolver();
        }

        return $this->memo[$key];
    }

    /**
     * @return object{id: int, parent_id: int|null, project_id: int|null, is_locked: bool, created_by: int|null}|null
     */
    private function folderNode(int $folderId): ?object
    {
        return $this->allFolders()[$folderId] ?? null;
    }

    /**
     * @return array<int, object{id: int, parent_id: int|null, project_id: int|null, is_locked: bool, created_by: int|null}>
     */
    private function allFolders(): array
    {
        if ($this->folders === null) {
            $this->folders = Folder::withTrashed()
                ->toBase()
                ->get(['id', 'parent_id', 'project_id', 'is_locked', 'created_by'])
                ->mapWithKeys(fn (object $row): array => [(int) $row->id => (object) [
                    'id' => (int) $row->id,
                    'parent_id' => $row->parent_id !== null ? (int) $row->parent_id : null,
                    'project_id' => $row->project_id !== null ? (int) $row->project_id : null,
                    'is_locked' => (bool) $row->is_locked,
                    'created_by' => $row->created_by !== null ? (int) $row->created_by : null,
                ]])
                ->all();
        }

        return $this->folders;
    }

    /**
     * @return object{id: int, manager_id: int|null, created_by: int|null, status: string}|null
     */
    private function projectNode(int $projectId): ?object
    {
        return $this->allProjects()[$projectId] ?? null;
    }

    /**
     * Non-deleted projects keyed by ID.
     *
     * @return array<int, object{id: int, manager_id: int|null, created_by: int|null, status: string}>
     */
    private function allProjects(): array
    {
        if ($this->projects === null) {
            $this->projects = Project::query()
                ->toBase()
                ->whereNull('deleted_at')
                ->get(['id', 'manager_id', 'created_by', 'status'])
                ->mapWithKeys(fn (object $row): array => [(int) $row->id => (object) [
                    'id' => (int) $row->id,
                    'manager_id' => $row->manager_id !== null ? (int) $row->manager_id : null,
                    'created_by' => $row->created_by !== null ? (int) $row->created_by : null,
                    'status' => (string) $row->status,
                ]])
                ->all();
        }

        return $this->projects;
    }

    /**
     * The user's explicit grants keyed by "kind:id" (kind = file, folder or project).
     *
     * @return array<string, AccessPermission>
     */
    private function grantsFor(User $user): array
    {
        if (! isset($this->grants[$user->id])) {
            $kinds = [File::class => 'file', Folder::class => 'folder', Project::class => 'project'];

            $this->grants[$user->id] = AccessPermission::where('user_id', $user->id)
                ->get()
                ->filter(fn (AccessPermission $grant): bool => isset($kinds[$grant->permissionable_type]))
                ->mapWithKeys(fn (AccessPermission $grant): array => [
                    $kinds[$grant->permissionable_type].':'.$grant->permissionable_id => $grant,
                ])
                ->all();
        }

        return $this->grants[$user->id];
    }

    /**
     * Project IDs the user is assigned to, mapped to their project role label.
     *
     * @return array<int, string>
     */
    private function membershipsFor(User $user): array
    {
        if (! isset($this->memberships[$user->id])) {
            $this->memberships[$user->id] = ProjectMember::where('user_id', $user->id)
                ->pluck('role', 'project_id')
                ->mapWithKeys(fn (?string $role, int|string $projectId): array => [(int) $projectId => (string) $role])
                ->all();
        }

        return $this->memberships[$user->id];
    }
}
