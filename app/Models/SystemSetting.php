<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Key/value system configuration managed by administrators.
 *
 * @property string $key
 * @property mixed $value
 */
class SystemSetting extends Model
{
    public const DEFAULT_ALLOWED_EXTENSIONS = [
        'dlsd', 'xml',
        'dwg', 'dxf', 'dwt', 'dwf',
        'shp', 'shx', 'dbf', 'prj', 'kml', 'kmz', 'geojson', 'csv',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp',
        'zip', 'rar', '7z',
    ];

    /**
     * @var array<string, mixed>
     */
    public const DEFAULTS = [
        'allowed_extensions' => self::DEFAULT_ALLOWED_EXTENSIONS,
        'allow_unlisted_extensions' => false,
        'max_upload_mb' => 512,
        'public_links_enabled' => true,
        'default_storage_quota_gb' => 10,
    ];

    protected $fillable = [
        'key',
        'value',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'json',
        ];
    }

    /**
     * @var array<string, mixed>|null
     */
    private static ?array $cache = null;

    public static function get(string $key): mixed
    {
        return self::allSettings()[$key] ?? null;
    }

    public static function put(string $key, mixed $value): void
    {
        self::updateOrCreate(['key' => $key], ['value' => $value]);
        self::$cache = null;
    }

    /**
     * All settings merged over their defaults.
     *
     * @return array<string, mixed>
     */
    public static function allSettings(): array
    {
        if (self::$cache === null) {
            $stored = self::query()->pluck('value', 'key')->all();
            self::$cache = array_merge(self::DEFAULTS, $stored);
        }

        return self::$cache;
    }

    public static function flushCache(): void
    {
        self::$cache = null;
    }

    /**
     * @return array<int, string>
     */
    public static function allowedExtensions(): array
    {
        return array_values(array_map('strtolower', (array) self::get('allowed_extensions')));
    }

    public static function isExtensionAllowed(string $extension): bool
    {
        if ((bool) self::get('allow_unlisted_extensions')) {
            return true;
        }

        return in_array(strtolower($extension), self::allowedExtensions(), true);
    }

    public static function maxUploadKilobytes(): int
    {
        return max(1, (int) self::get('max_upload_mb')) * 1024;
    }
}
