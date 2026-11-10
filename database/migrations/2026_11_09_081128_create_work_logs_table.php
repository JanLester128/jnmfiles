<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('work_logs', function (Blueprint $table) {
            $table->id();
            $table->string('work_type')->default('SCHEME')->index();
            $table->string('lot_no')->nullable();
            $table->string('location')->nullable();
            $table->string('owner')->nullable();
            $table->string('progress_status')->default('pending')->index();
            $table->date('plan_completed')->nullable();
            $table->string('survey_type')->default('RELOCATION')->index();
            $table->date('date_of_survey')->nullable();
            $table->string('dlsd_downloaded', 10)->default('No');
            $table->string('print_status', 30)->nullable()->index();
            $table->date('date_printed')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_logs');
    }
};
