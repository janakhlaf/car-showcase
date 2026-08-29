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

/*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER REQUEST SUBMITTED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    $userId,
    'customer',
    'seller_request_submitted',
    'seller_request',
    $requestId,
    'Customer submitted a seller request',
    null,
    [
        'status' => 'pending'
    ],
    [
        'user_name' => $user['name'],
        'user_email' => $user['email'],
        'source' => 'seller_request'
    ]
);

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

    $currentAdmin = requirePermission(
    $pdo,
    'sellers.manage'
);

$adminId = (int)$currentAdmin['id'];

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

        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER REQUEST APPROVED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    $adminId,
    'admin',
    'seller_request_approved',
    'seller_request',
    $requestId,
    'Admin approved seller request',
    [
        'status' => 'pending'
    ],
    [
        'status' => 'approved'
    ],
    [
        'admin_name' => $currentAdmin['name'],
        'admin_role' => $currentAdmin['role'],
        'user_id' => (int)$request['user_id']
    ]
);

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

    $currentAdmin = requirePermission(
    $pdo,
    'sellers.manage'
);

$adminId = (int)$currentAdmin['id'];

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

        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER REQUEST REJECTED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    $adminId,
    'admin',
    'seller_request_rejected',
    'seller_request',
    $requestId,
    'Admin rejected seller request',
    [
        'status' => 'pending'
    ],
    [
        'status' => 'rejected'
    ],
    [
        'admin_name' => $currentAdmin['name'],
        'admin_role' => $currentAdmin['role'],
        'user_id' => (int)$request['user_id'],
        'rejection_reason' => $reason
    ]
);

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
| ADMIN - GET SELLER VEHICLES
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/seller-vehicles'
    &&
    $method === 'GET'
) {

    requirePermission(
        $pdo,
        'seller_vehicles.review'
    );

    $statement = $pdo->query(
        'SELECT
            c.id,

            c.seller_id
                AS sellerId,

            u.name
                AS sellerName,

            u.email
                AS sellerEmail,

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

            c.created_at
                AS createdAt

         FROM cars c

         INNER JOIN users u
            ON u.id = c.seller_id

         INNER JOIN brands b
            ON b.id = c.brand_id

         WHERE c.seller_id IS NOT NULL

         ORDER BY
            CASE
                WHEN c.approval_status = \'pending\'
                THEN 0
                ELSE 1
            END,

            c.created_at DESC'
    );

    $vehicles =
        $statement->fetchAll();

    foreach (
        $vehicles
        as &$vehicle
    ) {

        $vehicle['id'] =
            (int)$vehicle['id'];

        $vehicle['sellerId'] =
            (int)$vehicle['sellerId'];

        $vehicle['brandId'] =
            (int)$vehicle['brandId'];

        $vehicle['year'] =
            (int)$vehicle['year'];

        $vehicle['price'] =
            (int)$vehicle['price'];

        $vehicle['reviewedBy'] =
            $vehicle['reviewedBy'] !== null
                ? (int)$vehicle['reviewedBy']
                : null;

        $vehicle['images'] =
            json_decode(
                $vehicle['images']
                    ?: '[]',
                true
            ) ?: [];
    }

    unset($vehicle);

    out($vehicles);
}


/*
|--------------------------------------------------------------------------
| ADMIN - APPROVE SELLER VEHICLE
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/seller-vehicles/(\d+)/approve$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {

    $currentAdmin = requirePermission(
    $pdo,
    'seller_vehicles.review'
);

$adminId = (int)$currentAdmin['id'];

    $carId =
        (int)$matches[1];

    $pdo->beginTransaction();

    try {

        /*
        |--------------------------------------------------------------------------
        | LOCK VEHICLE
        |--------------------------------------------------------------------------
        */

        $statement =
            $pdo->prepare(
                'SELECT
                    id,
                    seller_id,
                    approval_status

                 FROM cars

                 WHERE id = ?
                   AND seller_id IS NOT NULL

                 LIMIT 1
                 FOR UPDATE'
            );

        $statement->execute([
            $carId
        ]);

        $vehicle =
            $statement->fetch();

        if (!$vehicle) {
            throw new RuntimeException(
                'Seller vehicle not found'
            );
        }

        if (
            $vehicle['approval_status']
            !== 'pending'
        ) {
            throw new RuntimeException(
                'Vehicle has already been reviewed'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | APPROVE
        |--------------------------------------------------------------------------
        */

        $updateStatement =
            $pdo->prepare(
                'UPDATE cars

                 SET
                    approval_status = \'approved\',
                    rejection_reason = NULL,
                    reviewed_at = CURRENT_TIMESTAMP,
                    reviewed_by = ?

                 WHERE id = ?
                   AND seller_id IS NOT NULL'
            );

        $updateStatement->execute([
            $adminId,
            $carId
        ]);

        $pdo->commit();
        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER VEHICLE APPROVED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    $adminId,
    'admin',
    'car_approved',
    'car',
    $carId,
    'Admin approved seller vehicle',
    [
        'approval_status' => $vehicle['approval_status']
    ],
    [
        'approval_status' => 'approved'
    ],
    [
        'admin_name' => $currentAdmin['name'],
        'admin_role' => $currentAdmin['role'],
        'seller_id' => (int)$vehicle['seller_id'],
        'source' => 'seller_vehicle_review'
    ]
);

    } catch (Throwable $e) {

        if (
            $pdo->inTransaction()
        ) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),

            $e->getMessage()
                === 'Seller vehicle not found'
                ? 404
                : 422
        );
    }

    out([
        'message' =>
            'Vehicle approved successfully',

        'vehicle' => [
            'id' =>
                $carId,

            'approvalStatus' =>
                'approved'
        ]
    ]);
}


