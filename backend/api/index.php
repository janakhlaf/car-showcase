<?php

declare(strict_types=1);
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/mailer.php';


header('Content-Type: application/json; charset=utf-8');


/* =========================================================
   CORS
========================================================= */

$origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173';

if (
    in_array(
        $origin,
        [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ],
        true
    )
) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}


/* =========================================================
   HELPERS
========================================================= */

function out($data = null, int $status = 200): never
{
    http_response_code($status);

    echo json_encode(
        ['data' => $data],
        JSON_UNESCAPED_SLASHES
    );

    exit;
}


function fail(string $message, int $status = 400): never
{
    http_response_code($status);

    echo json_encode([
        'error' => $message
    ]);

    exit;
}


function body(): array
{
    $raw = file_get_contents('php://input');

    $value = json_decode(
        $raw ?: '{}',
        true
    );

    return is_array($value)
        ? $value
        : [];
}

/*
|--------------------------------------------------------------------------
| DELETE LOCAL UPLOAD
|--------------------------------------------------------------------------
*/

function deleteLocalUpload(?string $url): void
{
    if (!$url) {
        return;
    }

    $imagePrefix =
        'http://localhost/car-storage/images/';

    $modelPrefix =
        'http://localhost/car-storage/models/';

    $baseDir = null;

    if (str_starts_with($url, $imagePrefix)) {
        $baseDir =
            realpath(
                'C:/xampp/htdocs/car-storage/images'
            );
    }

    elseif (str_starts_with($url, $modelPrefix)) {
        $baseDir =
            realpath(
                'C:/xampp/htdocs/car-storage/models'
            );
    }

    else {
        // رابط خارجي أو غير تابع لتخزيننا
        return;
    }

    if ($baseDir === false) {
        return;
    }

    $filename =
        basename(
            parse_url(
                $url,
                PHP_URL_PATH
            )
        );

    if ($filename === '') {
        return;
    }

    $filePath =
        $baseDir
        . DIRECTORY_SEPARATOR
        . $filename;

    $realFile =
        realpath(
            $filePath
        );

    if (
        $realFile === false
        ||
        !str_starts_with(
            $realFile,
            $baseDir . DIRECTORY_SEPARATOR
        )
    ) {
        return;
    }

    if (is_file($realFile)) {
        unlink($realFile);
    }
}


/*
|--------------------------------------------------------------------------
| GET BEARER TOKEN
|--------------------------------------------------------------------------
*/

