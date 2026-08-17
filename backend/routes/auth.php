<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| USER REGISTER
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/register'
    &&
    $method === 'POST'
) {
    $b = body();

    /*
    |--------------------------------------------------------------------------
    | READ DATA
    |--------------------------------------------------------------------------
    */

    $name = trim(
        (string)($b['name'] ?? '')
    );

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $phone = trim(
        (string)($b['phone'] ?? '')
    );

    $password =
        (string)($b['password'] ?? '');


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($name === '') {
        fail(
            'Full name is required',
            422
        );
    }


    if (
        $email === ''
        ||
        !filter_var(
            $email,
            FILTER_VALIDATE_EMAIL
        )
    ) {
        fail(
            'Valid email is required',
            422
        );
    }


    if ($phone === '') {
        fail(
            'Phone number is required',
            422
        );
    }


    if (strlen($password) < 8) {
        fail(
            'Password must be at least 8 characters',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK IF EMAIL ALREADY EXISTS
    |--------------------------------------------------------------------------
    */

    $checkStatement = $pdo->prepare(
        'SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1'
    );

    $checkStatement->execute([
        $email
    ]);

    if ($checkStatement->fetch()) {
        fail(
            'An account with this email already exists',
            409
        );
    }


    /*
    |--------------------------------------------------------------------------
    | HASH PASSWORD
    |--------------------------------------------------------------------------
    */

    $passwordHash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    if ($passwordHash === false) {
        fail(
            'Could not secure password',
            500
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE USER
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'INSERT INTO users
        (
            name,
            email,
            phone,
            password_hash
        )
        VALUES (?, ?, ?, ?)'
    );

    $statement->execute([
        $name,
        $email,
        $phone,
        $passwordHash
    ]);


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out(
        [
            'user' => [
                'id' =>
                    (int)$pdo->lastInsertId(),

                'name' =>
                    $name,

                'email' =>
                    $email,

                'phone' =>
                    $phone,
            ]
        ],
        201
    );
}
/*
|--------------------------------------------------------------------------
| USER LOGIN
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/login'
    &&
    $method === 'POST'
) {
    $b = body();

    /*
    |--------------------------------------------------------------------------
    | READ DATA
    |--------------------------------------------------------------------------
    */

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $password =
        (string)($b['password'] ?? '');


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
        $email === ''
        ||
        !filter_var(
            $email,
            FILTER_VALIDATE_EMAIL
        )
    ) {
        fail(
            'Valid email is required',
            422
        );
    }

    if ($password === '') {
        fail(
            'Password is required',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | FIND USER
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            phone,
            password_hash
         FROM users
         WHERE email = ?
         LIMIT 1'
    );

    $statement->execute([
        $email
    ]);

    $user = $statement->fetch();


    /*
    |--------------------------------------------------------------------------
    | VERIFY LOGIN
    |--------------------------------------------------------------------------
    */

    if (
        !$user
        ||
        !password_verify(
            $password,
            $user['password_hash']
        )
    ) {
        fail(
            'Invalid email or password',
            401
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE TOKENS
    |--------------------------------------------------------------------------
    */

    $accessToken =
    createUserAccessToken([
        'id' => (int)$user['id'],
        'email' => $user['email'],
    ]);

$refresh =
    createRefreshToken();

$refreshToken =
    $refresh['token'];
    $refreshStatement = $pdo->prepare(
    'INSERT INTO refresh_tokens
    (
        admin_id,
        user_id,
        token_hash,
        expires_at,
        revoked
    )
    VALUES
    (
        NULL,
        ?,
        ?,
        ?,
        0
    )'
);

$refreshStatement->execute([
    (int)$user['id'],
    $refresh['tokenHash'],
    $refresh['expiresAt']
]);


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
        'accessToken' => $accessToken,

        'refreshToken' => $refreshToken,

        'user' => [
            'id' =>
                (int)$user['id'],

            'name' =>
                $user['name'],

            'email' =>
                $user['email'],

            'phone' =>
                $user['phone'],
        ]
    ]);
}
/*
|--------------------------------------------------------------------------
| USER PROFILE
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/profile'
    &&
    $method === 'GET'
) {
    

    /*
|--------------------------------------------------------------------------
| GET USER ACCESS TOKEN
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


    /*
    |--------------------------------------------------------------------------
    | VERIFY USER TOKEN
    |--------------------------------------------------------------------------
    */

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


    /*
    |--------------------------------------------------------------------------
    | GET USER ID FROM TOKEN
    |--------------------------------------------------------------------------
    */

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
    | GET USER FROM DATABASE
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'SELECT
            id,
            name,
            email,
            phone,
            created_at,
            updated_at
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


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
        'user' => [
            'id' =>
                (int)$user['id'],

            'name' =>
                $user['name'],

            'email' =>
                $user['email'],

            'phone' =>
                $user['phone'],

            'createdAt' =>
                $user['created_at'],

            'updatedAt' =>
                $user['updated_at'],
        ]
    ]);
}
/*
|--------------------------------------------------------------------------
| USER LOGOUT
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/logout'
    &&
    $method === 'POST'
) {
    $b = body();

    $refreshToken = trim(
        (string)($b['refreshToken'] ?? '')
    );

    if ($refreshToken === '') {
        fail(
            'Refresh token is required',
            400
        );
    }

    $tokenHash = hash(
        'sha256',
        $refreshToken
    );

    $statement = $pdo->prepare(
        'UPDATE refresh_tokens
         SET revoked = 1
         WHERE token_hash = ?
           AND user_id IS NOT NULL
           AND revoked = 0'
    );

    $statement->execute([
        $tokenHash
    ]);

    out([
        'success' => true
    ]);
}
/*
|--------------------------------------------------------------------------
| USER REFRESH ACCESS TOKEN
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/refresh'
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
        (string)($b['refreshToken'] ?? '')
    );

    if ($refreshToken === '') {
        fail(
            'Refresh token is required',
            400
        );
    }


    /*
    |--------------------------------------------------------------------------
    | HASH REFRESH TOKEN
    |--------------------------------------------------------------------------
    */

    $tokenHash = hash(
        'sha256',
        $refreshToken
    );


    /*
    |--------------------------------------------------------------------------
    | FIND VALID USER REFRESH TOKEN
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'SELECT
            rt.id,
            rt.user_id,
            rt.expires_at,
            rt.revoked,
            u.email
         FROM refresh_tokens rt
         INNER JOIN users u
            ON u.id = rt.user_id
         WHERE rt.token_hash = ?
           AND rt.user_id IS NOT NULL
         LIMIT 1'
    );

    $statement->execute([
        $tokenHash
    ]);

    $tokenRow = $statement->fetch();


    /*
    |--------------------------------------------------------------------------
    | VERIFY REFRESH TOKEN
    |--------------------------------------------------------------------------
    */

    if (!$tokenRow) {
        fail(
            'Invalid refresh token',
            401
        );
    }

    if ((int)$tokenRow['revoked'] === 1) {
        fail(
            'Refresh token has been revoked',
            401
        );
    }

    if (
        strtotime($tokenRow['expires_at'])
        <= time()
    ) {
        fail(
            'Refresh token has expired',
            401
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE NEW ACCESS TOKEN
    |--------------------------------------------------------------------------
    */

    $accessToken =
        createUserAccessToken([
            'id' =>
                (int)$tokenRow['user_id'],

            'email' =>
                $tokenRow['email'],
        ]);


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
        'accessToken' => $accessToken
    ]);
}