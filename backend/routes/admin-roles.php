<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| GET ALL ROLES WITH PERMISSIONS
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/roles'
    &&
    $method === 'GET'
) {
    superAdmin($pdo);

    $rolesStatement = $pdo->query(
        'SELECT
            id,
            name,
            label,
            is_system AS isSystem,
            created_at AS createdAt
         FROM roles
         ORDER BY id ASC'
    );

    $roles = $rolesStatement->fetchAll();

    $permissionsStatement = $pdo->query(
        'SELECT
            id,
            name,
            label,
            category,
            created_at AS createdAt
         FROM permissions
         ORDER BY category, id'
    );

    $permissions = $permissionsStatement->fetchAll();

    $relations = $pdo->query(
        'SELECT
            role_id AS roleId,
            permission_id AS permissionId
         FROM role_permissions'
    )->fetchAll();

    foreach ($roles as &$role) {
        $role['id'] = (int)$role['id'];
        $role['isSystem'] = (bool)$role['isSystem'];

        $rolePermissionIds = [];

        foreach ($relations as $relation) {
            if (
                (int)$relation['roleId']
                ===
                $role['id']
            ) {
                $rolePermissionIds[] =
                    (int)$relation['permissionId'];
            }
        }

        $role['permissionIds'] =
            $rolePermissionIds;
    }

    unset($role);

    foreach ($permissions as &$permission) {
        $permission['id'] =
            (int)$permission['id'];
    }

    unset($permission);

    out([
        'roles' => $roles,
        'permissions' => $permissions
    ]);
}


/*
|--------------------------------------------------------------------------
| UPDATE ROLE PERMISSIONS
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/roles/(\d+)/permissions$#',
        $route,
        $matches
    )
    &&
    $method === 'PUT'
) {
    superAdmin($pdo);

    $roleId =
        (int)$matches[1];

    $b = body();

    $permissionIds =
        isset($b['permissionIds'])
        &&
        is_array($b['permissionIds'])
            ? $b['permissionIds']
            : [];

    $roleStatement =
        $pdo->prepare(
            'SELECT
                id,
                name,
                is_system
             FROM roles
             WHERE id = ?
             LIMIT 1'
        );

    $roleStatement->execute([
        $roleId
    ]);

    $role =
        $roleStatement->fetch();

    if (!$role) {
        fail(
            'Role not found',
            404
        );
    }

    /*
     * System role is locked.
     * Super Admin permissions cannot be changed.
     */
    if (
        (int)$role['is_system'] === 1
    ) {
        fail(
            'System role permissions cannot be changed',
            403
        );
    }

    $permissionIds =
        array_values(
            array_unique(
                array_map(
                    'intval',
                    $permissionIds
                )
            )
        );

    if (!empty($permissionIds)) {
        $placeholders =
            implode(
                ',',
                array_fill(
                    0,
                    count($permissionIds),
                    '?'
                )
            );

        $checkStatement =
            $pdo->prepare(
                "SELECT COUNT(*)
                 FROM permissions
                 WHERE id IN ($placeholders)"
            );

        $checkStatement->execute(
            $permissionIds
        );

        $validCount =
            (int)$checkStatement
                ->fetchColumn();

        if (
            $validCount
            !==
            count($permissionIds)
        ) {
            fail(
                'One or more permissions are invalid',
                422
            );
        }
    }

    $pdo->beginTransaction();

    try {
        $deleteStatement =
            $pdo->prepare(
                'DELETE FROM role_permissions
                 WHERE role_id = ?'
            );

        $deleteStatement->execute([
            $roleId
        ]);

        if (!empty($permissionIds)) {
            $insertStatement =
                $pdo->prepare(
                    'INSERT INTO role_permissions
                        (role_id, permission_id)
                     VALUES (?, ?)'
                );

            foreach (
                $permissionIds
                as $permissionId
            ) {
                $insertStatement->execute([
                    $roleId,
                    $permissionId
                ]);
            }
        }

        $pdo->commit();

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        fail(
            'Could not update role permissions',
            500
        );
    }

    out([
        'roleId' =>
            $roleId,

        'permissionIds' =>
            $permissionIds
    ]);
}