function getBearerToken(): string
{
    $authHeader = '';

    /*
    |--------------------------------------------------------------------------
    | GET AUTHORIZATION HEADER
    |--------------------------------------------------------------------------
    */

    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    elseif (function_exists('getallheaders')) {

        $headers = getallheaders();

        foreach ($headers as $name => $value) {

            if (strtolower($name) === 'authorization') {
                $authHeader = $value;
                break;
            }
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK BEARER
    |--------------------------------------------------------------------------
    */

    if (
        $authHeader === ''
        ||
        !preg_match(
            '/^Bearer\s+(.+)$/i',
            $authHeader,
            $matches
        )
    ) {
        throw new RuntimeException(
            'Missing access token'
        );
    }


    $token = trim($matches[1]);

    if ($token === '') {
        throw new RuntimeException(
            'Missing access token'
        );
    }

    return $token;
}


/*
|--------------------------------------------------------------------------
| ADMIN AUTH
|--------------------------------------------------------------------------
*/

function admin(): array
{
    try {

        $token = getBearerToken();

        return verifyAccessToken(
            $token
        );

    } catch (Throwable $e) {

        fail($e->getMessage(), 401);
    }
}

function superAdmin(PDO $pdo): array
{
    $payload = admin();

    $adminId = (int)$payload['sub'];

    $statement = $pdo->prepare(
        'SELECT id, name, email, role, must_change_password
         FROM admin_users
         WHERE id = ?
         LIMIT 1'
    );

    $statement->execute([$adminId]);

    $user = $statement->fetch();

    if (!$user) {
        fail('Admin account not found', 404);
    }

    if ($user['role'] !== 'super_admin') {
        fail('Super admin permission required', 403);
    }

    return $user;
}

/*
|--------------------------------------------------------------------------
| REQUIRE ADMIN ROLE
|--------------------------------------------------------------------------
*/

function requireAdminRole(
    PDO $pdo,
    array $allowedRoles
): array {
    $payload = admin();

    $adminId = (int)$payload['sub'];

    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            role,
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

    if (
        !in_array(
            $user['role'],
            $allowedRoles,
            true
        )
    ) {
        fail(
            'You do not have permission to perform this action',
            403
        );
    }

    return $user;
}


/*
 * Converts DB fields into frontend-friendly values.
 */
function carRow(array $row): array
{
    $row['id'] = (int)$row['id'];
    $row['brandId'] = (int)$row['brandId'];
    $row['year'] = (int)$row['year'];
    $row['price'] = (int)$row['price'];
    $row['featured'] = (bool)$row['featured'];

    $row['images'] =
        json_decode(
            $row['images'] ?: '[]',
            true
        ) ?: [];

    $row['specs'] =
        json_decode(
            $row['specs'] ?: '{}',
            true
        ) ?: [];

    $row['features'] =
        json_decode(
            $row['features'] ?: '[]',
            true
        ) ?: [];

    return $row;
}


/* =========================================================
   ROUTE
========================================================= */

$route = trim(
    $_GET['route'] ?? '',
    '/'
);

$method =
    $_SERVER['REQUEST_METHOD'];

$pdo = db();

require_once __DIR__ . '/../routes/admin-roles.php';
require_once __DIR__ . '/../routes/site-settings.php';
require_once __DIR__ . '/../routes/auth.php';
require_once __DIR__ . '/../routes/test-drives.php';


/* =========================================================
   HEALTH
========================================================= */

if (
    $route === 'health'
) {
    out([
        'status' => 'ok'
    ]);
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

if (
    $route === 'admin/login'
    &&
    $method === 'POST'
) {
    
    $b = body();

    $statement =
        $pdo->prepare(
            'SELECT *
             FROM admin_users
             WHERE email = ?
             LIMIT 1'
        );

    $statement->execute([
        $b['email'] ?? ''
    ]);

    $user =
        $statement->fetch();


    if (
        !$user
        ||
        !password_verify(
            $b['password'] ?? '',
            $user['password_hash']
        )
    ) {
        fail(
            'Invalid email or password',
            401
        );
    }


    $admin = [
    'id' => (int)$user['id'],
    'name' => $user['name'],
    'email' => $user['email'],
    'role' => $user['role'],
    'mustChangePassword' => (bool)$user['must_change_password'],
];

    $accessToken = createAccessToken($admin);

$refresh = createRefreshToken();

$refreshStatement = $pdo->prepare(
    'INSERT INTO refresh_tokens
     (admin_id, token_hash, expires_at)
     VALUES (?, ?, ?)'
);

$refreshStatement->execute([
    $admin['id'],
    $refresh['tokenHash'],
    $refresh['expiresAt']
]);

out([
    'admin' => $admin,
    'accessToken' => $accessToken,
    'refreshToken' => $refresh['token'],
    'tokenType' => 'Bearer',
    'expiresIn' => JWT_ACCESS_TTL
]);
}
/* =========================================================
   ADMIN REFRESH TOKEN
========================================================= */

if (
    $route === 'admin/refresh'
    &&
    $method === 'POST'
) {
    $b = body();

    /*
    |--------------------------------------------------------------------------
    | GET REFRESH TOKEN
    |--------------------------------------------------------------------------
    */

    $refreshToken = trim(
        $b['refreshToken'] ?? ''
    );

    if ($refreshToken === '') {
        fail(
            'Refresh token is required',
            401
        );
    }


    /*
    |--------------------------------------------------------------------------
    | HASH RECEIVED REFRESH TOKEN
    |--------------------------------------------------------------------------
    */

    $tokenHash = hash(
        'sha256',
        $refreshToken
    );


    /*
    |--------------------------------------------------------------------------
    | FIND REFRESH TOKEN IN DATABASE
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
    'SELECT
        rt.admin_id,
        rt.expires_at,
        au.id,
        au.name,
        au.email,
        au.role,
        au.must_change_password

     FROM refresh_tokens rt

     JOIN admin_users au
        ON au.id = rt.admin_id

     WHERE rt.token_hash = ?
     AND rt.revoked = 0

     LIMIT 1'
);

    $statement->execute([
        $tokenHash
    ]);

    $row = $statement->fetch();


    /*
    |--------------------------------------------------------------------------
    | CHECK TOKEN EXISTS
    |--------------------------------------------------------------------------
    */

    if (!$row) {
        fail(
            'Invalid refresh token',
            401
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK EXPIRATION
    |--------------------------------------------------------------------------
    */

    if (
        strtotime($row['expires_at'])
        <= time()
    ) {
        fail(
            'Refresh token expired',
            401
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE ADMIN DATA
    |--------------------------------------------------------------------------
    */

    $admin = [
    'id' => (int)$row['id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'role' => $row['role'],
    'mustChangePassword' => (bool)$row['must_change_password']
];


    /*
    |--------------------------------------------------------------------------
    | CREATE NEW ACCESS TOKEN
    |--------------------------------------------------------------------------
    */

    $newAccessToken =
        createAccessToken(
            $admin
        );


    /*
    |--------------------------------------------------------------------------
    | RETURN NEW ACCESS TOKEN
    |--------------------------------------------------------------------------
    */

    out([
        'accessToken' =>
            $newAccessToken,

        'tokenType' =>
            'Bearer',

        'expiresIn' =>
            JWT_ACCESS_TTL
    ]);
}

/* =========================================================
   ADMIN LOGOUT
========================================================= */

/* =========================================================
   ADMIN LOGOUT
========================================================= */

if (
    $route === 'admin/logout'
    &&
    $method === 'POST'
) {
    $b = body();

    // Get refresh token sent from frontend
    $refreshToken = trim(
        $b['refreshToken'] ?? ''
    );

    if ($refreshToken === '') {
        fail(
            'Refresh token is required',
            400
        );
    }

    // Create the same hash stored in database
    $tokenHash = hash(
        'sha256',
        $refreshToken
    );

    // Revoke this refresh token only
    $statement = $pdo->prepare(
        'UPDATE refresh_tokens
         SET revoked = 1
         WHERE token_hash = ?
           AND revoked = 0'
    );

    $statement->execute([
        $tokenHash
    ]);

    out([
        'success' => true
    ]);
}


/* =========================================================
   ADMIN SESSION
========================================================= */

if (
    $route === 'admin/me'
    &&
    $method === 'GET'
) {
    $payload = admin();

    $adminId = (int)$payload['sub'];

    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            role,
            is_primary_admin AS isPrimaryAdmin,
            must_change_password AS mustChangePassword,
            created_at AS createdAt
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
     * Get permissions for the current admin.
     *
     * Primary Super Admin always has every permission.
     */
    if (
        (int)$user['isPrimaryAdmin'] === 1
    ) {
        $permissionStatement =
            $pdo->query(
                'SELECT name
                 FROM permissions
                 ORDER BY id'
            );

        $permissions =
            $permissionStatement->fetchAll(
                PDO::FETCH_COLUMN
            );
    }

    else {
        $permissionStatement =
            $pdo->prepare(
                'SELECT p.name

                 FROM roles r

                 JOIN role_permissions rp
                    ON rp.role_id = r.id

                 JOIN permissions p
                    ON p.id = rp.permission_id

                 WHERE r.name = ?

                 ORDER BY p.id'
            );

        $permissionStatement->execute([
            $user['role']
        ]);

        $permissions =
            $permissionStatement->fetchAll(
                PDO::FETCH_COLUMN
            );
    }


    out([
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],

        'isPrimaryAdmin' =>
            (bool)$user['isPrimaryAdmin'],

        'permissions' =>
            $permissions,

        'mustChangePassword' =>
            (bool)$user['mustChangePassword'],

        'createdAt' =>
            $user['createdAt']
    ]);
}

/* =========================================================
   ADMIN CHANGE PASSWORD
========================================================= */

if (
    $route === 'admin/change-password'
    &&
    $method === 'POST'
) {
    $payload = admin();

    $adminId = (int)$payload['sub'];

    $b = body();

    $currentPassword =
        (string)($b['currentPassword'] ?? '');

    $newPassword =
        (string)($b['newPassword'] ?? '');

    $confirmPassword =
        (string)($b['confirmPassword'] ?? '');


    if ($currentPassword === '') {
        fail(
            'Current password is required',
            422
        );
    }


    if (strlen($newPassword) < 8) {
        fail(
            'New password must be at least 8 characters',
            422
        );
    }


    if ($newPassword !== $confirmPassword) {
        fail(
            'New passwords do not match',
            422
        );
    }


    $statement = $pdo->prepare(
        'SELECT password_hash
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


    if (
        !password_verify(
            $currentPassword,
            $user['password_hash']
        )
    ) {
        fail(
            'Current password is incorrect',
            401
        );
    }


    $newPasswordHash =
        password_hash(
            $newPassword,
            PASSWORD_DEFAULT
        );


    if ($newPasswordHash === false) {
        fail(
            'Could not secure new password',
            500
        );
    }


    $updateStatement = $pdo->prepare(
        'UPDATE admin_users
         SET
            password_hash = ?,
            must_change_password = 0
         WHERE id = ?'
    );

    $updateStatement->execute([
        $newPasswordHash,
        $adminId
    ]);


    /*
     * Cancel old refresh sessions after password change.
     */
    $revokeStatement = $pdo->prepare(
        'UPDATE refresh_tokens
         SET revoked = 1
         WHERE admin_id = ?
           AND revoked = 0'
    );

    $revokeStatement->execute([
        $adminId
    ]);


    out([
        'success' => true,
        'mustChangePassword' => false
    ]);
}

/* =========================================================
   ADMIN USERS
========================================================= */


/*
|--------------------------------------------------------------------------
| GET ALL ADMIN USERS
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/users'
    &&
    $method === 'GET'
) {
    superAdmin($pdo);

    $statement = $pdo->query(
        'SELECT
    id,
    name,
    email,
    role,
    is_primary_admin AS isPrimaryAdmin,
    must_change_password AS mustChangePassword,
    created_at AS createdAt
FROM admin_users'
    );

    $users = $statement->fetchAll();

    foreach ($users as &$user) {
        $user['id'] = (int)$user['id'];
        $user['mustChangePassword'] =
            (bool)$user['mustChangePassword'];
        $user['isPrimaryAdmin'] =
            (bool)$user['isPrimaryAdmin'];    
    }

    unset($user);

    out($users);
}


/*
|--------------------------------------------------------------------------
| CREATE ADMIN USER
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/users'
    &&
    $method === 'POST'
) {
    superAdmin($pdo);

    $b = body();

    $name = trim(
        (string)($b['name'] ?? '')
    );

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $password =
        (string)($b['password'] ?? '');

    $role =
        (string)($b['role'] ?? 'editor_admin');


    // Name
    if ($name === '') {
        fail('Name is required', 422);
    }


    // Email
    if (
        $email === ''
        ||
        !filter_var(
            $email,
            FILTER_VALIDATE_EMAIL
        )
    ) {
        fail('Valid email is required', 422);
    }


    // Temporary password
    if (strlen($password) < 8) {
        fail(
            'Temporary password must be at least 8 characters',
            422
        );
    }


    // Allowed roles
    $allowedRoles = [
        'super_admin',
        'manage_admin',
        'editor_admin'
    ];

    if (
        !in_array(
            $role,
            $allowedRoles,
            true
        )
    ) {
        fail('Invalid admin role', 422);
    }


    // Duplicate email
    $checkStatement = $pdo->prepare(
        'SELECT id
         FROM admin_users
         WHERE email = ?
         LIMIT 1'
    );

    $checkStatement->execute([$email]);

    if ($checkStatement->fetch()) {
        fail(
            'An admin with this email already exists',
            409
        );
    }


    // Hash temporary password
    $passwordHash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    if ($passwordHash === false) {
        fail('Could not secure password', 500);
    }


    // Every NEW admin must change password
    $statement = $pdo->prepare(
        'INSERT INTO admin_users
        (
            name,
            email,
            role,
            password_hash,
            must_change_password
        )
        VALUES (?, ?, ?, ?, 1)'
    );

    $statement->execute([
        $name,
        $email,
        $role,
        $passwordHash
    ]);


    out(
        [
            'id' => (int)$pdo->lastInsertId(),
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'mustChangePassword' => true
        ],
        201
    );
}

/*
|--------------------------------------------------------------------------
| UPDATE ADMIN ROLE
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/users/(\d+)/role$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {
    $currentAdmin = superAdmin($pdo);

    $targetId = (int)$matches[1];

    $b = body();

    $newRole =
        (string)($b['role'] ?? '');

    $allowedRoles = [
        'super_admin',
        'manage_admin',
        'editor_admin'
    ];

    if (
        !in_array(
            $newRole,
            $allowedRoles,
            true
        )
    ) {
        fail(
            'Invalid admin role',
            422
        );
    }

    // Super Admin cannot change their own role
    if (
        $targetId ===
        (int)$currentAdmin['id']
    ) {
        fail(
            'You cannot change your own role',
            422
        );
    }

    $statement = $pdo->prepare(
    'SELECT
        id,
        name,
        email,
        role,
        is_primary_admin
     FROM admin_users
     WHERE id = ?
     LIMIT 1'
);

    $statement->execute([
        $targetId
    ]);

    $target = $statement->fetch();

    if (!$target) {
        fail(
            'Admin account not found',
            404
        );
    }

    /*
 * The primary Super Admin role is permanent.
 */
if (
    (int)$target['is_primary_admin'] === 1
) {
    fail(
        'The primary Super Admin role cannot be changed',
        403
    );
}

    // Don't demote the last Super Admin
    if (
        $target['role'] === 'super_admin'
        &&
        $newRole !== 'super_admin'
    ) {
        $superAdminCount =
            (int)$pdo
                ->query(
                    "SELECT COUNT(*)
                     FROM admin_users
                     WHERE role = 'super_admin'"
                )
                ->fetchColumn();

        if ($superAdminCount <= 1) {
            fail(
                'The last super admin cannot be demoted',
                422
            );
        }
    }

    $updateStatement =
        $pdo->prepare(
            'UPDATE admin_users
             SET role = ?
             WHERE id = ?'
        );

    $updateStatement->execute([
        $newRole,
        $targetId
    ]);

    // Revoke sessions of changed admin
    $revokeStatement =
        $pdo->prepare(
            'UPDATE refresh_tokens
             SET revoked = 1
             WHERE admin_id = ?
               AND revoked = 0'
        );

    $revokeStatement->execute([
        $targetId
    ]);

    out([
        'id' => $targetId,
        'role' => $newRole
    ]);
}

if (
    preg_match(
        '#^admin/users/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'DELETE'
) {
    $currentAdmin =
        superAdmin($pdo);

    $deleteId =
        (int)$matches[1];


    // ما بخلي الأدمن يحذف نفسه
    if (
        $deleteId ===
        (int)$currentAdmin['id']
    ) {
        fail(
            'You cannot delete your own account',
            422
        );
    }


    $statement = $pdo->prepare(
    'SELECT
        id,
        role,
        is_primary_admin
     FROM admin_users
     WHERE id = ?
     LIMIT 1'
);

    $statement->execute([
        $deleteId
    ]);

    $target =
        $statement->fetch();

    if (!$target) {
        fail(
            'Admin account not found',
            404
        );
    }
    if (
    (int)$target['is_primary_admin'] === 1
) {
    fail(
        'The primary Super Admin cannot be deleted',
        403
    );
}


    /*
     * إذا الحساب المراد حذفه Super Admin،
     * نتأكد أنه مش آخر Super Admin.
     */
    if (
        $target['role'] ===
        'super_admin'
    ) {
        $superAdminCount =
            (int)$pdo
                ->query(
                    "SELECT COUNT(*)
                     FROM admin_users
                     WHERE role = 'super_admin'"
                )
                ->fetchColumn();

        if ($superAdminCount <= 1) {
            fail(
                'The last super admin cannot be deleted',
                422
            );
        }
    }


    // نحذف refresh tokens تبع الحساب أولاً
    $tokenStatement =
        $pdo->prepare(
            'DELETE FROM refresh_tokens
             WHERE admin_id = ?'
        );

    $tokenStatement->execute([
        $deleteId
    ]);


    // نحذف الحساب
    $deleteStatement =
        $pdo->prepare(
            'DELETE FROM admin_users
             WHERE id = ?'
        );

    $deleteStatement->execute([
        $deleteId
    ]);


    out([
        'success' => true
    ]);
}

/* =========================================================
   BRANDS
========================================================= */

if (
    $route === 'brands'
    &&
    $method === 'GET'
) {
    out(
        $pdo
            ->query(
                'SELECT
                    id,
                    name,
                    created_at AS createdAt
                 FROM brands
                 ORDER BY name'
            )
            ->fetchAll()
    );
}


if (
    $route === 'brands'
    &&
    $method === 'POST'
) {
    admin();

    $b = body();

    $name =
        trim(
            $b['name']
            ?? ''
        );


    if (!$name) {
        fail(
            'Brand name is required'
        );
    }


    $statement =
        $pdo->prepare(
            'INSERT INTO brands(name)
             VALUES(?)'
        );

    $statement->execute([
        $name
    ]);


    out(
        [
            'id' =>
                (int)$pdo->lastInsertId(),

            'name' =>
                $name,
        ],
        201
    );
}


/* =========================================================
   STATS
========================================================= */

if (
    $route === 'stats'
    &&
    $method === 'GET'
) {
    $cars =
        (int)$pdo
            ->query(
                'SELECT COUNT(*)
                 FROM cars'
            )
            ->fetchColumn();


    $brands =
        (int)$pdo
            ->query(
                'SELECT COUNT(*)
                 FROM brands'
            )
            ->fetchColumn();


    $rows =
        $pdo
            ->query(
                'SELECT
                    specs,
                    color
                 FROM cars'
            )
            ->fetchAll();


    $horsepower = 0;

    $colors = [];


    foreach ($rows as $row) {
        $specs =
            json_decode(
                $row['specs']
                ?: '{}',
                true
            );

        $horsepower +=
            (int)(
                $specs['horsepower']
                ?? 0
            );

        $colors[
            $row['color']
        ] = 1;
    }


    out([
        'carCount' =>
            $cars,

        'brandCount' =>
            $brands,

        'totalHorsepower' =>
            $horsepower,

        'paintShades' =>
            count($colors),
    ]);
}


/* =========================================================
   CARS META
========================================================= */

if (
    $route === 'cars/meta'
    &&
    $method === 'GET'
) {
    $brands =
        $pdo
            ->query(
                'SELECT
                    id,
                    name
                 FROM brands
                 ORDER BY name'
            )
            ->fetchAll();


    $colors =
    $pdo
        ->query(
            'SELECT
                color_name AS color,
                MIN(color_hex) AS colorHex
             FROM car_variants
             WHERE color_name IS NOT NULL
               AND color_name <> \'\'
             GROUP BY color_name
             ORDER BY color_name'
        )
        ->fetchAll();


    $years =
        $pdo
            ->query(
                'SELECT DISTINCT year
                 FROM cars
                 ORDER BY year DESC'
            )
            ->fetchAll(
                PDO::FETCH_COLUMN
            );


    $range =
        $pdo
            ->query(
                'SELECT
                    MIN(price) AS min,
                    MAX(price) AS max
                 FROM cars'
            )
            ->fetch();


    out([
        'brands' =>
            $brands,

        'colors' =>
            $colors,

        'years' =>
            array_map(
                'intval',
                $years
            ),

        'price' => [
            'min' =>
                (int)(
                    $range['min']
                    ?? 0
                ),

            'max' =>
                (int)(
                    $range['max']
                    ?? 0
                ),
        ],
    ]);
}


/* =========================================================
   GET ALL CARS
========================================================= */

if (
    $route === 'cars'
    &&
    $method === 'GET'
) {
    $where = [];

    $args = [];


    if (
        !empty($_GET['search'])
        ||
        !empty($_GET['q'])
    ) {
        $where[] =
            '(c.name LIKE ? OR b.name LIKE ?)';

        $q =
            '%' .
            (
                $_GET['search']
                ??
                $_GET['q']
            ) .
            '%';

        $args[] = $q;
        $args[] = $q;
    }


    if (
        !empty($_GET['brand'])
        ||
        !empty($_GET['brandId'])
    ) {
        $where[] =
            'c.brand_id = ?';

        $args[] =
            (int)(
                $_GET['brand']
                ??
                $_GET['brandId']
            );
    }


    /*
     * Important:
     * Filter color using default variant if available.
     */
    if (
    !empty($_GET['color'])
) {
    $where[] = '
        EXISTS (
            SELECT 1
            FROM car_variants cv
            WHERE cv.car_id = c.id
              AND cv.color_name = ?
        )
    ';

    $args[] =
        $_GET['color'];
}

    if (
        !empty($_GET['year'])
    ) {
        $where[] =
            'c.year = ?';

        $args[] =
            (int)$_GET['year'];
    }


    if (
        isset($_GET['featured'])
    ) {
        $where[] =
            'c.featured = ?';

        $args[] =
            (int)$_GET['featured'];
    }


    if (
        !empty($_GET['minPrice'])
    ) {
        $where[] =
            'c.price >= ?';

        $args[] =
            (int)$_GET['minPrice'];
    }


    if (
        !empty($_GET['maxPrice'])
    ) {
        $where[] =
            'c.price <= ?';

        $args[] =
            (int)$_GET['maxPrice'];
    }


    $order =
        'c.featured DESC,
         c.created_at DESC';


    if (
        ($_GET['sort'] ?? '')
        ===
        'price-asc'
    ) {
        $order =
            'c.price ASC';
    }


    if (
        ($_GET['sort'] ?? '')
        ===
        'price-desc'
    ) {
        $order =
            'c.price DESC';
    }


    if (
        ($_GET['sort'] ?? '')
        ===
        'year-desc'
    ) {
        $order =
            'c.year DESC';
    }


    $limit =
        max(
            1,
            min(
                200,
                (int)(
                    $_GET['limit']
                    ?? 50
                )
            )
        );


    /*
     * LEFT JOIN default variant.
     *
     * If a default variant exists:
     *
     * thumbnail = variant thumbnail
     * color     = variant color
     * colorHex  = variant hex
     * modelPath = variant model
     *
     * Otherwise fall back to cars table.
     */

    $sql = '
        SELECT

            c.id,

            c.name,

            c.brand_id
                AS brandId,

            b.name
                AS brandName,

            c.year,

            c.price,


            COALESCE(
                v.color_name,
                c.color
            )
                AS color,


            COALESCE(
                v.color_hex,
                c.color_hex
            )
                AS colorHex,


            c.description,


            COALESCE(
                v.thumbnail_url,
                c.thumbnail
            )
                AS thumbnail,


            c.images,


            COALESCE(
                v.model_url,
                c.model_path
            )
                AS modelPath,


            c.featured,

            c.specs,

            c.features,

            c.created_at
                AS createdAt


        FROM cars c


        JOIN brands b
            ON b.id = c.brand_id


        LEFT JOIN car_variants v

            ON v.car_id = c.id

            AND v.is_default = 1
    ';


    if ($where) {
        $sql .=
            ' WHERE ' .
            implode(
                ' AND ',
                $where
            );
    }


    $sql .=
        ' ORDER BY ' .
        $order;


    $sql .=
        ' LIMIT ' .
        $limit;


    $statement =
        $pdo->prepare(
            $sql
        );


    $statement->execute(
        $args
    );


    $rows =
        array_map(
            'carRow',
            $statement->fetchAll()
        );


    http_response_code(
        200
    );


    echo json_encode(
        [
            'data' =>
                $rows,

            'count' =>
                count($rows),
        ],
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


/* =========================================================
   SINGLE CAR
========================================================= */

if (
    preg_match(
        '#^cars/(\d+)$#',
        $route,
        $matches
    )
) {
    $id =
        (int)$matches[1];


    /* -----------------------------------------------------
       GET SINGLE CAR
    ----------------------------------------------------- */

    if (
        $method === 'GET'
    ) {
        /*
         * Same default-variant logic as GET /cars.
         */

        $statement =
            $pdo->prepare(
                '
                SELECT

                    c.id,

                    c.name,

                    c.brand_id
                        AS brandId,

                    b.name
                        AS brandName,

                    c.year,

                    c.price,


                    COALESCE(
                        v.color_name,
                        c.color
                    )
                        AS color,


                    COALESCE(
                        v.color_hex,
                        c.color_hex
                    )
                        AS colorHex,


                    c.description,


                    COALESCE(
                        v.thumbnail_url,
                        c.thumbnail
                    )
                        AS thumbnail,


                    c.images,



                    COALESCE(
                        v.model_url,
                        c.model_path
                    )
                        AS modelPath,


                    c.featured,

                    c.specs,

                    c.features,

                    c.created_at
                        AS createdAt


                FROM cars c


                JOIN brands b
                    ON b.id = c.brand_id


                LEFT JOIN car_variants v

                    ON v.car_id = c.id

                    AND v.is_default = 1


                WHERE c.id = ?


                LIMIT 1
                '
            );


        $statement->execute([
            $id
        ]);


        $row =
            $statement->fetch();


        if (!$row) {
            fail(
                'Car not found',
                404
            );
        }


        out(
            carRow(
                $row
            )
        );
    }


    /* -----------------------------------------------------
   DELETE CAR
----------------------------------------------------- */

if (
    $method === 'DELETE'
) {
    requirePermission(
    $pdo,
    'cars.delete'
);

    /*
     * Get current car files before deleting DB rows.
     */

    $carStatement = $pdo->prepare(
        'SELECT
            thumbnail,
            images,
            model_path
         FROM cars
         WHERE id = ?
         LIMIT 1'
    );

    $carStatement->execute([
        $id
    ]);

    $carFiles =
        $carStatement->fetch();

    if (!$carFiles) {
        fail(
            'Car not found',
            404
        );
    }


    /*
     * Get variant files too.
     */

    $variantFilesStatement =
        $pdo->prepare(
            'SELECT
                thumbnail_url,
                model_url
             FROM car_variants
             WHERE car_id = ?'
        );

    $variantFilesStatement->execute([
        $id
    ]);

    $variantFiles =
        $variantFilesStatement->fetchAll();


    /*
     * Delete DB rows.
     */

    $pdo->beginTransaction();

    try {

        $variantDelete =
            $pdo->prepare(
                'DELETE FROM car_variants
                 WHERE car_id = ?'
            );

        $variantDelete->execute([
            $id
        ]);


        $carDelete =
            $pdo->prepare(
                'DELETE FROM cars
                 WHERE id = ?'
            );

        $carDelete->execute([
            $id
        ]);


        $pdo->commit();

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        fail(
            'Could not delete car',
            500
        );
    }


    /*
     * Delete local physical files after DB delete succeeded.
     */

    deleteLocalUpload(
        $carFiles['thumbnail'] ?? null
    );

    $images =
        json_decode(
            $carFiles['images'] ?? '[]',
            true
        );

    if (is_array($images)) {
        foreach ($images as $image) {
            deleteLocalUpload(
                is_string($image)
                    ? $image
                    : null
            );
        }
    }

    deleteLocalUpload(
        $carFiles['model_path'] ?? null
    );


    foreach ($variantFiles as $variantFile) {
        deleteLocalUpload(
            $variantFile['thumbnail_url']
            ?? null
        );

        deleteLocalUpload(
            $variantFile['model_url']
            ?? null
        );
    }


    out(true);
}


    /* -----------------------------------------------------
   UPDATE CAR
----------------------------------------------------- */

if (
    $method === 'PUT'
) {
    requirePermission(
    $pdo,
    'cars.edit'
);

    $b = body();


    /*
     * Variants.
     */

    $variants =
        isset($b['variants'])
        &&
        is_array($b['variants'])
            ? $b['variants']
            : [];


    if (
        count($variants) === 0
    ) {
        fail(
            'At least one color variant is required',
            422
        );
    }


    $defaultVariants =
        array_filter(
            $variants,
            fn ($variant) =>
                !empty(
                    $variant['isDefault']
                )
        );


    if (
        count(
            $defaultVariants
        ) !== 1
    ) {
        fail(
            'Exactly one default color is required',
            422
        );
    }


    foreach (
        $variants
        as $variant
    ) {

        $colorName =
            trim(
                (string)(
                    $variant['colorName']
                    ?? ''
                )
            );

        $colorHex =
            trim(
                (string)(
                    $variant['colorHex']
                    ?? ''
                )
            );

        $thumbnailUrl =
            trim(
                (string)(
                    $variant['thumbnailUrl']
                    ?? ''
                )
            );

        $modelUrl =
            trim(
                (string)(
                    $variant['modelUrl']
                    ?? ''
                )
            );


        if (
            $colorName === ''
        ) {
            fail(
                'Variant color name is required',
                422
            );
        }


        if (
            !preg_match(
                '/^#[0-9a-fA-F]{6}$/',
                $colorHex
            )
        ) {
            fail(
                'Invalid variant color hex',
                422
            );
        }


        if (
            $thumbnailUrl === ''
        ) {
            fail(
                'Variant image is required',
                422
            );
        }


        if (
            $modelUrl === ''
        ) {
            fail(
                'Variant 3D model is required',
                422
            );
        }
    }


    /*
     * New gallery.
     */

    $newImages =
        isset($b['images'])
        &&
        is_array($b['images'])
            ? $b['images']
            : [];



    /*
     * Current car files.
     */

    $oldStatement =
        $pdo->prepare(
            '
            SELECT
                thumbnail,
                images,
                model_path

            FROM cars

            WHERE id = ?

            LIMIT 1
            '
        );


    $oldStatement->execute([
        $id
    ]);


    $oldCar =
        $oldStatement->fetch();


    if (
        !$oldCar
    ) {
        fail(
            'Car not found',
            404
        );
    }


    /*
     * Current variant files.
     */

    $oldVariantsStatement =
        $pdo->prepare(
            '
            SELECT
                thumbnail_url,
                model_url

            FROM car_variants

            WHERE car_id = ?
            '
        );


    $oldVariantsStatement
        ->execute([
            $id
        ]);


    $oldVariants =
        $oldVariantsStatement
            ->fetchAll();


    /*
     * Collect old physical files.
     */

    $oldFiles = [];


    $oldImages =
        json_decode(
            $oldCar['images']
                ?? '[]',
            true
        );


    if (
        !is_array(
            $oldImages
        )
    ) {
        $oldImages = [];
    }


    if (
        !empty(
            $oldCar['thumbnail']
        )
    ) {
        $oldFiles[] =
            $oldCar['thumbnail'];
    }


    foreach (
        $oldImages
        as $image
    ) {
        if (
            is_string($image)
            &&
            $image !== ''
        ) {
            $oldFiles[] =
                $image;
        }
    }


    if (
        !empty(
            $oldCar['model_path']
        )
    ) {
        $oldFiles[] =
            $oldCar['model_path'];
    }


    foreach (
        $oldVariants
        as $oldVariant
    ) {

        if (
            !empty(
                $oldVariant[
                    'thumbnail_url'
                ]
            )
        ) {
            $oldFiles[] =
                $oldVariant[
                    'thumbnail_url'
                ];
        }


        if (
            !empty(
                $oldVariant[
                    'model_url'
                ]
            )
        ) {
            $oldFiles[] =
                $oldVariant[
                    'model_url'
                ];
        }
    }


    /*
     * Default variant.
     */

    $defaultVariant =
        array_values(
            $defaultVariants
        )[0];


    /*
     * New physical files.
     */

    $newFiles =
        $newImages;


    foreach (
        $variants
        as $variant
    ) {

        $newFiles[] =
            $variant[
                'thumbnailUrl'
            ];

        $newFiles[] =
            $variant[
                'modelUrl'
            ];
    }


    /*
     * Database transaction.
     */

    $pdo->beginTransaction();


    try {

        /*
         * Update main car.
         */

        $statement =
            $pdo->prepare(
                '
                UPDATE cars

                SET
                    name = ?,
                    brand_id = ?,
                    year = ?,
                    price = ?,

                    color = ?,
                    color_hex = ?,

                    description = ?,

                    thumbnail = ?,

                    images = ?,

                    model_path = ?,

                    featured = ?,

                    specs = ?,

                    features = ?

                WHERE id = ?
                '
            );


        $statement->execute([
            $b['name'],

            $b['brandId'],

            $b['year'],

            $b['price'],

            $defaultVariant[
                'colorName'
            ],

            $defaultVariant[
                'colorHex'
            ],

            $b['description'],

            $defaultVariant[
                'thumbnailUrl'
            ],

            json_encode(
                $newImages
            ),

            $defaultVariant[
                'modelUrl'
            ],

            !empty(
                $b['featured']
            ),

            json_encode(
                $b['specs']
                ?? []
            ),

            json_encode(
                $b['features']
                ?? []
            ),

            $id,
        ]);


        /*
         * Replace old variants.
         */

        $deleteVariants =
            $pdo->prepare(
                '
                DELETE FROM car_variants

                WHERE car_id = ?
                '
            );


        $deleteVariants
            ->execute([
                $id
            ]);


        /*
         * Insert current variants.
         */

        $variantStatement =
            $pdo->prepare(
                '
                INSERT INTO car_variants
                (
                    car_id,
                    color_name,
                    color_hex,
                    thumbnail_url,
                    model_url,
                    is_default,
                    sort_order
                )

                VALUES
                (
                    ?,?,?,?,?,?,?
                )
                '
            );


        foreach (
            $variants
            as $index =>
                $variant
        ) {

            $variantStatement
                ->execute([
                    $id,

                    $variant[
                        'colorName'
                    ],

                    $variant[
                        'colorHex'
                    ],

                    $variant[
                        'thumbnailUrl'
                    ],

                    $variant[
                        'modelUrl'
                    ],

                    !empty(
                        $variant[
                            'isDefault'
                        ]
                    )
                        ? 1
                        : 0,

                    $index,
                ]);
        }


        $pdo->commit();


    } catch (
        Throwable $e
    ) {

        if (
            $pdo->inTransaction()
        ) {
            $pdo->rollBack();
        }


        fail(
            'Could not update vehicle: '
            .
            $e->getMessage(),
            500
        );
    }


    /*
     * Delete files removed/replaced
     * only AFTER successful DB update.
     */

    foreach (
        array_unique(
            $oldFiles
        )
        as $oldFile
    ) {

        if (
            !in_array(
                $oldFile,
                $newFiles,
                true
            )
        ) {

            deleteLocalUpload(
                is_string(
                    $oldFile
                )
                    ? $oldFile
                    : null
            );
        }
    }


    out(true);
}

}


/* =========================================================
   CREATE CAR
========================================================= */

if (
    $route === 'cars'
    &&
    $method === 'POST'
) {
    requirePermission(
    $pdo,
    'cars.create'
);

    $b = body();

    $variants =
        isset($b['variants']) && is_array($b['variants'])
            ? $b['variants']
            : [];

    if (count($variants) === 0) {
        fail(
            'At least one color variant is required',
            422
        );
    }

    $defaultVariants = array_filter(
        $variants,
        fn ($variant) =>
            !empty($variant['isDefault'])
    );

    if (count($defaultVariants) !== 1) {
        fail(
            'Exactly one default color is required',
            422
        );
    }


    /*
     * Use the default variant also as fallback
     * values in the cars table.
     */

    $defaultVariant =
        array_values($defaultVariants)[0];


    $pdo->beginTransaction();

    try {

        /*
         * Create main car.
         */

        $statement =
    $pdo->prepare(
        '
        INSERT INTO cars
        (
            name,
            brand_id,
            year,
            price,
            color,
            color_hex,
            description,
            thumbnail,
            images,
            model_path,
            featured,
            specs,
            features
        )
        VALUES
        (
            ?,?,?,?,?,?,?,?,?,?,?,?,?
        )
        '
    );


        $statement->execute([
            $b['name'],

            $b['brandId'],

            $b['year'],

            $b['price'],

            $defaultVariant['colorName'] ?? '',

            $defaultVariant['colorHex'] ?? '#8a8d91',

            $b['description'],

            $defaultVariant['thumbnailUrl']
                ?? ($b['thumbnail'] ?? ''),

            json_encode(
                $b['images']
                ?? []
            ),

            $defaultVariant['modelUrl']
                ?? ($b['modelPath'] ?? null),

            !empty(
                $b['featured']
            ),

            json_encode(
                $b['specs']
                ?? []
            ),

            json_encode(
                $b['features']
                ?? []
            ),
        ]);


        $carId =
            (int)$pdo->lastInsertId();


        /*
         * Create color variants.
         */

        $variantStatement =
            $pdo->prepare(
                '
                INSERT INTO car_variants
                (
                    car_id,
                    color_name,
                    color_hex,
                    thumbnail_url,
                    model_url,
                    is_default,
                    sort_order
                )

                VALUES
                (
                    ?,?,?,?,?,?,?
                )
                '
            );


        foreach (
            $variants
            as $index => $variant
        ) {

            $colorName =
                trim(
                    (string)(
                        $variant['colorName']
                        ?? ''
                    )
                );

            $colorHex =
                trim(
                    (string)(
                        $variant['colorHex']
                        ?? ''
                    )
                );


            if ($colorName === '') {
                throw new RuntimeException(
                    'Variant color name is required'
                );
            }

            if (
                !preg_match(
                    '/^#[0-9a-fA-F]{6}$/',
                    $colorHex
                )
            ) {
                throw new RuntimeException(
                    'Invalid variant color hex'
                );
            }


            $variantStatement->execute([
                $carId,

                $colorName,

                $colorHex,

                $variant['thumbnailUrl']
                    ?? null,

                $variant['modelUrl']
                    ?? null,

                !empty(
                    $variant['isDefault']
                )
                    ? 1
                    : 0,

                $index,
            ]);
        }


        $pdo->commit();


        out(
            [
                'id' => $carId
            ],
            201
        );

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),
            422
        );
    }
}


/* =========================================================
   UPLOAD
========================================================= */

if (
    $route === 'upload'
    &&
    $method === 'POST'
) {
    admin();

    if (
        empty($_FILES['files'])
    ) {
        fail(
            'No files uploaded'
        );
    }

    $files = $_FILES['files'];

    $urls = [];
    if (!is_array($files['name'])) {
    $files = [
        'name' => [$files['name']],
        'type' => [$files['type']],
        'tmp_name' => [$files['tmp_name']],
        'error' => [$files['error']],
        'size' => [$files['size']],
    ];
}

    /*
     * Images go to:
     * C:/xampp/htdocs/car-storage/images
     *
     * 3D models go to:
     * C:/xampp/htdocs/car-storage/models
     */

    $imageExtensions = [
        'jpg',
        'jpeg',
        'png',
        'webp',
    ];

    $modelExtensions = [
        'glb',
        'gltf',
    ];


    for (
        $i = 0;
        $i < count($files['name']);
        $i++
    ) {

        if (
            $files['error'][$i]
            !== UPLOAD_ERR_OK
        ) {
            continue;
        }


        $extension = strtolower(
            pathinfo(
                $files['name'][$i],
                PATHINFO_EXTENSION
            )
        );


        /*
         * Decide storage folder based on file type.
         */

        if (
            in_array(
                $extension,
                $imageExtensions,
                true
            )
        ) {

            $storageDirectory =
                'C:/xampp/htdocs/car-storage/images';

            $publicUrl =
                'http://localhost/car-storage/images/';

        }

        elseif (
            in_array(
                $extension,
                $modelExtensions,
                true
            )
        ) {

            $storageDirectory =
                'C:/xampp/htdocs/car-storage/models';

            $publicUrl =
                'http://localhost/car-storage/models/';

        }

        else {
            continue;
        }


        /*
         * Make sure directory exists.
         */

        if (
            !is_dir($storageDirectory)
        ) {
            if (
                !mkdir(
                    $storageDirectory,
                    0775,
                    true
                )
                &&
                !is_dir($storageDirectory)
            ) {
                fail(
                    'Could not create storage directory',
                    500
                );
            }
        }


        /*
         * Generate unique filename.
         */

        $name =
            bin2hex(
                random_bytes(16)
            )
            .
            '.'
            .
            $extension;


        $target =
            $storageDirectory
            .
            DIRECTORY_SEPARATOR
            .
            $name;


        /*
         * Move uploaded file.
         */

        if (
            !move_uploaded_file(
                $files['tmp_name'][$i],
                $target
            )
        ) {
            fail(
                'Could not save uploaded file',
                500
            );
        }


        /*
         * Return public URL to frontend.
         */

        $urls[] =
            $publicUrl
            .
            $name;
    }


    if (empty($urls)) {
        fail(
            'No valid files were uploaded'
        );
    }


    out([
        'urls' => $urls
    ]);
}


/* =========================================================
   CAR VARIANTS
========================================================= */

if (
    $route === 'car-variants'
    &&
    $method === 'GET'
) {
    $carId =
        isset(
            $_GET['car_id']
        )
            ? (int)$_GET['car_id']
            : 0;


    if (
        $carId <= 0
    ) {
        fail(
            'car_id is required'
        );
    }


    $statement =
        $pdo->prepare(
            '
            SELECT

                id,

                car_id
                    AS carId,

                color_name
                    AS colorName,

                color_hex
                    AS colorHex,

                thumbnail_url
                    AS thumbnailUrl,

                model_url
                    AS modelUrl,

                is_default
                    AS isDefault,

                sort_order
                    AS sortOrder

            FROM car_variants

            WHERE car_id = ?

            ORDER BY
                sort_order ASC,
                id ASC
            '
        );


    $statement->execute([
        $carId
    ]);


    $variants =
        $statement->fetchAll();


    foreach (
        $variants
        as &$variant
    ) {
        $variant['id'] =
            (int)$variant['id'];

        $variant['carId'] =
            (int)$variant['carId'];

        $variant['isDefault'] =
            (bool)$variant['isDefault'];

        $variant['sortOrder'] =
            (int)$variant['sortOrder'];
    }


    unset(
        $variant
    );


    out(
        $variants
    );
}


/* =========================================================
   404
========================================================= */

fail(
    'Route not found',
    404
);