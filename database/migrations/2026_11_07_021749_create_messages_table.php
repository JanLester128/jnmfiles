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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'last_seen_broadcast_at')) {
                $table->timestamp('last_seen_broadcast_at')->nullable()->after('is_active');
            }
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->boolean('is_broadcast')->default(false)->index();
            $table->text('body')->nullable();
            $table->foreignId('attached_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->foreignId('attached_folder_id')->nullable()->constrained('folders')->nullOnDelete();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['sender_id', 'recipient_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'last_seen_broadcast_at')) {
                $table->dropColumn('last_seen_broadcast_at');
            }
        });
    }
};
