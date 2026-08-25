<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| BECOME A SELLER - SUBMIT REQUEST
|--------------------------------------------------------------------------
*/

if (
    $route === 'sellers/request'
    &&
    $method === 'POST'
) {

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION
    |--------------------------------------------------------------------------
    */

    try {
        $token = getBearerToken();
    } catch (Throwable $e) {
        fail(
            'Authentication required',
            401
        );
    }

    try {
        $payload = verifyUserAccessToken(
            $token
        );
    } catch (Throwable $e) {
        fail(
            'Invalid or expired session',
            401
        );
    }

    $userId =
        (int)($payload['sub'] ?? 0);

    if ($userId <= 0) {
        fail(
            'Invalid user session',
            401
        );
    }

    /*
    |--------------------------------------------------------------------------
    | GET USER
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            phone,
            seller_status
         FROM users
         WHERE id = ?
         LIMIT 1'
    );

    $statement->execute([
        $userId
    ]);

    $user = $statement->fetch();

    if (!$user) {
        fail(
            'User not found',
            404
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK CURRENT SELLER STATUS
    |--------------------------------------------------------------------------
    */

    $sellerStatus =
        (string)$user['seller_status'];

    if ($sellerStatus === 'pending') {
        fail(
            'Your seller request is already under review',
            409
        );
    }

    if ($sellerStatus === 'approved') {
        fail(
            'Your account is already approved as a seller',
            409
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE SELLER REQUEST
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();

    try {

        $requestStatement =
            $pdo->prepare(
                'INSERT INTO seller_requests
                (
                    user_id,
                    status,
                    submitted_at,
                    reviewed_at,
                    reviewed_by,
                    rejection_reason
                )
                VALUES
                (
                    ?,
                    \'pending\',
                    CURRENT_TIMESTAMP,
                    NULL,
                    NULL,
                    NULL
                )'
            );

        $requestStatement->execute([
            $userId
        ]);

        $updateUserStatement =
            $pdo->prepare(
                'UPDATE users
                 SET seller_status = \'pending\'
                 WHERE id = ?'
            );

        $updateUserStatement->execute([
            $userId
        ]);

        $requestId =
            (int)$pdo->lastInsertId();

        $pdo->commit();

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        fail(
            'Could not submit seller request',
            500
        );
    }

    out(
        [
            'message' =>
                'Seller request submitted successfully',

            'sellerRequest' => [
                'id' =>
                    $requestId,

                'status' =>
                    'pending'
            ],

            'sellerStatus' =>
                'pending'
        ],
        201
    );
}


/*
|--------------------------------------------------------------------------
| ADMIN - GET SELLER REQUESTS
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/seller-requests'
    &&
    $method === 'GET'
) {

    requirePermission(
        $pdo,
        'sellers.manage'
    );

    $statement = $pdo->query(
        'SELECT
            sr.id,
            sr.user_id AS userId,
            sr.status,
            sr.submitted_at AS submittedAt,
            sr.reviewed_at AS reviewedAt,
            sr.reviewed_by AS reviewedBy,
            sr.rejection_reason AS rejectionReason,

            u.name,
            u.email,
            u.phone,
            u.seller_status AS sellerStatus

         FROM seller_requests sr

         INNER JOIN users u
            ON u.id = sr.user_id

         ORDER BY sr.submitted_at DESC'
    );

    $requests =
        $statement->fetchAll();

    foreach ($requests as &$request) {
        $request['id'] =
            (int)$request['id'];

        $request['userId'] =
            (int)$request['userId'];

        $request['reviewedBy'] =
            $request['reviewedBy'] !== null
                ? (int)$request['reviewedBy']
                : null;
    }

    unset($request);

    out($requests);
}
/*
|--------------------------------------------------------------------------
| ADMIN - APPROVE SELLER REQUEST
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/seller-requests/(\d+)/approve$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {

    requirePermission(
        $pdo,
        'sellers.manage'
    );

    $adminPayload = admin();
    $adminId = (int)($adminPayload['sub'] ?? 0);

    $requestId = (int)$matches[1];

    $pdo->beginTransaction();

    try {
        $statement = $pdo->prepare(
            'SELECT
                sr.id,
                sr.user_id,
                sr.status
             FROM seller_requests sr
             WHERE sr.id = ?
             LIMIT 1
             FOR UPDATE'
        );

        $statement->execute([$requestId]);

        $request = $statement->fetch();

        if (!$request) {
            throw new RuntimeException('Seller request not found');
        }

        if ($request['status'] !== 'pending') {
            throw new RuntimeException('Seller request has already been reviewed');
        }

        $updateRequest = $pdo->prepare(
            'UPDATE seller_requests
             SET
                status = \'approved\',
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = ?,
                rejection_reason = NULL
             WHERE id = ?'
        );

        $updateRequest->execute([
            $adminId,
            $requestId
        ]);

        $updateUser = $pdo->prepare(
            'UPDATE users
             SET seller_status = \'approved\'
             WHERE id = ?'
        );

        $updateUser->execute([
            (int)$request['user_id']
        ]);

        $pdo->commit();

        out([
            'message' => 'Seller request approved successfully',
            'requestId' => $requestId,
            'sellerStatus' => 'approved'
        ]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),
            $e->getMessage() === 'Seller request not found'
                ? 404
                : 422
        );
    }
}
/*
|--------------------------------------------------------------------------
| ADMIN - REJECT SELLER REQUEST
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/seller-requests/(\d+)/reject$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {

    requirePermission(
        $pdo,
        'sellers.manage'
    );

    $adminPayload = admin();
    $adminId = (int)($adminPayload['sub'] ?? 0);

    $requestId = (int)$matches[1];

    $b = body();

    $reason = trim(
        (string)($b['reason'] ?? '')
    );

    if ($reason === '') {
        fail(
            'Rejection reason is required',
            422
        );
    }

    $pdo->beginTransaction();

    try {
        $statement = $pdo->prepare(
            'SELECT
                sr.id,
                sr.user_id,
                sr.status
             FROM seller_requests sr
             WHERE sr.id = ?
             LIMIT 1
             FOR UPDATE'
        );

        $statement->execute([$requestId]);

        $request = $statement->fetch();

        if (!$request) {
            throw new RuntimeException('Seller request not found');
        }

        if ($request['status'] !== 'pending') {
            throw new RuntimeException('Seller request has already been reviewed');
        }

        $updateRequest = $pdo->prepare(
            'UPDATE seller_requests
             SET
                status = \'rejected\',
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = ?,
                rejection_reason = ?
             WHERE id = ?'
        );

        $updateRequest->execute([
            $adminId,
            $reason,
            $requestId
        ]);

        $updateUser = $pdo->prepare(
            'UPDATE users
             SET seller_status = \'rejected\'
             WHERE id = ?'
        );

        $updateUser->execute([
            (int)$request['user_id']
        ]);

        $pdo->commit();

        out([
            'message' => 'Seller request rejected successfully',
            'requestId' => $requestId,
            'sellerStatus' => 'rejected',
            'rejectionReason' => $reason
        ]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),
            $e->getMessage() === 'Seller request not found'
                ? 404
                : 422
        );
    }
}

/*
|--------------------------------------------------------------------------
| SELLER VEHICLE HELPERS
|--------------------------------------------------------------------------
*/

function approvedSeller(PDO $pdo): array
{
    try {
        $token = getBearerToken();
    } catch (Throwable $e) {
        fail(
            'Authentication required',
            401
        );
    }

    try {
        $payload =
            verifyUserAccessToken(
                $token
            );
    } catch (Throwable $e) {
        fail(
            'Invalid or expired session',
            401
        );
    }

    $userId =
        (int)($payload['sub'] ?? 0);

    if ($userId <= 0) {
        fail(
            'Invalid user session',
            401
        );
    }

    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            seller_status
         FROM users
         WHERE id = ?
         LIMIT 1'
    );

    $statement->execute([
        $userId
    ]);

    $user =
        $statement->fetch();

    if (!$user) {
        fail(
            'User not found',
            404
        );
    }

    if (
        $user['seller_status']
        !== 'approved'
    ) {
        fail(
            'Seller account is not approved',
            403
        );
    }

    $user['id'] =
        (int)$user['id'];

    return $user;
}


/*
|--------------------------------------------------------------------------
| DELETE SELLER LOCAL FILE
|--------------------------------------------------------------------------
*/

function deleteSellerUpload(
    ?string $url
): void {

    if (!$url) {
        return;
    }

    $imagePrefix =
        'http://localhost/seller-img/';

    $modelPrefix =
        'http://localhost/seller-car-storage/';

    $baseDirectory = null;

    if (
        str_starts_with(
            $url,
            $imagePrefix
        )
    ) {
        $baseDirectory =
            realpath(
                'C:/xampp/htdocs/seller-img'
            );
    }

    elseif (
        str_starts_with(
            $url,
            $modelPrefix
        )
    ) {
        $baseDirectory =
            realpath(
                'C:/xampp/htdocs/seller-car-storage'
            );
    }

    else {
        return;
    }

    if ($baseDirectory === false) {
        return;
    }

    $path =
        parse_url(
            $url,
            PHP_URL_PATH
        );

    if (!$path) {
        return;
    }

    $filename =
        basename($path);

    if ($filename === '') {
        return;
    }

    $candidate =
        $baseDirectory
        . DIRECTORY_SEPARATOR
        . $filename;

    $realFile =
        realpath($candidate);

    if (
        $realFile === false
        ||
        !str_starts_with(
            $realFile,
            $baseDirectory
            . DIRECTORY_SEPARATOR
        )
    ) {
        return;
    }

    if (is_file($realFile)) {
        @unlink($realFile);
    }
}


/*
|--------------------------------------------------------------------------
| NORMALIZE SELLER CAR
|--------------------------------------------------------------------------
*/

function sellerCarRow(
    array $row
): array {

    $row['id'] =
        (int)$row['id'];

    $row['sellerId'] =
        $row['sellerId'] !== null
            ? (int)$row['sellerId']
            : null;

    $row['brandId'] =
        (int)$row['brandId'];

    $row['year'] =
        (int)$row['year'];

    $row['price'] =
        (int)$row['price'];

    $row['featured'] =
        (bool)$row['featured'];

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


/*
|--------------------------------------------------------------------------
| SELLER - UPLOAD FILES
|--------------------------------------------------------------------------
|
| Images:
| C:/xampp/htdocs/seller-img
|
| Models:
| C:/xampp/htdocs/seller-car-storage
|
*/

if (
    $route === 'sellers/upload'
    &&
    $method === 'POST'
) {

    approvedSeller($pdo);

    if (
        empty($_FILES['files'])
    ) {
        fail(
            'No files uploaded',
            422
        );
    }

    $files =
        $_FILES['files'];

    if (
        !is_array(
            $files['name']
        )
    ) {
        $files = [
            'name' => [
                $files['name']
            ],

            'type' => [
                $files['type']
            ],

            'tmp_name' => [
                $files['tmp_name']
            ],

            'error' => [
                $files['error']
            ],

            'size' => [
                $files['size']
            ],
        ];
    }

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

    $urls = [];

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

        $extension =
            strtolower(
                pathinfo(
                    $files['name'][$i],
                    PATHINFO_EXTENSION
                )
            );

        /*
        |----------------------------------------------------------------------
        | IMAGE
        |----------------------------------------------------------------------
        */

        if (
            in_array(
                $extension,
                $imageExtensions,
                true
            )
        ) {

            if (
                (int)$files['size'][$i]
                > 15 * 1024 * 1024
            ) {
                fail(
                    'Image files must be 15 MB or smaller',
                    422
                );
            }

            $storageDirectory =
                'C:/xampp/htdocs/seller-img';

            $publicUrl =
                'http://localhost/seller-img/';
        }

        /*
        |----------------------------------------------------------------------
        | 3D MODEL
        |----------------------------------------------------------------------
        */

        elseif (
            in_array(
                $extension,
                $modelExtensions,
                true
            )
        ) {

            if (
                (int)$files['size'][$i]
                > 250 * 1024 * 1024
            ) {
                fail(
                    '3D model files must be 250 MB or smaller',
                    422
                );
            }

            $storageDirectory =
                'C:/xampp/htdocs/seller-car-storage';

            $publicUrl =
                'http://localhost/seller-car-storage/';
        }

        else {
            fail(
                'Unsupported file type',
                422
            );
        }

        /*
        |----------------------------------------------------------------------
        | CREATE DIRECTORY IF NEEDED
        |----------------------------------------------------------------------
        */

        if (
            !is_dir(
                $storageDirectory
            )
        ) {

            if (
                !mkdir(
                    $storageDirectory,
                    0775,
                    true
                )
                &&
                !is_dir(
                    $storageDirectory
                )
            ) {
                fail(
                    'Could not create seller storage directory',
                    500
                );
            }
        }

        /*
        |----------------------------------------------------------------------
        | UNIQUE FILE NAME
        |----------------------------------------------------------------------
        */

        $filename =
            bin2hex(
                random_bytes(16)
            )
            . '.'
            . $extension;

        $target =
            $storageDirectory
            . DIRECTORY_SEPARATOR
            . $filename;

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

        $urls[] =
            $publicUrl
            . $filename;
    }

    if (!$urls) {
        fail(
            'No valid files were uploaded',
            422
        );
    }

    out([
        'urls' => $urls
    ]);
}


/*
|--------------------------------------------------------------------------
| SELLER - GET MY VEHICLES
|--------------------------------------------------------------------------
*/

if (
    $route === 'sellers/cars'
    &&
    $method === 'GET'
) {

    $seller =
        approvedSeller($pdo);

    $statement = $pdo->prepare(
        'SELECT
            c.id,

            c.seller_id
                AS sellerId,

            c.approval_status
                AS approvalStatus,

            c.rejection_reason
                AS rejectionReason,

            c.reviewed_at
                AS reviewedAt,

            c.reviewed_by
                AS reviewedBy,

            c.name,

            c.brand_id
                AS brandId,

            b.name
                AS brandName,

            c.year,
            c.price,
            c.color,

            c.color_hex
                AS colorHex,

            c.description,
            c.thumbnail,
            c.images,

            c.model_path
                AS modelPath,

            c.featured,
            c.specs,
            c.features,

            c.created_at
                AS createdAt

         FROM cars c

         INNER JOIN brands b
            ON b.id = c.brand_id

         WHERE c.seller_id = ?

         ORDER BY c.created_at DESC'
    );

    $statement->execute([
        $seller['id']
    ]);

    $cars =
        $statement->fetchAll();

    foreach ($cars as &$car) {
        $car =
            sellerCarRow($car);
    }

    unset($car);

    out($cars);
}


/*
|--------------------------------------------------------------------------
| SELLER - GET ONE OF MY VEHICLES
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^sellers/cars/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'GET'
) {

    $seller =
        approvedSeller($pdo);

    $carId =
        (int)$matches[1];

    $statement = $pdo->prepare(
        'SELECT
            c.id,

            c.seller_id
                AS sellerId,

            c.approval_status
                AS approvalStatus,

            c.rejection_reason
                AS rejectionReason,

            c.reviewed_at
                AS reviewedAt,

            c.reviewed_by
                AS reviewedBy,

            c.name,

            c.brand_id
                AS brandId,

            b.name
                AS brandName,

            c.year,
            c.price,
            c.color,

            c.color_hex
                AS colorHex,

            c.description,
            c.thumbnail,
            c.images,

            c.model_path
                AS modelPath,

            c.featured,
            c.specs,
            c.features,

            c.created_at
                AS createdAt

         FROM cars c

         INNER JOIN brands b
            ON b.id = c.brand_id

         WHERE c.id = ?
           AND c.seller_id = ?

         LIMIT 1'
    );

    $statement->execute([
        $carId,
        $seller['id']
    ]);

    $car =
        $statement->fetch();

    if (!$car) {
        fail(
            'Vehicle not found',
            404
        );
    }

    $car =
        sellerCarRow($car);

    /*
    |--------------------------------------------------------------------------
    | GET VARIANTS
    |--------------------------------------------------------------------------
    */

    $variantStatement =
        $pdo->prepare(
            'SELECT
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
                id ASC'
        );

    $variantStatement->execute([
        $carId
    ]);

    $variants =
        $variantStatement->fetchAll();

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

    unset($variant);

    $car['variants'] =
        $variants;

    out($car);
}


