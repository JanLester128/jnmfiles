<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_and_admin_can_send_and_receive_direct_messages(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $staff = User::factory()->create(['role' => 'employee', 'is_active' => true]);

        // Staff sends a message to Admin
        $response = $this->actingAs($staff)->postJson(route('messages.store'), [
            'recipient_id' => $admin->id,
            'body' => 'Hello Admin, the traverse computation file is ready.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message.body', 'Hello Admin, the traverse computation file is ready.')
            ->assertJsonPath('message.sender_id', $staff->id)
            ->assertJsonPath('message.recipient_id', $admin->id);

        // Admin checks unread count and thread
        $listResponse = $this->actingAs($admin)->getJson(route('messages.index'));
        $listResponse->assertOk()
            ->assertJsonPath('total_unread', 1);

        // Opening the thread with contact_id marks messages from that sender as read
        $threadResponse = $this->actingAs($admin)->getJson(route('messages.index', [
            'contact_id' => $staff->id,
        ]));

        $threadResponse->assertOk()
            ->assertJsonPath('total_unread', 0)
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('messages.0.body', 'Hello Admin, the traverse computation file is ready.');
    }

    public function test_staff_can_message_other_staff_members(): void
    {
        $staffOne = User::factory()->create(['role' => 'employee', 'is_active' => true]);
        $staffTwo = User::factory()->create(['role' => 'employee', 'is_active' => true]);

        $response = $this->actingAs($staffOne)->postJson(route('messages.store'), [
            'recipient_id' => $staffTwo->id,
            'body' => 'Did you upload the GNSS RINEX logs?',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('messages', [
            'sender_id' => $staffOne->id,
            'recipient_id' => $staffTwo->id,
            'body' => 'Did you upload the GNSS RINEX logs?',
        ]);
    }

    public function test_only_admin_can_send_broadcast_announcements(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $staff = User::factory()->create(['role' => 'employee', 'is_active' => true]);

        // Staff cannot broadcast
        $this->actingAs($staff)->postJson(route('messages.store'), [
            'is_broadcast' => true,
            'body' => 'Unauthorized broadcast',
        ])->assertForbidden();

        // Admin can broadcast
        $this->actingAs($admin)->postJson(route('messages.store'), [
            'is_broadcast' => true,
            'body' => 'System maintenance tonight at 10 PM.',
        ])->assertCreated()
            ->assertJsonPath('message.is_broadcast', true);

        // Staff sees unread broadcast
        $staffCheck = $this->actingAs($staff)->getJson(route('messages.index'));
        $staffCheck->assertOk()
            ->assertJsonPath('broadcast.unread_count', 1)
            ->assertJsonPath('total_unread', 1);

        // Staff opens broadcast channel -> marks broadcast as seen
        $staffOpenBroadcast = $this->actingAs($staff)->getJson(route('messages.index', [
            'channel' => 'broadcast',
        ]));
        $staffOpenBroadcast->assertOk()
            ->assertJsonPath('broadcast.unread_count', 0)
            ->assertJsonCount(1, 'messages');
    }

    public function test_users_can_attach_drive_files_and_folders_respecting_folder_locks(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $staff = User::factory()->create(['role' => 'employee', 'is_active' => true]);

        $openFolder = Folder::create([
            'name' => 'Field Surveys 2026',
            'is_locked' => false,
            'created_by' => $admin->id,
        ]);

        $lockedFolder = Folder::create([
            'name' => 'Confidential Contracts',
            'is_locked' => true,
            'lock_reason' => 'Executive Only',
            'locked_by' => $admin->id,
            'created_by' => $admin->id,
        ]);

        $publicFile = File::create([
            'folder_id' => $openFolder->id,
            'name' => 'lot_plan.dwg',
            'original_filename' => 'lot_plan.dwg',
            'file_path' => 'files/lot_plan.dwg',
            'disk' => 'local',
            'mime_type' => 'application/acad',
            'extension' => 'dwg',
            'size_bytes' => 2048,
            'current_version' => 1,
            'category' => 'cad',
            'created_by' => $staff->id,
        ]);

        $lockedFile = File::create([
            'folder_id' => $lockedFolder->id,
            'name' => 'secret_budget.pdf',
            'original_filename' => 'secret_budget.pdf',
            'file_path' => 'files/secret_budget.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => 4096,
            'current_version' => 1,
            'category' => 'document',
            'created_by' => $admin->id,
        ]);

        // Staff can attach an unlocked file
        $this->actingAs($staff)->postJson(route('messages.store'), [
            'recipient_id' => $admin->id,
            'attached_file_id' => $publicFile->id,
        ])->assertCreated()
            ->assertJsonPath('message.attached_file.name', 'lot_plan.dwg');

        // Staff cannot attach a locked folder or a file inside a locked folder
        $this->actingAs($staff)->postJson(route('messages.store'), [
            'recipient_id' => $admin->id,
            'attached_folder_id' => $lockedFolder->id,
        ])->assertForbidden();

        $this->actingAs($staff)->postJson(route('messages.store'), [
            'recipient_id' => $admin->id,
            'attached_file_id' => $lockedFile->id,
        ])->assertForbidden();

        // Drive items picker endpoint hides locked folders/files from staff
        $driveItemsResponse = $this->actingAs($staff)->getJson(route('messages.drive-items'));
        $driveItemsResponse->assertOk()
            ->assertJsonCount(1, 'files')
            ->assertJsonCount(1, 'folders')
            ->assertJsonPath('files.0.id', $publicFile->id)
            ->assertJsonPath('folders.0.id', $openFolder->id);
    }
}

