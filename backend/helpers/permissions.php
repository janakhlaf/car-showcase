<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| REQUIRE PERMISSION
|--------------------------------------------------------------------------
*/

function requirePermission(
    PDO $pdo,
    string $permissionName
): array {
    $payload = admin();

    $adminId = (int)$payload['sub'];

    /*
     * Get current admin.
     */
    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            role,
            is_primary_admin,
            must_change_password
         FROM admin_users
         WHERE id = ?
         LIMIT 1'
    );

    $statement->execute([
        $adminId
    ]);

    $user = $statement->fetch();

    if (!$user) {
        fail(
            'Admin account not found',
            404
        );
    }

    /*
     * Primary Super Admin always has full access.
     */
    if (
        (int)$user['is_primary_admin'] === 1
    ) {
        return $user;
    }

    /*
     * Check role permission from database.
     */
    $permissionStatement =
        $pdo->prepare(
            'SELECT 1

             FROM roles r

             JOIN role_permissions rp
                ON rp.role_id = r.id

             JOIN permissions p
                ON p.id = rp.permission_id

             WHERE r.name = ?
               AND p.name = ?

             LIMIT 1'
        );

    $permissionStatement->execute([
        $user['role'],
        $permissionName
    ]);

    if (
        !$permissionStatement->fetchColumn()
    ) {
        fail(
            'You do not have permission to perform this action',
            403
        );
    }

    return $user;
}