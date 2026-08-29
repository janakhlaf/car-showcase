<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| GET ACTIVITY LOGS
|--------------------------------------------------------------------------
*/

if (
    $route === 'activity-logs'
    &&
    $method === 'GET'
) {
    $currentAdmin = admin();
    $adminId = (int)$currentAdmin['sub'];

$adminStatement = $pdo->prepare(
    'SELECT id, role
     FROM admin_users
     WHERE id = ?
     LIMIT 1'
);

$adminStatement->execute([$adminId]);

$adminUser = $adminStatement->fetch();

if (
    !$adminUser ||
    $adminUser['role'] !== 'super_admin'
) {
    fail(
        'Super Admin access required',
        403
    );
}
    

    $statement = $pdo->prepare(
        'SELECT
            id,
            actor_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            description,
            old_values,
            new_values,
            metadata,
            created_at
         FROM activity_logs
         ORDER BY id DESC'
    );

    $statement->execute();

    $logs = $statement->fetchAll();

    foreach ($logs as &$log) {
        $log['id'] =
            (int)$log['id'];

        $log['actor_id'] =
            $log['actor_id'] !== null
                ? (int)$log['actor_id']
                : null;

        $log['entity_id'] =
            $log['entity_id'] !== null
                ? (int)$log['entity_id']
                : null;

        $log['old_values'] =
            $log['old_values']
                ? json_decode(
                    $log['old_values'],
                    true
                )
                : null;

        $log['new_values'] =
            $log['new_values']
                ? json_decode(
                    $log['new_values'],
                    true
                )
                : null;

        $log['metadata'] =
            $log['metadata']
                ? json_decode(
                    $log['metadata'],
                    true
                )
                : null;
    }

    unset($log);

    out([
        'data' => $logs
    ]);
}