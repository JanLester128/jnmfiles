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
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->nullable()->constrained('folders')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->string('original_filename');
            $table->string('file_path');
            $table->string('disk', 30)->default('local');
            $table->string('mime_type', 150)->default('application/octet-stream');
            $table->string('extension', 30)->default('');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->unsignedInteger('current_version')->default(1);
            $table->string('category', 50)->default('other')->index();
            $table->boolean('is_starred')->default(false)->index();
            $table->boolean('is_trashed')->default(false)->index();
            $table->timestamp('trashed_at')->nullable();
            $table->boolean('is_locked')->default(false)->index();
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->string('lock_note')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
