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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('client_name');
            $table->string('location')->nullable();
            $table->string('survey_type', 100)->default('Boundary Survey');
            $table->string('status', 50)->default('planning'); // planning, field_work, processing, review, approved, archived
            $table->text('description')->nullable();
            $table->string('coordinate_system', 150)->nullable();
            $table->string('datum', 100)->nullable();
            $table->string('benchmark_ref', 150)->nullable();
            $table->date('start_date')->nullable();
            $table->date('target_date')->nullable();
            $table->boolean('is_confidential')->default(false);
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('root_folder_id')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
