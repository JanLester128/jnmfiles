<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with the default Administrator account (Email: Admin, Password: admin123).
     */
    public function run(): void
    {
        Storage::disk('local')->deleteDirectory('files');

        User::updateOrCreate(
            ['email' => 'Admin'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'department' => 'Administration',
                'title' => 'System Administrator',
                'email_verified_at' => now(),
                'storage_limit_bytes' => 536870912000, // 500 GB
                'storage_used_bytes' => 0,
                'is_active' => true,
            ]
        );
    }
}
