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
        Schema::table('folders', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('is_system');
            $table->string('lock_reason')->nullable()->after('is_locked');
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete()->after('lock_reason');
            $table->unsignedInteger('access_count')->default(0)->after('locked_by');
        });

        Schema::table('files', function (Blueprint $table) {
            $table->unsignedInteger('access_count')->default(0)->after('size_bytes');
            $table->timestamp('last_accessed_at')->nullable()->after('access_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('folders', function (Blueprint $table) {
            $table->dropForeign(['locked_by']);
            $table->dropColumn(['is_locked', 'lock_reason', 'locked_by', 'access_count']);
        });

        Schema::table('files', function (Blueprint $table) {
            $table->dropColumn(['access_count', 'last_accessed_at']);
        });
    }
};
