<?php

namespace Database\Factories;

use App\Models\WorkLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkLog>
 */
class WorkLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'work_type' => fake()->randomElement(WorkLog::WORK_TYPES),
            'lot_no' => 'Lot '.fake()->numberBetween(100, 9999).'-A',
            'location' => fake()->city(),
            'owner' => fake()->name(),
            'progress_status' => fake()->randomElement(WorkLog::PROGRESS_STATUSES),
            'plan_completed' => fake()->date('Y-m-d'),
            'survey_type' => fake()->randomElement(WorkLog::SURVEY_TYPES),
            'date_of_survey' => fake()->date('Y-m-d'),
            'dlsd_downloaded' => fake()->randomElement(WorkLog::DLSD_OPTIONS),
        ];
    }
}
