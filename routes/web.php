<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DriveController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FileVersionController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

// Redirect root to dashboard (requires login)
Route::redirect('/', '/dashboard')->name('home');

// Public Shared Link Access (Token-based with optional password)
Route::match(['GET', 'POST'], '/s/{token}', [ShareController::class, 'publicAccess'])->name('share.public');
Route::get('/s/{token}/download', [ShareController::class, 'publicDownload'])->name('share.public.download');

// Authenticated Application Routes
Route::middleware(['auth'])->group(function () {
    // Dashboard & File Explorer
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/drive', [DriveController::class, 'index'])->name('drive.index');
    Route::post('/switch-role', [DashboardController::class, 'switchRole'])->name('switch-role');

    // Folders Management
    Route::post('/folders', [FolderController::class, 'store'])->name('folders.store');
    Route::put('/folders/{folder}', [FolderController::class, 'update'])->name('folders.update');
    Route::post('/folders/{folder}/lock', [FolderController::class, 'lock'])->name('folders.lock');
    Route::post('/folders/{folder}/unlock', [FolderController::class, 'unlock'])->name('folders.unlock');
    Route::get('/folders/{folder}/download', [FolderController::class, 'downloadZip'])->name('folders.download.zip');
    Route::post('/folders/{folder}/move', [FolderController::class, 'move'])->name('folders.move');
    Route::post('/folders/{folder}/copy', [FolderController::class, 'copy'])->name('folders.copy');
    Route::post('/folders/{folder}/star', [FolderController::class, 'toggleStar'])->name('folders.star');
    Route::delete('/folders/{folder}', [FolderController::class, 'trash'])->name('folders.trash');
    Route::post('/folders/{folder}/restore', [FolderController::class, 'restore'])->name('folders.restore');
    Route::delete('/folders/{folder}/force', [FolderController::class, 'forceDelete'])->name('folders.force-delete');

    // Files Operations
    Route::post('/files/upload', [FileController::class, 'upload'])->name('files.upload');
    Route::get('/files/{file}/download', [FileController::class, 'download'])->name('files.download');
    Route::get('/files/{file}/preview', [FileController::class, 'preview'])->name('files.preview');
    Route::put('/files/{file}', [FileController::class, 'update'])->name('files.update');
    Route::post('/files/{file}/move', [FileController::class, 'move'])->name('files.move');
    Route::post('/files/{file}/copy', [FileController::class, 'copy'])->name('files.copy');
    Route::post('/files/{file}/star', [FileController::class, 'toggleStar'])->name('files.star');
    Route::post('/files/{file}/lock', [FileController::class, 'lock'])->name('files.lock');
    Route::post('/files/{file}/unlock', [FileController::class, 'unlock'])->name('files.unlock');
    Route::delete('/files/{file}', [FileController::class, 'trash'])->name('files.trash');
    Route::post('/files/{file}/restore', [FileController::class, 'restore'])->name('files.restore');
    Route::delete('/files/{file}/force', [FileController::class, 'forceDelete'])->name('files.force-delete');

    // File Versions
    Route::get('/files/{file}/versions', [FileVersionController::class, 'index'])->name('files.versions.index');
    Route::post('/files/{file}/versions', [FileVersionController::class, 'store'])->name('files.versions.store');
    Route::get('/files/{file}/versions/{version}/download', [FileVersionController::class, 'download'])->name('files.versions.download');
    Route::post('/files/{file}/versions/{version}/restore', [FileVersionController::class, 'restore'])->name('files.versions.restore');

    // Projects
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
    Route::post('/projects/{project}/members', [ProjectController::class, 'addMember'])->name('projects.members.add');
    Route::delete('/projects/{project}/members/{user}', [ProjectController::class, 'removeMember'])->name('projects.members.remove');

    // Sharing
    Route::post('/shares', [ShareController::class, 'store'])->name('shares.store');
    Route::delete('/shares/{share}', [ShareController::class, 'destroy'])->name('shares.destroy');
    Route::get('/shared-with-me', [ShareController::class, 'sharedWithMe'])->name('shares.shared-with-me');

    // Library & Standards
    Route::get('/library', [LibraryController::class, 'index'])->name('library.index');

    // Team / Employee Account Management (Admin)
    Route::get('/team', [TeamController::class, 'index'])->name('team.index');
    Route::post('/team', [TeamController::class, 'store'])->name('team.store');
    Route::put('/team/{user}', [TeamController::class, 'update'])->name('team.update');
    Route::post('/team/{user}/toggle-status', [TeamController::class, 'toggleStatus'])->name('team.toggle-status');
    Route::delete('/team/{user}', [TeamController::class, 'destroy'])->name('team.destroy');

    // Activities & Audit
    Route::get('/activities', [ActivityController::class, 'index'])->name('activities.index');
});

require __DIR__.'/settings.php';
