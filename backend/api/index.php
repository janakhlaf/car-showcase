<?php

declare(strict_types=1);

session_start();

require_once __DIR__ . '/../config/database.php';

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
header('Access-Control-Allow-Headers: Content-Type');
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


function admin(): void
{
    if (empty($_SESSION['admin'])) {
        fail('Unauthorized', 401);
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


    $_SESSION['admin'] = [
        'id' =>
            (int)$user['id'],

        'name' =>
            $user['name'],

        'email' =>
            $user['email'],
    ];


    out(
        $_SESSION['admin']
    );
}


/* =========================================================
   ADMIN LOGOUT
========================================================= */

if (
    $route === 'admin/logout'
    &&
    $method === 'POST'
) {
    session_destroy();

    out(true);
}


/* =========================================================
   ADMIN SESSION
========================================================= */

if (
    $route === 'admin/me'
    &&
    $method === 'GET'
) {
    out(
        $_SESSION['admin']
        ?? null
    );
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
         * Delete variants first in case FK cascade
         * is not configured.
         */

        $variantStatement =
            $pdo->prepare(
                'DELETE FROM car_variants
                 WHERE car_id = ?'
            );

        $variantStatement->execute([
            $id
        ]);


        $statement =
            $pdo->prepare(
                'DELETE FROM cars
                 WHERE id = ?'
            );


        $statement->execute([
            $id
        ]);


        out(true);
    }


    /* -----------------------------------------------------
       UPDATE CAR
    ----------------------------------------------------- */

    if (
        $method === 'PUT'
    ) {
        admin();


        $b =
            body();


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
                    sketchfab_url = ?,
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

            $b['color'],

            $b['colorHex'],

            $b['description'],

            $b['thumbnail'],

            json_encode(
                $b['images']
                ?? []
            ),

            $b['sketchfabUrl']
                ?: null,

            $b['modelPath']
                ?: null,

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


    $b =
        body();


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

        $b['color'],

        $b['colorHex'],

        $b['description'],

        $b['thumbnail'],

        json_encode(
            $b['images']
            ?? []
        ),

        $b['sketchfabUrl']
            ?: null,

        $b['modelPath']
            ?: null,

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


    out(
        [
            'id' =>
                (int)$pdo
                    ->lastInsertId()
        ],
        201
    );
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
        empty(
            $_FILES['files']
        )
    ) {
        fail(
            'No files uploaded'
        );
    }


    $files =
        $_FILES['files'];


    $urls = [];


    $allowed = [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'glb',
        'gltf',
    ];


    for (
        $i = 0;
        $i < count(
            $files['name']
        );
        $i++
    ) {
        if (
            $files['error'][$i]
            !==
            UPLOAD_ERR_OK
        ) {
            continue;
        }


        $extension =
            strtolower(
                pathinfo(
                    $files['name'][$i],
                    PATHINFO_EXTENSION
                )
            );


        if (
            !in_array(
                $extension,
                $allowed,
                true
            )
        ) {
            continue;
        }


        $name =
            bin2hex(
                random_bytes(8)
            )
            .
            '.'
            .
            $extension;


        $target =
            __DIR__
            .
            '/../uploads/'
            .
            $name;


        if (
            move_uploaded_file(
                $files['tmp_name'][$i],
                $target
            )
        ) {
            $urls[] =
                'http://localhost/finalcar/backend/uploads/'
                .
                $name;
        }
    }


    out([
        'urls' =>
            $urls
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