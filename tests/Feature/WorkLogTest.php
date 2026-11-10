<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_work_logs(): void
    {
        $response = $this->get(route('work-logs.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_view_work_logs_and_print_queue_pages(): void
    {
        $user = User::factory()->create();
        WorkLog::factory()->count(2)->create(['created_by' => $user->id]);

        $this->actingAs($user)->get(route('work-logs.index'))->assertOk();
        $this->actingAs($user)->get(route('work-logs.print-queue'))->assertOk();
    }

    public function test_admin_can_create_and_edit_columns_one_through_four_and_plan_completed_date(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $payload = [
            'work_type' => 'SCHEME',
            'lot_no' => 'Lot 123-A',
            'location' => 'Tagaytay City',
            'owner' => 'Juan Dela Cruz',
            'progress_status' => 'In progress',
            'plan_completed' => '2026-11-15',
            'survey_type' => 'SUBDIVISION',
            'date_of_survey' => '2026-11-10',
            'dlsd_downloaded' => 'Yes',
        ];

        $response = $this->actingAs($admin)->post(route('work-logs.store'), $payload);

        $response->assertRedirect();
        $workLog = WorkLog::firstOrFail();

        $this->assertSame('SCHEME', $workLog->work_type);
        $this->assertSame('Lot 123-A', $workLog->lot_no);
        $this->assertSame('Tagaytay City', $workLog->location);
        $this->assertSame('Juan Dela Cruz', $workLog->owner);
        $this->assertSame('2026-11-15', $workLog->plan_completed?->format('Y-m-d'));

        // Recorded columns 1-4 remain editable by Admin
        $updateResponse = $this->actingAs($admin)->put(route('work-logs.update', $workLog), [
            'work_type' => 'SURVEY RETURN',
            'lot_no' => 'Lot 999-B',
            'location' => 'Silang, Cavite',
            'owner' => 'Maria Santos',
        ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('work_logs', [
            'id' => $workLog->id,
            'work_type' => 'SURVEY RETURN',
            'lot_no' => 'Lot 999-B',
            'location' => 'Silang, Cavite',
            'owner' => 'Maria Santos',
        ]);
    }

    public function test_clicking_check_records_work_log_in_to_print_and_can_update_to_printed_with_date(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $workLog = WorkLog::factory()->create([
            'work_type' => 'SCHEME',
            'lot_no' => 'Lot 55-C',
            'print_status' => null,
            'date_printed' => null,
        ]);

        // Click Check action to send to TO PRINT / PRINTED list
        $sendResponse = $this->actingAs($user)->post(route('work-logs.send-to-print', $workLog));
        $sendResponse->assertRedirect();

        $this->assertDatabaseHas('work_logs', [
            'id' => $workLog->id,
            'print_status' => 'TO PRINT',
        ]);

        // Boss changes dropdown to PRINTED and sets DATE PRINTED
        $printUpdateResponse = $this->actingAs($user)->put(route('work-logs.update', $workLog), [
            'print_status' => 'PRINTED',
            'date_printed' => '2026-11-10',
        ]);
        $printUpdateResponse->assertRedirect();

        $workLog->refresh();
        $this->assertSame('PRINTED', $workLog->print_status);
        $this->assertSame('2026-11-10', $workLog->date_printed?->format('Y-m-d'));
    }
}