/*
|--------------------------------------------------------------------------
| SELLER - CREATE VEHICLE
|--------------------------------------------------------------------------
*/

if (
    $route === 'sellers/cars'
    &&
    $method === 'POST'
) {

    $seller =
        approvedSeller($pdo);

    $b = body();

    $name =
        trim(
            (string)(
                $b['name']
                ?? ''
            )
        );

    $brandId =
        (int)(
            $b['brandId']
            ?? 0
        );

    $year =
        (int)(
            $b['year']
            ?? 0
        );

    $price =
        (int)(
            $b['price']
            ?? 0
        );

    $description =
        trim(
            (string)(
                $b['description']
                ?? ''
            )
        );

    $images =
        isset($b['images'])
        &&
        is_array($b['images'])
            ? array_values(
                array_filter(
                    $b['images'],
                    'is_string'
                )
            )
            : [];

    $specs =
        isset($b['specs'])
        &&
        is_array($b['specs'])
            ? $b['specs']
            : [];

    $features =
        isset($b['features'])
        &&
        is_array($b['features'])
            ? $b['features']
            : [];

    $variants =
        isset($b['variants'])
        &&
        is_array($b['variants'])
            ? $b['variants']
            : [];


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($name === '') {
        fail(
            'Vehicle name is required',
            422
        );
    }

    if ($brandId <= 0) {
        fail(
            'Brand is required',
            422
        );
    }

    if (
        $year < 1950
        ||
        $year > 2035
    ) {
        fail(
            'Invalid model year',
            422
        );
    }

    if ($price < 1000) {
        fail(
            'Invalid vehicle price',
            422
        );
    }

    if (
        strlen($description)
        < 10
    ) {
        fail(
            'Description must contain at least 10 characters',
            422
        );
    }

    if (
        count($images)
        > 10
    ) {
        fail(
            'Maximum 10 gallery images',
            422
        );
    }

    if (
        count($variants)
        === 0
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
        count($defaultVariants)
        !== 1
    ) {
        fail(
            'Exactly one default color is required',
            422
        );
    }

    $defaultVariant =
        array_values(
            $defaultVariants
        )[0];


    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();

    try {

        $statement =
            $pdo->prepare(
                'INSERT INTO cars
                (
                    seller_id,
                    approval_status,
                    rejection_reason,
                    reviewed_at,
                    reviewed_by,

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
                    ?,
                    \'pending\',
                    NULL,
                    NULL,
                    NULL,

                    ?,?,?,?,?,?,?,?,?,?,?,?,?
                )'
            );

        $statement->execute([
            $seller['id'],

            $name,
            $brandId,
            $year,
            $price,

            $defaultVariant['colorName']
                ?? '',

            $defaultVariant['colorHex']
                ?? '#8a8d91',

            $description,

            $defaultVariant['thumbnailUrl']
                ?? '',

            json_encode(
                $images,
                JSON_UNESCAPED_SLASHES
            ),

            $defaultVariant['modelUrl']
                ?? null,

            0,

            json_encode(
                $specs,
                JSON_UNESCAPED_SLASHES
            ),

            json_encode(
                $features,
                JSON_UNESCAPED_SLASHES
            ),
        ]);


        $carId =
            (int)$pdo->lastInsertId();


        /*
        |--------------------------------------------------------------------------
        | CREATE VARIANTS
        |--------------------------------------------------------------------------
        */

        $variantStatement =
            $pdo->prepare(
                'INSERT INTO car_variants
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
                )'
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

            if ($thumbnailUrl === '') {
                throw new RuntimeException(
                    'Variant image is required'
                );
            }

            if ($modelUrl === '') {
                throw new RuntimeException(
                    'Variant 3D model is required'
                );
            }

            /*
            |------------------------------------------------------------------
            | SELLER MUST USE SELLER STORAGE
            |------------------------------------------------------------------
            */

            if (
                !str_starts_with(
                    $thumbnailUrl,
                    'http://localhost/seller-img/'
                )
            ) {
                throw new RuntimeException(
                    'Invalid seller image URL'
                );
            }

            if (
                !str_starts_with(
                    $modelUrl,
                    'http://localhost/seller-car-storage/'
                )
            ) {
                throw new RuntimeException(
                    'Invalid seller model URL'
                );
            }

            $variantStatement->execute([
                $carId,
                $colorName,
                $colorHex,
                $thumbnailUrl,
                $modelUrl,

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
                'message' =>
                    'Vehicle submitted for review',

                'vehicle' => [
                    'id' =>
                        $carId,

                    'sellerId' =>
                        $seller['id'],

                    'approvalStatus' =>
                        'pending'
                ]
            ],
            201
        );

    } catch (Throwable $e) {

        if (
            $pdo->inTransaction()
        ) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),
            422
        );
    }
}