/*
|--------------------------------------------------------------------------
| ADMIN - REJECT SELLER VEHICLE
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/seller-vehicles/(\d+)/reject$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {

    $currentAdmin = requirePermission(
    $pdo,
    'seller_vehicles.review'
);

$adminId = (int)$currentAdmin['id'];

    $carId =
        (int)$matches[1];

    $b =
        body();

    $reason =
        trim(
            (string)(
                $b['reason']
                ?? ''
            )
        );

    if ($reason === '') {
        fail(
            'Rejection reason is required',
            422
        );
    }

    if (
        strlen($reason)
        > 500
    ) {
        fail(
            'Rejection reason is too long',
            422
        );
    }


    $pdo->beginTransaction();

    try {

        /*
        |--------------------------------------------------------------------------
        | LOCK VEHICLE
        |--------------------------------------------------------------------------
        */

        $statement =
            $pdo->prepare(
                'SELECT
                    id,
                    seller_id,
                    approval_status

                 FROM cars

                 WHERE id = ?
                   AND seller_id IS NOT NULL

                 LIMIT 1
                 FOR UPDATE'
            );

        $statement->execute([
            $carId
        ]);

        $vehicle =
            $statement->fetch();

        if (!$vehicle) {
            throw new RuntimeException(
                'Seller vehicle not found'
            );
        }

        if (
            $vehicle['approval_status']
            !== 'pending'
        ) {
            throw new RuntimeException(
                'Vehicle has already been reviewed'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | REJECT
        |--------------------------------------------------------------------------
        */

        $updateStatement =
            $pdo->prepare(
                'UPDATE cars

                 SET
                    approval_status = \'rejected\',
                    rejection_reason = ?,
                    reviewed_at = CURRENT_TIMESTAMP,
                    reviewed_by = ?

                 WHERE id = ?
                   AND seller_id IS NOT NULL'
            );

        $updateStatement->execute([
            $reason,
            $adminId,
            $carId
        ]);

        $pdo->commit();
        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER VEHICLE REJECTED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    $adminId,
    'admin',
    'car_rejected',
    'car',
    $carId,
    'Admin rejected seller vehicle',
    [
        'approval_status' => $vehicle['approval_status']
    ],
    [
        'approval_status' => 'rejected'
    ],
    [
        'admin_name' => $currentAdmin['name'],
        'admin_role' => $currentAdmin['role'],
        'seller_id' => (int)$vehicle['seller_id'],
        'rejection_reason' => $reason,
        'source' => 'seller_vehicle_review'
    ]
);

    } catch (Throwable $e) {

        if (
            $pdo->inTransaction()
        ) {
            $pdo->rollBack();
        }

        fail(
            $e->getMessage(),

            $e->getMessage()
                === 'Seller vehicle not found'
                ? 404
                : 422
        );
    }

    out([
        'message' =>
            'Vehicle rejected successfully',

        'vehicle' => [
            'id' =>
                $carId,

            'approvalStatus' =>
                'rejected',

            'rejectionReason' =>
                $reason
        ]
    ]);
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
    $seller = approvedSeller($pdo);
    $b = body();

    $name = trim((string)($b['name'] ?? ''));
    $brandId = (int)($b['brandId'] ?? 0);
    $year = (int)($b['year'] ?? 0);
    $price = (int)($b['price'] ?? 0);
    $color = trim((string)($b['color'] ?? ''));
    $colorHex = trim((string)($b['colorHex'] ?? ''));
    $description = trim((string)($b['description'] ?? ''));
    $thumbnail = trim((string)($b['thumbnail'] ?? ''));
    $modelPath = trim((string)($b['modelPath'] ?? ''));

    $images =
        isset($b['images']) && is_array($b['images'])
            ? array_values(array_filter($b['images'], 'is_string'))
            : [];

    $specs =
        isset($b['specs']) && is_array($b['specs'])
            ? $b['specs']
            : [];

    $features =
        isset($b['features']) && is_array($b['features'])
            ? $b['features']
            : [];

    if ($name === '') {
        fail('Vehicle name is required', 422);
    }

    if ($brandId <= 0) {
        fail('Brand is required', 422);
    }

    if ($year < 1950 || $year > 2035) {
        fail('Invalid model year', 422);
    }

    if ($price < 1000) {
        fail('Invalid vehicle price', 422);
    }

    if (strlen($description) < 10) {
        fail('Description must contain at least 10 characters', 422);
    }

    if (count($images) > 10) {
        fail('Maximum 10 gallery images', 422);
    }

    if ($color === '') {
        fail('Vehicle color is required', 422);
    }

    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $colorHex)) {
        fail('Invalid vehicle color', 422);
    }

    if ($thumbnail === '') {
        fail('Vehicle image is required', 422);
    }

    if ($modelPath === '') {
        fail('3D model is required', 422);
    }

    if (!str_starts_with($thumbnail, 'http://localhost/seller-img/')) {
        fail('Invalid seller image URL', 422);
    }

    if (!str_starts_with($modelPath, 'http://localhost/seller-car-storage/')) {
        fail('Invalid seller model URL', 422);
    }

    foreach ($images as $image) {
        if (!str_starts_with($image, 'http://localhost/seller-img/')) {
            fail('Invalid seller gallery image URL', 422);
        }
    }

    $pdo->beginTransaction();

    try {
        $statement = $pdo->prepare(
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
            $color,
            $colorHex,
            $description,
            $thumbnail,
            json_encode($images, JSON_UNESCAPED_SLASHES),
            $modelPath,
            0,
            json_encode($specs, JSON_UNESCAPED_SLASHES),
            json_encode($features, JSON_UNESCAPED_SLASHES),
        ]);

        $carId = (int)$pdo->lastInsertId();

        $pdo->commit();

        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER VEHICLE CREATED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$seller['id'],
    'seller',
    'car_created',
    'car',
    $carId,
    'Seller submitted a new vehicle',
    null,
    [
        'approval_status' => 'pending',
        'name' => $name,
        'brand_id' => $brandId,
        'year' => $year,
        'price' => $price,
        'color' => $color
    ],
    [
        'seller_name' => $seller['name'],
        'seller_email' => $seller['email'],
        'source' => 'seller_vehicle'
    ]
);

        out(
            [
                'message' => 'Vehicle submitted for review',
                'vehicle' => [
                    'id' => $carId,
                    'sellerId' => $seller['id'],
                    'approvalStatus' => 'pending'
                ]
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
    $seller = approvedSeller($pdo);
    $carId = (int)$matches[1];
    $b = body();

    $currentStatement = $pdo->prepare(
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

    $currentCar = $currentStatement->fetch();

    if (!$currentCar) {
        fail('Vehicle not found', 404);
    }

    $oldFiles = [];

    if (!empty($currentCar['thumbnail'])) {
        $oldFiles[] = $currentCar['thumbnail'];
    }

    if (!empty($currentCar['model_path'])) {
        $oldFiles[] = $currentCar['model_path'];
    }

    $oldImages =
        json_decode(
            $currentCar['images'] ?: '[]',
            true
        ) ?: [];

    foreach ($oldImages as $oldImage) {
        $oldFiles[] = $oldImage;
    }

    $oldVariantStatement = $pdo->prepare(
        'SELECT thumbnail_url, model_url
         FROM car_variants
         WHERE car_id = ?'
    );

    $oldVariantStatement->execute([$carId]);

    foreach ($oldVariantStatement->fetchAll() as $oldVariant) {
        if (!empty($oldVariant['thumbnail_url'])) {
            $oldFiles[] = $oldVariant['thumbnail_url'];
        }

        if (!empty($oldVariant['model_url'])) {
            $oldFiles[] = $oldVariant['model_url'];
        }
    }

    $name = trim((string)($b['name'] ?? ''));
    $brandId = (int)($b['brandId'] ?? 0);
    $year = (int)($b['year'] ?? 0);
    $price = (int)($b['price'] ?? 0);
    $color = trim((string)($b['color'] ?? ''));
    $colorHex = trim((string)($b['colorHex'] ?? ''));
    $description = trim((string)($b['description'] ?? ''));
    $thumbnail = trim((string)($b['thumbnail'] ?? ''));
    $modelPath = trim((string)($b['modelPath'] ?? ''));

    $images =
        isset($b['images']) && is_array($b['images'])
            ? array_values(array_filter($b['images'], 'is_string'))
            : [];

    $specs =
        isset($b['specs']) && is_array($b['specs'])
            ? $b['specs']
            : [];

    $features =
        isset($b['features']) && is_array($b['features'])
            ? $b['features']
            : [];

    if ($name === '') {
        fail('Vehicle name is required', 422);
    }

    if ($brandId <= 0) {
        fail('Brand is required', 422);
    }

    if ($year < 1950 || $year > 2035) {
        fail('Invalid model year', 422);
    }

    if ($price < 1000) {
        fail('Invalid vehicle price', 422);
    }

    if (strlen($description) < 10) {
        fail('Description must contain at least 10 characters', 422);
    }

    if (count($images) > 10) {
        fail('Maximum 10 gallery images', 422);
    }

    if ($color === '') {
        fail('Vehicle color is required', 422);
    }

    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $colorHex)) {
        fail('Invalid vehicle color', 422);
    }

    if ($thumbnail === '') {
        fail('Vehicle image is required', 422);
    }

    if ($modelPath === '') {
        fail('3D model is required', 422);
    }

    if (!str_starts_with($thumbnail, 'http://localhost/seller-img/')) {
        fail('Invalid seller image URL', 422);
    }

    if (!str_starts_with($modelPath, 'http://localhost/seller-car-storage/')) {
        fail('Invalid seller model URL', 422);
    }

    foreach ($images as $image) {
        if (!str_starts_with($image, 'http://localhost/seller-img/')) {
            fail('Invalid seller gallery image URL', 422);
        }
    }

    $newFiles = array_merge(
        $images,
        [$thumbnail, $modelPath]
    );

    $pdo->beginTransaction();

    try {
        $updateStatement = $pdo->prepare(
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
            $color,
            $colorHex,
            $description,
            $thumbnail,
            json_encode($images, JSON_UNESCAPED_SLASHES),
            $modelPath,
            json_encode($specs, JSON_UNESCAPED_SLASHES),
            json_encode($features, JSON_UNESCAPED_SLASHES),
            $carId,
            $seller['id']
        ]);

        $deleteVariants = $pdo->prepare(
            'DELETE FROM car_variants
             WHERE car_id = ?'
        );

        $deleteVariants->execute([$carId]);

        $pdo->commit();
        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER VEHICLE UPDATED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$seller['id'],
    'seller',
    'car_updated',
    'car',
    $carId,
    'Seller updated a vehicle',
    [
        'approval_status' => $currentCar['approval_status'],
        'name' => $currentCar['name'],
        'brand_id' => (int)$currentCar['brand_id'],
        'year' => (int)$currentCar['year'],
        'price' => (int)$currentCar['price'],
        'color' => $currentCar['color']
    ],
    [
        'approval_status' => 'pending',
        'name' => $name,
        'brand_id' => $brandId,
        'year' => $year,
        'price' => $price,
        'color' => $color
    ],
    [
        'seller_name' => $seller['name'],
        'seller_email' => $seller['email'],
        'source' => 'seller_vehicle'
    ]
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

    $oldFiles = array_unique(array_filter($oldFiles));
    $newFiles = array_unique(array_filter($newFiles));

    foreach ($oldFiles as $oldFile) {
        if (!in_array($oldFile, $newFiles, true)) {
            deleteSellerUpload($oldFile);
        }
    }

    out([
        'message' => 'Vehicle updated and submitted for review',
        'vehicle' => [
            'id' => $carId,
            'approvalStatus' => 'pending'
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
            name,
            brand_id,
            year,
            price,
            color,
            approval_status,
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
        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER VEHICLE DELETED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$seller['id'],
    'seller',
    'car_deleted',
    'car',
    $carId,
    'Seller deleted a vehicle',
    [
        'approval_status' => $car['approval_status'],
        'name' => $car['name'],
        'brand_id' => (int)$car['brand_id'],
        'year' => (int)$car['year'],
        'price' => (int)$car['price'],
        'color' => $car['color']
    ],
    null,
    [
        'seller_name' => $seller['name'],
        'seller_email' => $seller['email'],
        'source' => 'seller_vehicle'
    ]
);

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
/*
|--------------------------------------------------------------------------
| SELLER - GET VEHICLE TEST DRIVE AVAILABILITY
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^sellers/cars/(\d+)/availability$#',
        $route,
        $matches
    )
    &&
    $method === 'GET'
) {

    $seller = approvedSeller($pdo);

    $carId = (int)$matches[1];


    /*
    |--------------------------------------------------------------------------
    | VERIFY VEHICLE OWNERSHIP
    |--------------------------------------------------------------------------
    */

    $carStatement = $pdo->prepare(
        'SELECT id, name
         FROM cars
         WHERE id = ?
           AND seller_id = ?
         LIMIT 1'
    );

    $carStatement->execute([
        $carId,
        $seller['id']
    ]);

    $car = $carStatement->fetch();

    if (!$car) {
        fail(
            'Vehicle not found or does not belong to you',
            404
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GET AVAILABILITY
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'SELECT
            id,
            seller_id AS sellerId,
            car_id AS carId,
            day_of_week AS dayOfWeek,
            start_time AS startTime,
            end_time AS endTime,
            slot_duration AS slotDuration,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt

         FROM seller_test_drive_availability

         WHERE seller_id = ?
           AND car_id = ?

         ORDER BY
            day_of_week ASC,
            start_time ASC'
    );

    $statement->execute([
        $seller['id'],
        $carId
    ]);

    $availability =
        $statement->fetchAll();

    foreach ($availability as &$item) {

        $item['id'] =
            (int)$item['id'];

        $item['sellerId'] =
            (int)$item['sellerId'];

        $item['carId'] =
            (int)$item['carId'];

        $item['dayOfWeek'] =
            (int)$item['dayOfWeek'];

        $item['slotDuration'] =
            (int)$item['slotDuration'];

        $item['isActive'] =
            (bool)$item['isActive'];
    }

    unset($item);

    out([
        'car' => [
            'id' => (int)$car['id'],
            'name' => $car['name']
        ],

        'availability' =>
            $availability
    ]);
}


/*
|--------------------------------------------------------------------------
| SELLER - ADD VEHICLE TEST DRIVE AVAILABILITY
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^sellers/cars/(\d+)/availability$#',
        $route,
        $matches
    )
    &&
    $method === 'POST'
) {

    $seller = approvedSeller($pdo);

    $carId =
        (int)$matches[1];

    $b = body();


    /*
    |--------------------------------------------------------------------------
    | VERIFY VEHICLE OWNERSHIP
    |--------------------------------------------------------------------------
    */

    $carStatement = $pdo->prepare(
        'SELECT
            id,
            name,
            approval_status

         FROM cars

         WHERE id = ?
           AND seller_id = ?

         LIMIT 1'
    );

    $carStatement->execute([
        $carId,
        $seller['id']
    ]);

    $car =
        $carStatement->fetch();

    if (!$car) {
        fail(
            'Vehicle not found or does not belong to you',
            404
        );
    }


    /*
    |--------------------------------------------------------------------------
    | INPUT
    |--------------------------------------------------------------------------
    */

    $dayOfWeek =
        (int)($b['dayOfWeek'] ?? -1);

    $startTime =
        trim(
            (string)(
                $b['startTime']
                ?? ''
            )
        );

    $endTime =
        trim(
            (string)(
                $b['endTime']
                ?? ''
            )
        );

    $slotDuration =
        (int)(
            $b['slotDuration']
            ?? 30
        );


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
        $dayOfWeek < 0
        ||
        $dayOfWeek > 6
    ) {
        fail(
            'Invalid day of week',
            422
        );
    }

    if (
        !preg_match(
            '/^\d{2}:\d{2}$/',
            $startTime
        )
    ) {
        fail(
            'Invalid start time',
            422
        );
    }

    if (
        !preg_match(
            '/^\d{2}:\d{2}$/',
            $endTime
        )
    ) {
        fail(
            'Invalid end time',
            422
        );
    }

    if (
        strtotime($endTime)
        <=
        strtotime($startTime)
    ) {
        fail(
            'End time must be after start time',
            422
        );
    }

    if (
        $slotDuration < 15
        ||
        $slotDuration > 180
    ) {
        fail(
            'Slot duration must be between 15 and 180 minutes',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE / OVERLAPPING AVAILABILITY
    |--------------------------------------------------------------------------
    */

    $overlapStatement =
        $pdo->prepare(
            'SELECT id

             FROM seller_test_drive_availability

             WHERE seller_id = ?
               AND car_id = ?
               AND day_of_week = ?
               AND is_active = 1

               AND (
                    start_time < ?
                    AND end_time > ?
               )

             LIMIT 1'
        );

    $overlapStatement->execute([
        $seller['id'],
        $carId,
        $dayOfWeek,
        $endTime,
        $startTime
    ]);

    if (
        $overlapStatement->fetch()
    ) {
        fail(
            'This availability overlaps with an existing time range',
            409
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE AVAILABILITY
    |--------------------------------------------------------------------------
    */

    $statement =
        $pdo->prepare(
            'INSERT INTO seller_test_drive_availability
            (
                seller_id,
                car_id,
                day_of_week,
                start_time,
                end_time,
                slot_duration,
                is_active
            )

            VALUES
            (
                ?, ?, ?, ?, ?, ?, 1
            )'
        );

    $statement->execute([
        $seller['id'],
        $carId,
        $dayOfWeek,
        $startTime,
        $endTime,
        $slotDuration
    ]);

    $availabilityId =
        (int)$pdo->lastInsertId();

        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER AVAILABILITY CREATED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$seller['id'],
    'seller',
    'availability_created',
    'seller_availability',
    $availabilityId,
    'Seller added test drive availability',
    null,
    [
        'car_id' => $carId,
        'day_of_week' => $dayOfWeek,
        'start_time' => $startTime,
        'end_time' => $endTime,
        'slot_duration' => $slotDuration,
        'is_active' => true
    ],
    [
        'seller_name' => $seller['name'],
        'seller_email' => $seller['email'],
        'source' => 'seller_availability'
    ]
);

    out(
        [
            'message' =>
                'Availability added successfully',

            'availability' => [
                'id' =>
                    $availabilityId,

                'sellerId' =>
                    $seller['id'],

                'carId' =>
                    $carId,

                'dayOfWeek' =>
                    $dayOfWeek,

                'startTime' =>
                    $startTime,

                'endTime' =>
                    $endTime,

                'slotDuration' =>
                    $slotDuration,

                'isActive' =>
                    true
            ]
        ],
        201
    );
}


/*
|--------------------------------------------------------------------------
| SELLER - DELETE VEHICLE TEST DRIVE AVAILABILITY
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^sellers/cars/(\d+)/availability/(\d+)$#',
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

    $availabilityId =
        (int)$matches[2];


    /*
    |--------------------------------------------------------------------------
    | VERIFY VEHICLE OWNERSHIP
    |--------------------------------------------------------------------------
    */

    $carStatement =
        $pdo->prepare(
            'SELECT id

             FROM cars

             WHERE id = ?
               AND seller_id = ?

             LIMIT 1'
        );

    $carStatement->execute([
        $carId,
        $seller['id']
    ]);

    if (
        !$carStatement->fetch()
    ) {
        fail(
            'Vehicle not found or does not belong to you',
            404
        );
    }
    /*
|--------------------------------------------------------------------------
| GET AVAILABILITY BEFORE DELETE
|--------------------------------------------------------------------------
*/

$availabilityStatement =
    $pdo->prepare(
        'SELECT
            id,
            day_of_week,
            start_time,
            end_time,
            slot_duration,
            is_active
         FROM seller_test_drive_availability
         WHERE id = ?
           AND car_id = ?
           AND seller_id = ?
         LIMIT 1'
    );

$availabilityStatement->execute([
    $availabilityId,
    $carId,
    $seller['id']
]);

$oldAvailability =
    $availabilityStatement->fetch();

if (!$oldAvailability) {
    fail(
        'Availability not found',
        404
    );
}


    /*
    |--------------------------------------------------------------------------
    | DELETE AVAILABILITY
    |--------------------------------------------------------------------------
    */

    $statement =
        $pdo->prepare(
            'DELETE
             FROM seller_test_drive_availability

             WHERE id = ?
               AND car_id = ?
               AND seller_id = ?'
        );

    $statement->execute([
        $availabilityId,
        $carId,
        $seller['id']
    ]);

    if (
        $statement->rowCount() === 0
    ) {
        fail(
            'Availability not found',
            404
        );
    }
    /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER AVAILABILITY DELETED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$seller['id'],
    'seller',
    'availability_deleted',
    'seller_availability',
    $availabilityId,
    'Seller deleted test drive availability',
    [
        'car_id' => $carId,
        'day_of_week' => (int)$oldAvailability['day_of_week'],
        'start_time' => $oldAvailability['start_time'],
        'end_time' => $oldAvailability['end_time'],
        'slot_duration' => (int)$oldAvailability['slot_duration'],
        'is_active' => (bool)$oldAvailability['is_active']
    ],
    null,
    [
        'seller_name' => $seller['name'],
        'seller_email' => $seller['email'],
        'source' => 'seller_availability'
    ]
);

    out([
        'message' =>
            'Availability deleted successfully'
    ]);
}