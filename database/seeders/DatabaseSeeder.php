<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with only the default Administrator account (Email: Admin, Password: admin123).
     * Staff/employee accounts are created manually by the Administrator.
     */
    public function run(): void
    {
        Storage::disk('local')->deleteDirectory('files');

        // Remove any previously seeded default staff account
        User::where('email', 'Employee')
            ->where('name', 'Survey Staff')
            ->delete();

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
