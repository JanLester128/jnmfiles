<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('users')->where('role', 'project_manager')->update(['role' => 'manager']);
        DB::table('users')->whereNotIn('role', ['admin', 'manager'])->update(['role' => 'employee']);

        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 30)->default('employee')->change();
        });

        Schema::create('access_permissions', function (Blueprint $table) {
            $table->id();
            $table->morphs('permissionable');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('can_view')->default(true);
            $table->boolean('can_upload')->default(false);
            $table->boolean('can_edit')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->boolean('can_download')->default(false);
            $table->boolean('can_share')->default(false);
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['permissionable_type', 'permissionable_id', 'user_id'], 'access_permissions_unique');
        });

        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->morphs('favoritable');
            $table->timestamps();

            $table->unique(['user_id', 'favoritable_type', 'favoritable_id']);
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->json('value')->nullable();
            $table->timestamps();
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });

        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('favorites');
        Schema::dropIfExists('access_permissions');

        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 30)->default('surveyor')->change();
        });
    }
};
