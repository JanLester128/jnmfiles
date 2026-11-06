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
            $table->string('role', 30)->default('surveyor')->after('email'); // admin, project_manager, surveyor, cad_tech, viewer
            $table->string('department', 100)->nullable()->after('role');
            $table->string('title', 100)->nullable()->after('department');
            $table->string('phone', 50)->nullable()->after('title');
            $table->string('avatar')->nullable()->after('phone');
            $table->unsignedBigInteger('storage_limit_bytes')->default(10737418240)->after('avatar'); // 10 GB default
            $table->unsignedBigInteger('storage_used_bytes')->default(0)->after('storage_limit_bytes');
            $table->boolean('is_active')->default(true)->after('storage_used_bytes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'department',
                'title',
                'phone',
                'avatar',
                'storage_limit_bytes',
                'storage_used_bytes',
                'is_active',
            ]);
        });
    }
};
