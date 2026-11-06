<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\FileShare;
use App\Models\FileVersion;
use App\Models\Folder;
use App\Models\Project;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_cloud_drive(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($user)->get(route('drive.index'));

        $response->assertOk();
    }

    public function test_authenticated_user_can_upload_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create(['role' => 'surveyor']);
        $file = UploadedFile::fake()->create('boundary_traverse.dwg', 1024);

        $response = $this->actingAs($user)->post(route('files.upload'), [
            'files' => [$file],
            'coordinate_system' => 'WGS84 / UTM Zone 51N',
            'description' => 'Field traverse adjustment coordinates',
            'tags' => ['Raw GNSS', 'Topography'],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('files', [
            'name' => 'boundary_traverse.dwg',
            'extension' => 'dwg',
            'category' => 'cad',
            'current_version' => 1,
            'created_by' => $user->id,
        ]);

        $this->assertDatabaseHas('file_versions', [
            'version_number' => 1,
            'created_by' => $user->id,
        ]);

        $this->assertDatabaseHas('activities', [
            'action' => 'uploaded',
            'subject_name' => 'boundary_traverse.dwg',
        ]);
    }

    public function test_authenticated_user_can_download_file(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['role' => 'surveyor']);

        $storedPath = 'files/general/2026/11/test_coordinates.csv';
        Storage::disk('local')->put($storedPath, 'Point,Northing,Easting,Elevation\n1,1000,2000,50');

        $file = File::create([
            'name' => 'test_coordinates.csv',
            'original_filename' => 'test_coordinates.csv',
            'file_path' => $storedPath,
            'disk' => 'local',
            'mime_type' => 'text/csv',
            'extension' => 'csv',
            'size_bytes' => 100,
            'current_version' => 1,
            'category' => 'raw_survey',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('files.download', $file));

        $response->assertOk();
        $response->assertDownload('test_coordinates.csv');

        $this->assertDatabaseHas('activities', [
            'action' => 'downloaded',
            'subject_name' => 'test_coordinates.csv',
        ]);
    }

    public function test_authenticated_user_can_upload_new_file_version(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['role' => 'cad_tech']);

        $storedPath = 'files/general/2026/11/alignment.dxf';
        Storage::disk('local')->put($storedPath, 'DXF V1 Content');

        $file = File::create([
            'name' => 'alignment.dxf',
            'original_filename' => 'alignment.dxf',
            'file_path' => $storedPath,
            'disk' => 'local',
            'mime_type' => 'application/dxf',
            'extension' => 'dxf',
            'size_bytes' => 100,
            'current_version' => 1,
            'category' => 'cad',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        FileVersion::create([
            'file_id' => $file->id,
            'version_number' => 1,
            'file_path' => $storedPath,
            'disk' => 'local',
            'size_bytes' => 100,
            'changelog' => 'Initial upload',
            'created_by' => $user->id,
        ]);

        $revisionFile = UploadedFile::fake()->create('alignment_rev2.dxf', 200);

        $response = $this->actingAs($user)->post(route('files.versions.store', $file), [
            'revision_file' => $revisionFile,
            'changelog' => 'Incorporated DPWH interchange ramp tangent changes',
        ]);

        $response->assertRedirect();

        $file->refresh();
        $this->assertEquals(2, $file->current_version);

        $this->assertDatabaseHas('file_versions', [
            'file_id' => $file->id,
            'version_number' => 2,
            'changelog' => 'Incorporated DPWH interchange ramp tangent changes',
        ]);

        $this->assertDatabaseHas('activities', [
            'action' => 'version_created',
            'subject_name' => 'alignment.dxf',
        ]);
    }

    public function test_file_checkout_lock_and_unlock(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $employee = User::factory()->create(['role' => 'surveyor']);

        $file = File::create([
            'name' => 'Plat_Map.dwg',
            'original_filename' => 'Plat_Map.dwg',
            'file_path' => 'files/plat.dwg',
            'disk' => 'local',
            'mime_type' => 'application/acad',
            'extension' => 'dwg',
            'size_bytes' => 500,
            'current_version' => 1,
            'category' => 'cad',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        // Employee cannot lock file
        $this->actingAs($employee)->post(route('files.lock', $file))->assertForbidden();

        // Admin locks file
        $response = $this->actingAs($admin)->post(route('files.lock', $file), [
            'lock_note' => 'Editing lot 14 boundary coordinates',
        ]);

        $response->assertRedirect();
        $file->refresh();
        $this->assertTrue($file->is_locked);
        $this->assertEquals($admin->id, $file->locked_by);
        $this->assertEquals('Editing lot 14 boundary coordinates', $file->lock_note);

        // Employee cannot download or preview locked file (LOCKED BY ADMIN)
        $this->actingAs($employee)->get(route('files.download', $file))->assertForbidden();
        $this->actingAs($employee)->get(route('files.preview', $file))->assertForbidden();

        // Admin unlocks file
        $response = $this->actingAs($admin)->post(route('files.unlock', $file));
        $response->assertRedirect();
        $file->refresh();
        $this->assertFalse($file->is_locked);
        $this->assertNull($file->locked_by);
    }

    public function test_project_creation_auto_scaffolds_six_survey_subfolders(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($user)->post(route('projects.store'), [
            'code' => 'PRJ-2026-999',
            'name' => 'Hillcrest Ridge Boundary Relocation',
            'client_name' => 'Hillcrest Estates',
            'location' => 'Sector 7B',
            'survey_type' => 'Boundary Survey',
            'status' => 'planning',
            'coordinate_system' => 'WGS84 / UTM Zone 51N',
            'datum' => 'Mean Sea Level (MSL)',
            'benchmark_ref' => 'BM-99',
        ]);

        $project = Project::where('code', 'PRJ-2026-999')->first();
        $this->assertNotNull($project);
        $response->assertRedirect(route('projects.show', $project));

        // Verify standard folders were auto-scaffolded
        $this->assertDatabaseHas('folders', ['project_id' => $project->id, 'name' => '01_Field_Raw_Data']);
        $this->assertDatabaseHas('folders', ['project_id' => $project->id, 'name' => '02_CAD_and_Drawings']);
        $this->assertDatabaseHas('folders', ['project_id' => $project->id, 'name' => '03_GIS_and_LiDAR']);
        $this->assertDatabaseHas('folders', ['project_id' => $project->id, 'name' => '04_Photos_and_Inspection']);
        $this->assertDatabaseHas('folders', ['project_id' => $project->id, 'name' => '05_Client_Deliverables']);
        $this->assertDatabaseHas('folders', ['project_id' => $project->id, 'name' => '06_Legal_and_Permits']);

        $this->assertEquals(7, Folder::where('project_id', $project->id)->count()); // root + 6 standard subfolders
    }

    public function test_public_share_link_generation_and_access(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $file = File::create([
            'name' => 'Certified_Plat_Record.pdf',
            'original_filename' => 'Certified_Plat_Record.pdf',
            'file_path' => 'files/plat.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => 1024,
            'current_version' => 1,
            'category' => 'document',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        // Create public share
        $response = $this->actingAs($user)->post(route('shares.store'), [
            'shareable_type' => 'file',
            'shareable_id' => $file->id,
            'share_type' => 'public',
            'permission' => 'download',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('file_shares', [
            'shareable_id' => $file->id,
            'permission' => 'download',
        ]);

        $share = FileShare::where('shareable_id', $file->id)->first();
        $this->assertNotNull($share->share_token);

        // Access public link as guest (unauthenticated)
        $publicResponse = $this->get(route('share.public', ['token' => $share->share_token]));
        $publicResponse->assertOk();
    }

    public function test_admin_can_login_with_default_admin_credentials_and_update_email_and_password(): void
    {
        $this->seed(DatabaseSeeder::class);

        // Wrong email returns "Incorrect email."
        $wrongEmailResponse = $this->post('/login', [
            'email' => 'nonexistent@jnm.local',
            'password' => 'admin123',
        ]);
        $wrongEmailResponse->assertSessionHasErrors(['email' => 'Incorrect email.']);
        $this->assertGuest();

        // Wrong password returns "Incorrect password."
        $wrongPasswordResponse = $this->post('/login', [
            'email' => 'Admin',
            'password' => 'wrongpass',
        ]);
        $wrongPasswordResponse->assertSessionHasErrors(['password' => 'Incorrect password.']);
        $this->assertGuest();

        $loginResponse = $this->post('/login', [
            'email' => 'Admin',
            'password' => 'admin123',
        ]);

        $loginResponse->assertRedirect('/dashboard');
        $this->assertAuthenticated();

        $admin = User::where('email', 'Admin')->firstOrFail();

        // Admin updates their login email and password
        $updateResponse = $this->actingAs($admin)->patch(route('profile.update'), [
            'name' => 'Administrator Updated',
            'email' => 'admin@jnm.local',
            'password' => 'newadmin456',
            'password_confirmation' => 'newadmin456',
        ]);

        $updateResponse->assertRedirect(route('profile.edit'));
        $admin->refresh();
        $this->assertEquals('admin@jnm.local', $admin->email);
        $this->assertTrue(Hash::check('newadmin456', $admin->password));
    }

    public function test_admin_can_create_and_disable_employee_account(): void
    {
        $admin = User::factory()->create([
            'email' => 'Admin',
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Admin creates an employee account
        $createResponse = $this->actingAs($admin)->post(route('team.store'), [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan.surveyor',
            'password' => 'staff1234',
            'role' => 'surveyor',
            'job_title' => 'Geodetic Staff',
            'department' => 'Field Survey',
        ]);

        $createResponse->assertRedirect();
        $employee = User::where('email', 'juan.surveyor')->firstOrFail();
        $this->assertTrue($employee->is_active);
        $this->assertFalse($employee->isAdmin());

        // Employee cannot access Admin Team Management
        $this->actingAs($employee)->get(route('team.index'))->assertForbidden();

        // Employee can log in and change their own password in Account Settings
        $this->actingAs($employee)->patch(route('profile.update'), [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan.surveyor',
            'password' => 'mynewpass789',
            'password_confirmation' => 'mynewpass789',
        ])->assertRedirect(route('profile.edit'));

        $employee->refresh();
        $this->assertTrue(Hash::check('mynewpass789', $employee->password));

        // Admin disables the employee account
        $toggleResponse = $this->actingAs($admin)->post(route('team.toggle-status', $employee));
        $toggleResponse->assertRedirect();

        $employee->refresh();
        $this->assertFalse($employee->is_active);

        // Disabled employee is immediately logged out and redirected to login when accessing dashboard
        $dashboardResponse = $this->actingAs($employee)->get(route('dashboard'));
        $dashboardResponse->assertRedirect(route('login'));
        $this->assertGuest();

        // Disabled employee cannot log in even with their correct password
        $failedLogin = $this->post('/login', [
            'email' => 'juan.surveyor',
            'password' => 'mynewpass789',
        ]);
        $failedLogin->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_locked_folder_blocks_employee_from_opening_uploading_or_downloading_files(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $employee = User::factory()->create(['role' => 'surveyor', 'is_active' => true]);

        $folder = Folder::create([
            'name' => 'Confidential Lot Data',
            'is_locked' => false,
            'created_by' => $admin->id,
        ]);

        $storedPath = 'files/general/2026/11/lot_plan.dlsd';
        Storage::disk('local')->put($storedPath, 'DLSD SURVEY DATA');

        $fileInFolder = File::create([
            'name' => 'lot_plan.dlsd',
            'original_filename' => 'lot_plan.dlsd',
            'file_path' => $storedPath,
            'disk' => 'local',
            'mime_type' => 'application/octet-stream',
            'extension' => 'dlsd',
            'size_bytes' => 512,
            'current_version' => 1,
            'folder_id' => $folder->id,
            'category' => 'dlsd',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        // Employee CANNOT lock folders
        $this->actingAs($employee)->post(route('folders.lock', $folder))->assertForbidden();

        // Admin locks the folder
        $lockResponse = $this->actingAs($admin)->post(route('folders.lock', $folder));
        $lockResponse->assertRedirect();
        $folder->refresh();
        $this->assertTrue($folder->is_locked);

        // Employee CANNOT open the locked folder in My Files (/drive?folder_id=...)
        $openResponse = $this->actingAs($employee)->get(route('drive.index', ['folder_id' => $folder->id]));
        $openResponse->assertRedirect(route('drive.index'));
        $openResponse->assertSessionHas('error');

        // Employee CANNOT create a subfolder inside the locked folder
        $subfolderResponse = $this->actingAs($employee)->post(route('folders.store'), [
            'name' => 'Unauthorized Subfolder',
            'parent_id' => $folder->id,
        ]);
        $subfolderResponse->assertSessionHas('error');
        $this->assertDatabaseMissing('folders', ['name' => 'Unauthorized Subfolder']);

        // Employee CANNOT upload a file into the locked folder
        $uploadResponse = $this->actingAs($employee)->post(route('files.upload'), [
            'files' => [UploadedFile::fake()->create('survey.xml', 100)],
            'folder_id' => $folder->id,
        ]);
        $uploadResponse->assertSessionHas('error');
        $this->assertDatabaseMissing('files', ['name' => 'survey.xml']);

        // Employee CANNOT download a file inside the locked folder
        $downloadResponse = $this->actingAs($employee)->get(route('files.download', $fileInFolder));
        $downloadResponse->assertForbidden();

        // Admin CAN open the locked folder and download the file
        $this->actingAs($admin)->get(route('drive.index', ['folder_id' => $folder->id]))->assertOk();
        $this->actingAs($admin)->get(route('files.download', $fileInFolder))->assertOk();

        // Admin unlocks the folder, and Employee can now open it
        $this->actingAs($admin)->post(route('folders.unlock', $folder))->assertRedirect();
        $folder->refresh();
        $this->assertFalse($folder->is_locked);
        $this->actingAs($employee)->get(route('drive.index', ['folder_id' => $folder->id]))->assertOk();
    }

    public function test_staff_theme_appearance_only_affects_their_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'appearance' => 'light']);
        $staff = User::factory()->create(['role' => 'employee', 'appearance' => 'light']);

        // Staff updates their theme to dark
        $this->actingAs($staff)->patch(route('appearance.update'), [
            'appearance' => 'dark',
        ])->assertRedirect();

        $staff->refresh();
        $admin->refresh();

        $this->assertEquals('dark', $staff->appearance);
        $this->assertEquals('light', $admin->appearance);
    }

    public function test_move_file_and_locked_by_admin_counts_are_accurate(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $employee = User::factory()->create(['role' => 'employee']);

        $openFolder = Folder::create([
            'name' => 'Open Survey Folder',
            'is_locked' => false,
            'created_by' => $admin->id,
        ]);

        $lockedFolder = Folder::create([
            'name' => 'Locked Admin Folder',
            'is_locked' => true,
            'locked_by' => $admin->id,
            'created_by' => $admin->id,
        ]);

        $lockedFile = File::create([
            'name' => 'Restricted_Boundary.dwg',
            'original_filename' => 'Restricted_Boundary.dwg',
            'file_path' => 'files/restricted.dwg',
            'disk' => 'local',
            'mime_type' => 'application/acad',
            'extension' => 'dwg',
            'size_bytes' => 1024,
            'current_version' => 1,
            'category' => 'cad',
            'is_locked' => true,
            'locked_by' => $admin->id,
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        $openFile = File::create([
            'name' => 'Open_Field_Notes.xml',
            'original_filename' => 'Open_Field_Notes.xml',
            'file_path' => 'files/open.xml',
            'disk' => 'local',
            'mime_type' => 'application/xml',
            'extension' => 'xml',
            'size_bytes' => 512,
            'current_version' => 1,
            'category' => 'xml',
            'is_locked' => false,
            'created_by' => $employee->id,
            'updated_by' => $employee->id,
        ]);

        // Employee cannot move an open file into a locked folder
        $this->actingAs($employee)->post(route('files.move', $openFile), [
            'folder_id' => $lockedFolder->id,
        ])->assertSessionHas('error');
        $this->assertNull($openFile->fresh()->folder_id);

        // Employee CAN move an open file into the unlocked folder
        $this->actingAs($employee)->post(route('files.move', $openFile), [
            'folder_id' => $openFolder->id,
        ])->assertSessionHas('success');
        $this->assertEquals($openFolder->id, $openFile->fresh()->folder_id);

        // Verify Dashboard Locked by Admin statistics
        $dashboardResponse = $this->actingAs($employee)->get(route('dashboard'));
        $dashboardResponse->assertOk();
        $stats = $dashboardResponse->viewData('page')['props']['stats'];
        $this->assertEquals(1, $stats['locked_folders']);
        $this->assertEquals(1, $stats['locked_files']);
        $this->assertEquals(2, $stats['locked_by_admin']);
        $this->assertEquals(1, $stats['unlocked_folders']);

        // Verify My Files root page returns all accessible files (including files inside unlocked folders)
        $driveResponse = $this->actingAs($employee)->get(route('drive.index'));
        $driveResponse->assertOk();
        $driveFiles = $driveResponse->viewData('page')['props']['files'];
        $this->assertCount(2, $driveFiles);
    }
}