/*
|--------------------------------------------------------------------------
| SELLER - UPDATE VEHICLE
|--------------------------------------------------------------------------
|
| Any seller edit sends the vehicle back to Pending review.
|
*/

if (
    preg_match(
        '#^sellers/cars/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'PUT'
) {

    $seller =
        approvedSeller($pdo);

    $carId =
        (int)$matches[1];

    $b = body();

    /*
    |--------------------------------------------------------------------------
    | GET CURRENT CAR
    |--------------------------------------------------------------------------
    */

    $currentStatement =
        $pdo->prepare(
            'SELECT *
             FROM cars
             WHERE id = ?
               AND seller_id = ?
             LIMIT 1'
        );

    $currentStatement->execute([
        $carId,
        $seller['id']
    ]);

    $currentCar =
        $currentStatement->fetch();

    if (!$currentCar) {
        fail(
            'Vehicle not found',
            404
        );
    }


    /*
    |--------------------------------------------------------------------------
    | OLD FILES
    |--------------------------------------------------------------------------
    */

    $oldFiles = [];

    if (
        !empty(
            $currentCar['thumbnail']
        )
    ) {
        $oldFiles[] =
            $currentCar['thumbnail'];
    }

    if (
        !empty(
            $currentCar['model_path']
        )
    ) {
        $oldFiles[] =
            $currentCar['model_path'];
    }

    $oldImages =
        json_decode(
            $currentCar['images']
                ?: '[]',
            true
        ) ?: [];

    foreach (
        $oldImages
        as $oldImage
    ) {
        $oldFiles[] =
            $oldImage;
    }

    $oldVariantStatement =
        $pdo->prepare(
            'SELECT
                thumbnail_url,
                model_url
             FROM car_variants
             WHERE car_id = ?'
        );

    $oldVariantStatement->execute([
        $carId
    ]);

    foreach (
        $oldVariantStatement->fetchAll()
        as $oldVariant
    ) {

        if (
            !empty(
                $oldVariant['thumbnail_url']
            )
        ) {
            $oldFiles[] =
                $oldVariant['thumbnail_url'];
        }

        if (
            !empty(
                $oldVariant['model_url']
            )
        ) {
            $oldFiles[] =
                $oldVariant['model_url'];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | NEW VALUES
    |--------------------------------------------------------------------------
    */

    $name =
        trim(
            (string)(
                $b['name']
                ?? ''
            )
        );

    $brandId =
        (int)(
            $b['brandId']
            ?? 0
        );

    $year =
        (int)(
            $b['year']
            ?? 0
        );

    $price =
        (int)(
            $b['price']
            ?? 0
        );

    $description =
        trim(
            (string)(
                $b['description']
                ?? ''
            )
        );

    $images =
        isset($b['images'])
        &&
        is_array($b['images'])
            ? array_values(
                array_filter(
                    $b['images'],
                    'is_string'
                )
            )
            : [];

    $specs =
        isset($b['specs'])
        &&
        is_array($b['specs'])
            ? $b['specs']
            : [];

    $features =
        isset($b['features'])
        &&
        is_array($b['features'])
            ? $b['features']
            : [];

    $variants =
        isset($b['variants'])
        &&
        is_array($b['variants'])
            ? $b['variants']
            : [];


    if ($name === '') {
        fail(
            'Vehicle name is required',
            422
        );
    }

    if ($brandId <= 0) {
        fail(
            'Brand is required',
            422
        );
    }

    if (
        count($variants)
        === 0
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
        count($defaultVariants)
        !== 1
    ) {
        fail(
            'Exactly one default color is required',
            422
        );
    }

    $defaultVariant =
        array_values(
            $defaultVariants
        )[0];


    /*
    |--------------------------------------------------------------------------
    | NEW FILE REFERENCES
    |--------------------------------------------------------------------------
    */

    $newFiles = [];

    foreach (
        $images
        as $image
    ) {
        $newFiles[] = $image;
    }

    foreach (
        $variants
        as $variant
    ) {

        if (
            !empty(
                $variant['thumbnailUrl']
            )
        ) {
            $newFiles[] =
                $variant['thumbnailUrl'];
        }

        if (
            !empty(
                $variant['modelUrl']
            )
        ) {
            $newFiles[] =
                $variant['modelUrl'];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE DATABASE
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();

    try {

        $updateStatement =
            $pdo->prepare(
                'UPDATE cars
                 SET
                    approval_status = \'pending\',
                    rejection_reason = NULL,
                    reviewed_at = NULL,
                    reviewed_by = NULL,

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
                    featured = 0,
                    specs = ?,
                    features = ?

                 WHERE id = ?
                   AND seller_id = ?'
            );

        $updateStatement->execute([
            $name,
            $brandId,
            $year,
            $price,

            $defaultVariant['colorName']
                ?? '',

            $defaultVariant['colorHex']
                ?? '#8a8d91',

            $description,

            $defaultVariant['thumbnailUrl']
                ?? '',

            json_encode(
                $images,
                JSON_UNESCAPED_SLASHES
            ),

            $defaultVariant['modelUrl']
                ?? null,

            json_encode(
                $specs,
                JSON_UNESCAPED_SLASHES
            ),

            json_encode(
                $features,
                JSON_UNESCAPED_SLASHES
            ),

            $carId,
            $seller['id']
        ]);


        /*
        |--------------------------------------------------------------------------
        | REBUILD VARIANTS
        |--------------------------------------------------------------------------
        */

        $deleteVariants =
            $pdo->prepare(
                'DELETE FROM car_variants
                 WHERE car_id = ?'
            );

        $deleteVariants->execute([
            $carId
        ]);

        $variantStatement =
            $pdo->prepare(
                'INSERT INTO car_variants
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
                )'
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
                ||
                $thumbnailUrl === ''
                ||
                $modelUrl === ''
            ) {
                throw new RuntimeException(
                    'Incomplete vehicle color'
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
                $thumbnailUrl,
                $modelUrl,

                !empty(
                    $variant['isDefault']
                )
                    ? 1
                    : 0,

                $index
            ]);
        }

        $pdo->commit();

    } catch (Throwable $e) {

        if (
            $pdo->inTransaction()
        ) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | DELETE FILES NO LONGER USED
    |--------------------------------------------------------------------------
    |
    | Only after database update succeeded.
    |
    */

    $oldFiles =
        array_unique(
            array_filter(
                $oldFiles
            )
        );

    $newFiles =
        array_unique(
            array_filter(
                $newFiles
            )
        );

    foreach (
        $oldFiles
        as $oldFile
    ) {

        if (
            !in_array(
                $oldFile,
                $newFiles,
                true
            )
        ) {
            deleteSellerUpload(
                $oldFile
            );
        }
    }

    out([
        'message' =>
            'Vehicle updated and submitted for review',

        'vehicle' => [
            'id' =>
                $carId,

            'approvalStatus' =>
                'pending'
        ]
    ]);
}


/*
|--------------------------------------------------------------------------
| SELLER - DELETE VEHICLE
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^sellers/cars/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'DELETE'
) {

    $seller =
        approvedSeller($pdo);

    $carId =
        (int)$matches[1];


    /*
    |--------------------------------------------------------------------------
    | GET CAR
    |--------------------------------------------------------------------------
    */

    $statement =
        $pdo->prepare(
            'SELECT
                id,
                thumbnail,
                images,
                model_path
             FROM cars
             WHERE id = ?
               AND seller_id = ?
             LIMIT 1'
        );

    $statement->execute([
        $carId,
        $seller['id']
    ]);

    $car =
        $statement->fetch();

    if (!$car) {
        fail(
            'Vehicle not found',
            404
        );
    }


    /*
    |--------------------------------------------------------------------------
    | COLLECT ALL FILES
    |--------------------------------------------------------------------------
    */

    $filesToDelete = [];

    if (!empty($car['thumbnail'])) {
        $filesToDelete[] =
            $car['thumbnail'];
    }

    if (!empty($car['model_path'])) {
        $filesToDelete[] =
            $car['model_path'];
    }

    $gallery =
        json_decode(
            $car['images']
                ?: '[]',
            true
        ) ?: [];

    foreach (
        $gallery
        as $image
    ) {
        $filesToDelete[] =
            $image;
    }

    $variantStatement =
        $pdo->prepare(
            'SELECT
                thumbnail_url,
                model_url
             FROM car_variants
             WHERE car_id = ?'
        );

    $variantStatement->execute([
        $carId
    ]);

    foreach (
        $variantStatement->fetchAll()
        as $variant
    ) {

        if (
            !empty(
                $variant['thumbnail_url']
            )
        ) {
            $filesToDelete[] =
                $variant['thumbnail_url'];
        }

        if (
            !empty(
                $variant['model_url']
            )
        ) {
            $filesToDelete[] =
                $variant['model_url'];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | DELETE DATABASE DATA
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();

    try {

        $deleteVariants =
            $pdo->prepare(
                'DELETE FROM car_variants
                 WHERE car_id = ?'
            );

        $deleteVariants->execute([
            $carId
        ]);

        $deleteCar =
            $pdo->prepare(
                'DELETE FROM cars
                 WHERE id = ?
                   AND seller_id = ?'
            );

        $deleteCar->execute([
            $carId,
            $seller['id']
        ]);

        $pdo->commit();

    } catch (Throwable $e) {

        if (
            $pdo->inTransaction()
        ) {
            $pdo->rollBack();
        }

        fail(
            'Could not delete vehicle',
            500
        );
    }


    /*
    |--------------------------------------------------------------------------
    | DELETE PHYSICAL FILES
    |--------------------------------------------------------------------------
    */

    foreach (
        array_unique(
            array_filter(
                $filesToDelete
            )
        )
        as $file
    ) {
        deleteSellerUpload(
            $file
        );
    }

    out([
        'message' =>
            'Vehicle deleted successfully'
    ]);
}