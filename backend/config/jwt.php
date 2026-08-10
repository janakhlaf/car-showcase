<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| LOAD ENV
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/env.php';


/*
|--------------------------------------------------------------------------
| JWT CONFIG
|--------------------------------------------------------------------------
*/

$jwtSecret = getenv('JWT_SECRET');

if ($jwtSecret === false || $jwtSecret === '') {
    throw new RuntimeException(
        'JWT_SECRET is not configured in .env'
    );
}

define('JWT_SECRET', $jwtSecret);


$jwtAccessTtl = getenv('JWT_ACCESS_TTL');

define(
    'JWT_ACCESS_TTL',
    $jwtAccessTtl !== false && $jwtAccessTtl !== ''
        ? (int)$jwtAccessTtl
        : 900
);


/*
|--------------------------------------------------------------------------
| BASE64 URL ENCODE
|--------------------------------------------------------------------------
*/

function base64UrlEncode(string $data): string
{
    return rtrim(
        strtr(
            base64_encode($data),
            '+/',
            '-_'
        ),
        '='
    );
}


/*
|--------------------------------------------------------------------------
| BASE64 URL DECODE
|--------------------------------------------------------------------------
*/

function base64UrlDecode(string $data): string|false
{
    $padding = strlen($data) % 4;

    if ($padding !== 0) {
        $data .= str_repeat(
            '=',
            4 - $padding
        );
    }

    return base64_decode(
        strtr(
            $data,
            '-_',
            '+/'
        ),
        true
    );
}


/*
|--------------------------------------------------------------------------
| CREATE ACCESS TOKEN
|--------------------------------------------------------------------------
*/

function createAccessToken(array $admin): string
{
    /*
    |--------------------------------------------------------------------------
    | JWT HEADER
    |--------------------------------------------------------------------------
    */

    $header = [
        'alg' => 'HS256',
        'typ' => 'JWT'
    ];


    /*
    |--------------------------------------------------------------------------
    | JWT PAYLOAD
    |--------------------------------------------------------------------------
    */

    $now = time();

    $payload = [
        'sub' => (int)$admin['id'],
        'email' => $admin['email'],
        'role' => 'admin',

        // وقت إنشاء التوكن
        'iat' => $now,

        // وقت انتهاء التوكن
        'exp' => $now + JWT_ACCESS_TTL
    ];


    /*
    |--------------------------------------------------------------------------
    | ENCODE HEADER
    |--------------------------------------------------------------------------
    */

    $headerJson = json_encode(
        $header,
        JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );

    $encodedHeader = base64UrlEncode(
        $headerJson
    );


    /*
    |--------------------------------------------------------------------------
    | ENCODE PAYLOAD
    |--------------------------------------------------------------------------
    */

    $payloadJson = json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );

    $encodedPayload = base64UrlEncode(
        $payloadJson
    );


    /*
    |--------------------------------------------------------------------------
    | HEADER + PAYLOAD
    |--------------------------------------------------------------------------
    */

    $data =
        $encodedHeader
        . '.'
        . $encodedPayload;


    /*
    |--------------------------------------------------------------------------
    | CREATE SIGNATURE
    |--------------------------------------------------------------------------
    */

    $signature = hash_hmac(
        'sha256',
        $data,
        JWT_SECRET,
        true
    );


    /*
    |--------------------------------------------------------------------------
    | ENCODE SIGNATURE
    |--------------------------------------------------------------------------
    */

    $encodedSignature = base64UrlEncode(
        $signature
    );


    /*
    |--------------------------------------------------------------------------
    | FINAL JWT
    |--------------------------------------------------------------------------
    */

    return
        $encodedHeader
        . '.'
        . $encodedPayload
        . '.'
        . $encodedSignature;
}
/*
|--------------------------------------------------------------------------
| VERIFY ACCESS TOKEN
|--------------------------------------------------------------------------
*/

function verifyAccessToken(string $token): array
{
    $parts = explode('.', $token);

    if (count($parts) !== 3) {
        throw new RuntimeException('Invalid token');
    }

    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $headerJson = base64UrlDecode($encodedHeader);
$payloadJson = base64UrlDecode($encodedPayload);

if ($headerJson === false || $payloadJson === false) {
    throw new RuntimeException('Invalid token encoding');
}

$header = json_decode(
    $headerJson,
    true,
    512,
    JSON_THROW_ON_ERROR
);

$payload = json_decode(
    $payloadJson,
    true,
    512,
    JSON_THROW_ON_ERROR
);


/*
|--------------------------------------------------------------------------
| VERIFY ALGORITHM
|--------------------------------------------------------------------------
*/

if (
    !isset($header['alg'])
    ||
    $header['alg'] !== 'HS256'
) {
    throw new RuntimeException(
        'Invalid token algorithm'
    );
}


/*
|--------------------------------------------------------------------------
| RECREATE SIGNATURE
|--------------------------------------------------------------------------
*/

$data =
    $encodedHeader
    . '.'
    . $encodedPayload;


$expectedSignature = hash_hmac(
    'sha256',
    $data,
    JWT_SECRET,
    true
);


/*
|--------------------------------------------------------------------------
| DECODE RECEIVED SIGNATURE
|--------------------------------------------------------------------------
*/

$receivedSignature =
    base64UrlDecode(
        $encodedSignature
    );


if ($receivedSignature === false) {
    throw new RuntimeException(
        'Invalid token signature encoding'
    );
}


/*
|--------------------------------------------------------------------------
| COMPARE SIGNATURES
|--------------------------------------------------------------------------
*/

if (
    !hash_equals(
        $expectedSignature,
        $receivedSignature
    )
) {
    throw new RuntimeException(
        'Invalid token signature'
    );
}


/*
|--------------------------------------------------------------------------
| VERIFY EXPIRATION
|--------------------------------------------------------------------------
*/

if (
    !isset($payload['exp'])
    ||
    !is_numeric($payload['exp'])
) {
    throw new RuntimeException(
        'Invalid token expiration'
    );
}

if ((int)$payload['exp'] < time()) {
    throw new RuntimeException(
        'Token expired'
    );
}


/*
|--------------------------------------------------------------------------
| VERIFY ROLE
|--------------------------------------------------------------------------
*/

if (
    !isset($payload['role'])
    ||
    $payload['role'] !== 'admin'
) {
    throw new RuntimeException(
        'Unauthorized role'
    );
}


/*
|--------------------------------------------------------------------------
| RETURN PAYLOAD
|--------------------------------------------------------------------------
*/

return $payload;
}

/*
|--------------------------------------------------------------------------
| CREATE REFRESH TOKEN
|--------------------------------------------------------------------------
*/

function createRefreshToken(): array
{
    // التوكن الأصلي
    $token = bin2hex(
        random_bytes(32)
    );

    // نخزن فقط الـ hash في MySQL
    $tokenHash = hash(
        'sha256',
        $token
    );

    // 7 أيام من الآن
    $expiresAt = date(
        'Y-m-d H:i:s',
        time() + 604800
    );

    return [
        'token' => $token,
        'tokenHash' => $tokenHash,
        'expiresAt' => $expiresAt
    ];
}
