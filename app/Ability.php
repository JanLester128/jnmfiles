<?php

namespace App;

/**
 * Granular permissions that can be granted on files, folders and projects.
 */
enum Ability: string
{
    case View = 'view';
    case Upload = 'upload';
    case Edit = 'edit';
    case Delete = 'delete';
    case Download = 'download';
    case Share = 'share';

    /**
     * Database column backing this ability on the access_permissions table.
     */
    public function column(): string
    {
        return 'can_'.$this->value;
    }

    /**
     * A permission set with every ability enabled.
     *
     * @return array<string, bool>
     */
    public static function all(): array
    {
        return self::set(...self::cases());
    }

    /**
     * Build a permission set where only the given abilities are enabled.
     *
     * @return array<string, bool>
     */
    public static function set(self ...$enabled): array
    {
        $permissions = [];

        foreach (self::cases() as $ability) {
            $permissions[$ability->value] = in_array($ability, $enabled, true);
        }

        return $permissions;
    }

    /**
     * Intersect two permission sets (an ability is kept only if both allow it).
     *
     * @param  array<string, bool>  $first
     * @param  array<string, bool>  $second
     * @return array<string, bool>
     */
    public static function intersect(array $first, array $second): array
    {
        $permissions = [];

        foreach (self::cases() as $ability) {
            $permissions[$ability->value] = ($first[$ability->value] ?? false) && ($second[$ability->value] ?? false);
        }

        return $permissions;
    }
}
