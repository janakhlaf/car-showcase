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

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';


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
            au.email

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
        'email' => $row['email']
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

    out([
        'id' => (int)$payload['sub'],
        'email' => $payload['email'],
        'role' => $payload['role']
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
                    color,
                    MIN(color_hex) AS colorHex
                 FROM cars
                 GROUP BY color
                 ORDER BY color'
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
        $where[] =
            'COALESCE(v.color_name, c.color) = ?';

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


            c.sketchfab_url
                AS sketchfabUrl,


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


                    c.sketchfab_url
                        AS sketchfabUrl,


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
    admin();

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
    admin();

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


    if (
        count($newImages) === 0
    ) {
        fail(
            'At least one gallery image is required',
            422
        );
    }


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

                    sketchfab_url = NULL,

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
    admin();

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
                    sketchfab_url,
                    model_path,
                    featured,
                    specs,
                    features
                )

                VALUES
                (
                    ?,?,?,?,?,?,?,?,?,?,?,?,?,?
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

            $b['sketchfabUrl']
                ?? null,

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