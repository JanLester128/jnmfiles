<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LibraryController extends Controller
{
    /**
     * Display centralized company documentation and standard engineering files.
     */
    public function index(Request $request): Response
    {
        $category = $request->query('category', 'all');

        $rootLibraryFolder = Folder::whereNull('project_id')
            ->whereNull('parent_id')
            ->where('category', 'library')
            ->first();

        $subfolders = Folder::whereNull('project_id')
            ->where('parent_id', $rootLibraryFolder?->id)
            ->withCount('files')
            ->get();

        $filesQuery = File::with(['creator:id,name', 'folder:id,name', 'tags'])
            ->whereNull('project_id')
            ->where('is_trashed', false);

        if ($category && $category !== 'all') {
            $filesQuery->where('category', $category);
        }

        $files = $filesQuery->latest()->get();

        return Inertia::render('library/index', [
            'rootFolder' => $rootLibraryFolder,
            'subfolders' => $subfolders,
            'files' => $files,
            'selectedCategory' => $category,
        ]);
    }
}
