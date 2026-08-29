<?php

/**
 * Record an important action in the VELOCE activity history.
 *
 * Logging must NEVER break the original operation.
 */
function logActivity(
    PDO $pdo,
    ?int $actorId,
    string $actorRole,
    string $action,
    string $entityType,
    ?int $entityId = null,
    ?string $description = null,
    ?array $oldValues = null,
    ?array $newValues = null,
    ?array $metadata = null
): void {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (
                actor_id,
                actor_role,
                action,
                entity_type,
                entity_id,
                description,
                old_values,
                new_values,
                metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $actorId,
            $actorRole,
            $action,
            $entityType,
            $entityId,
            $description,
            $oldValues !== null
                ? json_encode($oldValues, JSON_UNESCAPED_UNICODE)
                : null,
            $newValues !== null
                ? json_encode($newValues, JSON_UNESCAPED_UNICODE)
                : null,
            $metadata !== null
                ? json_encode($metadata, JSON_UNESCAPED_UNICODE)
                : null
        ]);

    } catch (Throwable $e) {
        // History logging must not stop the main website operation.
        error_log(
            'VELOCE Activity Log Error: ' . $e->getMessage()
        );
    }
}