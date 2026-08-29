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

    /*
    |--------------------------------------------------------------------------
    | VALIDATE INTERNATIONAL PHONE NUMBER
    |--------------------------------------------------------------------------
    |
    | Supported country codes:
    | Palestine +970
    | Israel    +972
    |
    | Stored format example:
    | 970599123456
    |
    */

    $phone = preg_replace(
        '/\D+/',
        '',
        $phone
    );

    if (
        !preg_match(
            '/^(970|972)5\d{8}$/',
            $phone
        )
    ) {
        fail(
            'Enter a valid phone number with +970 or +972',
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
| CREATE ACCOUNT VERIFICATION OTP
|--------------------------------------------------------------------------
*/

$userId = (int)$pdo->lastInsertId();

$otp = (string)random_int(
    100000,
    999999
);

$otpHash = password_hash(
    $otp,
    PASSWORD_DEFAULT
);

if ($otpHash === false) {
    fail(
        'Could not generate verification code',
        500
    );
}

$expiresAt =
    (new DateTime())
        ->modify('+5 minutes')
        ->format('Y-m-d H:i:s');


/*
|--------------------------------------------------------------------------
| STORE ACCOUNT VERIFICATION OTP
|--------------------------------------------------------------------------
*/

$otpStatement = $pdo->prepare(
    'INSERT INTO account_verification_otps
    (
        user_id,
        otp_hash,
        expires_at,
        attempts,
        verified_at,
        used_at
    )
    VALUES
    (
        ?, ?, ?, 0, NULL, NULL
    )'
);

$otpStatement->execute([
    $userId,
    $otpHash,
    $expiresAt
]);


/*
|--------------------------------------------------------------------------
| SEND ACCOUNT VERIFICATION EMAIL
|--------------------------------------------------------------------------
*/

$emailBody = '
    <div style="
        font-family: Arial, sans-serif;
        max-width: 520px;
        margin: 0 auto;
        padding: 32px;
        background: #111111;
        color: #ffffff;
        border-radius: 16px;
    ">
        <h2 style="
            margin: 0 0 16px;
            color: #d7b36a;
        ">
            VELOCE Account Verification
        </h2>

        <p style="
            color: #cccccc;
            line-height: 1.6;
        ">
            Hello ' .
            htmlspecialchars(
                $name,
                ENT_QUOTES,
                'UTF-8'
            ) .
            ',
        </p>

        <p style="
            color: #cccccc;
            line-height: 1.6;
        ">
            Use the verification code below to verify your VELOCE account:
        </p>

        <div style="
            margin: 28px 0;
            padding: 18px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            background: #1c1c1c;
            color: #d7b36a;
            border-radius: 12px;
        ">
            ' . $otp . '
        </div>

        <p style="
            color: #999999;
            font-size: 13px;
            line-height: 1.6;
        ">
            This code expires in 5 minutes.
        </p>
    </div>
';

$sent = sendEmail(
    $email,
    'VELOCE Account Verification Code',
    $emailBody
);

if (!$sent) {
    fail(
        'Could not send account verification code',
        500
    );
}
/*
|--------------------------------------------------------------------------
| ACTIVITY LOG - CUSTOMER ACCOUNT CREATED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    $userId,
    'customer',
    'account_created',
    'user',
    $userId,
    'Customer created a new account',
    null,
    [
        'name' => $name,
        'email' => $email,
        'phone' => $phone
    ],
    [
        'source' => 'customer_registration'
    ]
);
    


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out(
    [
        'message' => 'Account created. Verification code sent to your email.',

        'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'is_verified' => 0,
        ],

        'requiresVerification' => true
    ],
    201
);
}

/*
|--------------------------------------------------------------------------
| VERIFY ACCOUNT EMAIL OTP
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/verify-account'
    &&
    $method === 'POST'
) {
    $b = body();

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $otp = trim(
        (string)($b['otp'] ?? '')
    );

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

    if (
        strlen($otp) !== 6
        ||
        !ctype_digit($otp)
    ) {
        fail(
            'Invalid verification code',
            422
        );
    }

    $userStatement = $pdo->prepare(
        'SELECT
            id,
            is_verified
         FROM users
         WHERE email = ?
         LIMIT 1'
    );

    $userStatement->execute([
        $email
    ]);

    $user = $userStatement->fetch();

    if (!$user) {
        fail(
            'Account not found',
            404
        );
    }

    if ((int)$user['is_verified'] === 1) {
        out([
            'message' =>
                'Account is already verified'
        ]);
    }

    $otpStatement = $pdo->prepare(
        'SELECT
            id,
            otp_hash,
            expires_at,
            attempts,
            used_at
         FROM account_verification_otps
         WHERE user_id = ?
           AND used_at IS NULL
         ORDER BY id DESC
         LIMIT 1'
    );

    $otpStatement->execute([
        (int)$user['id']
    ]);

    $otpRow = $otpStatement->fetch();

    if (!$otpRow) {
        fail(
            'Invalid or expired verification code',
            400
        );
    }

    if (
        strtotime($otpRow['expires_at'])
        <= time()
    ) {
        fail(
            'Verification code has expired',
            400
        );
    }

    if ((int)$otpRow['attempts'] >= 5) {
        fail(
            'Too many incorrect attempts. Request a new code.',
            429
        );
    }

    if (
        !password_verify(
            $otp,
            $otpRow['otp_hash']
        )
    ) {
        $attemptStatement =
            $pdo->prepare(
                'UPDATE account_verification_otps
                 SET attempts = attempts + 1
                 WHERE id = ?'
            );

        $attemptStatement->execute([
            (int)$otpRow['id']
        ]);

        fail(
            'Invalid verification code',
            400
        );
    }

    $pdo->beginTransaction();

    try {
        $verifyUserStatement =
            $pdo->prepare(
                'UPDATE users
                 SET is_verified = 1
                 WHERE id = ?'
            );

        $verifyUserStatement->execute([
            (int)$user['id']
        ]);

        $verifyOtpStatement =
            $pdo->prepare(
                'UPDATE account_verification_otps
                 SET
                    verified_at = CURRENT_TIMESTAMP,
                    used_at = CURRENT_TIMESTAMP
                 WHERE id = ?'
            );

        $verifyOtpStatement->execute([
            (int)$otpRow['id']
        ]);

        $pdo->commit();

    } catch (Throwable $e) {
        $pdo->rollBack();

        fail(
            'Could not verify account',
            500
        );
    }

    out([
        'message' =>
            'Account verified successfully'
    ]);
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
    password_hash,
    is_verified
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
    if ((int)$user['is_verified'] !== 1) {
    fail(
        'Please verify your email before signing in',
        403
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
| FORGOT PASSWORD - SEND OTP
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/forgot-password'
    &&
    $method === 'POST'
) {
    $b = body();

    /*
    |--------------------------------------------------------------------------
    | READ EMAIL
    |--------------------------------------------------------------------------
    */

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $methodChoice = strtolower(
    trim(
        (string)($b['method'] ?? 'email')
    )
);


    /*
    |--------------------------------------------------------------------------
    | VALIDATE EMAIL
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

    if (
    !in_array(
        $methodChoice,
        ['email', 'whatsapp'],
        true
    )
) {
    fail(
        'Invalid verification method',
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
        phone
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
    | SECURITY RESPONSE
    |--------------------------------------------------------------------------
    |
    | Do not reveal whether an account exists.
    |
    */

    if (!$user) {
        out([
            'message' =>
                'If an account exists for this email, a verification code has been sent.'
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | INVALIDATE OLD OTP CODES
    |--------------------------------------------------------------------------
    */

    $invalidateStatement =
        $pdo->prepare(
            'UPDATE password_reset_otps
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = ?
               AND used_at IS NULL'
        );

    $invalidateStatement->execute([
        (int)$user['id']
    ]);


    /*
    |--------------------------------------------------------------------------
    | GENERATE 6-DIGIT OTP
    |--------------------------------------------------------------------------
    */

    $otp = (string)random_int(
        100000,
        999999
    );


    /*
    |--------------------------------------------------------------------------
    | HASH OTP
    |--------------------------------------------------------------------------
    */

    $otpHash =
        password_hash(
            $otp,
            PASSWORD_DEFAULT
        );

    if ($otpHash === false) {
        fail(
            'Could not generate verification code',
            500
        );
    }


    /*
    |--------------------------------------------------------------------------
    | EXPIRATION - 5 MINUTES
    |--------------------------------------------------------------------------
    */

    $expiresAt =
        (new DateTime())
            ->modify('+5 minutes')
            ->format('Y-m-d H:i:s');


    /*
    |--------------------------------------------------------------------------
    | STORE OTP
    |--------------------------------------------------------------------------
    */

    $insertStatement =
        $pdo->prepare(
            'INSERT INTO password_reset_otps
            (
                user_id,
                otp_hash,
                expires_at,
                attempts,
                verified_at,
                used_at
            )
            VALUES
            (
                ?, ?, ?, 0, NULL, NULL
            )'
        );

    $insertStatement->execute([
        (int)$user['id'],
        $otpHash,
        $expiresAt
    ]);


    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL
    |--------------------------------------------------------------------------
    */

    $emailBody = '
        <div style="
            font-family: Arial, sans-serif;
            max-width: 520px;
            margin: 0 auto;
            padding: 32px;
            background: #111111;
            color: #ffffff;
            border-radius: 16px;
        ">
            <h2 style="
                margin: 0 0 16px;
                color: #d7b36a;
            ">
                VELOCE Password Reset
            </h2>

            <p style="
                color: #cccccc;
                line-height: 1.6;
            ">
                Hello ' .
                htmlspecialchars(
                    $user['name'],
                    ENT_QUOTES,
                    'UTF-8'
                ) .
                ',
            </p>

            <p style="
                color: #cccccc;
                line-height: 1.6;
            ">
                Use the verification code below to reset your password:
            </p>

            <div style="
                margin: 28px 0;
                padding: 18px;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                background: #1c1c1c;
                color: #d7b36a;
                border-radius: 12px;
            ">
                ' . $otp . '
            </div>

            <p style="
                color: #999999;
                font-size: 13px;
                line-height: 1.6;
            ">
                This code expires in 5 minutes.
                If you did not request a password reset,
                you can ignore this email.
            </p>
        </div>
    ';


    $sent = false;

if ($methodChoice === 'email') {

    $sent = sendEmail(
        $user['email'],
        'VELOCE Password Reset Code',
        $emailBody
    );

} else {

    $whatsappMessage =
        "VELOCE Password Reset\n\n" .
        "Your verification code is: " .
        $otp .
        "\n\nThis code expires in 5 minutes.";

    $sent = sendWhatsAppMessage(
        $user['phone'],
        $whatsappMessage
    );
}

if (!$sent) {
    fail(
        'Could not send verification code',
        500
    );
}


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
        'message' =>
            'If an account exists for this email, a verification code has been sent.'
    ]);
}

/*
|--------------------------------------------------------------------------
| VERIFY PASSWORD RESET OTP
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/verify-reset-otp'
    &&
    $method === 'POST'
) {
    $b = body();

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $otp = trim(
        (string)($b['otp'] ?? '')
    );

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

    if (
        strlen($otp) !== 6
        ||
        !ctype_digit($otp)
    ) {
        fail(
            'Invalid verification code',
            422
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND USER
    |--------------------------------------------------------------------------
    */

    $userStatement = $pdo->prepare(
        'SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1'
    );

    $userStatement->execute([
        $email
    ]);

    $user = $userStatement->fetch();

    if (!$user) {
        fail(
            'Invalid or expired verification code',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND LATEST ACTIVE OTP
    |--------------------------------------------------------------------------
    */

    $otpStatement = $pdo->prepare(
        'SELECT
            id,
            otp_hash,
            expires_at,
            attempts,
            verified_at,
            used_at
         FROM password_reset_otps
         WHERE user_id = ?
           AND used_at IS NULL
         ORDER BY id DESC
         LIMIT 1'
    );

    $otpStatement->execute([
        (int)$user['id']
    ]);

    $otpRow = $otpStatement->fetch();

    if (!$otpRow) {
        fail(
            'Invalid or expired verification code',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EXPIRATION
    |--------------------------------------------------------------------------
    */

    if (
        strtotime($otpRow['expires_at'])
        <= time()
    ) {
        fail(
            'Verification code has expired',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LIMIT ATTEMPTS
    |--------------------------------------------------------------------------
    */

    if ((int)$otpRow['attempts'] >= 5) {
        fail(
            'Too many incorrect attempts. Request a new code.',
            429
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY OTP
    |--------------------------------------------------------------------------
    */

    if (
        !password_verify(
            $otp,
            $otpRow['otp_hash']
        )
    ) {
        $attemptStatement =
            $pdo->prepare(
                'UPDATE password_reset_otps
                 SET attempts = attempts + 1
                 WHERE id = ?'
            );

        $attemptStatement->execute([
            (int)$otpRow['id']
        ]);

        fail(
            'Invalid verification code',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | MARK OTP AS VERIFIED
    |--------------------------------------------------------------------------
    */

    $verifyStatement =
        $pdo->prepare(
            'UPDATE password_reset_otps
             SET verified_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );

    $verifyStatement->execute([
        (int)$otpRow['id']
    ]);

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
        'message' =>
            'Verification code confirmed'
    ]);
}

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

if (
    $route === 'auth/reset-password'
    &&
    $method === 'POST'
) {
    $b = body();

    $email = strtolower(
        trim(
            (string)($b['email'] ?? '')
        )
    );

    $otp = trim(
        (string)($b['otp'] ?? '')
    );

    $newPassword =
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

    if (
        strlen($otp) !== 6
        ||
        !ctype_digit($otp)
    ) {
        fail(
            'Invalid verification code',
            422
        );
    }

    if (strlen($newPassword) < 8) {
        fail(
            'Password must be at least 8 characters',
            422
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND USER
    |--------------------------------------------------------------------------
    */

    $userStatement = $pdo->prepare(
        'SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1'
    );

    $userStatement->execute([
        $email
    ]);

    $user = $userStatement->fetch();

    if (!$user) {
        fail(
            'Unable to reset password',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND VERIFIED OTP
    |--------------------------------------------------------------------------
    */

    $otpStatement = $pdo->prepare(
        'SELECT
            id,
            otp_hash,
            expires_at,
            verified_at,
            used_at
         FROM password_reset_otps
         WHERE user_id = ?
           AND verified_at IS NOT NULL
           AND used_at IS NULL
         ORDER BY id DESC
         LIMIT 1'
    );

    $otpStatement->execute([
        (int)$user['id']
    ]);

    $otpRow = $otpStatement->fetch();

    if (!$otpRow) {
        fail(
            'Verification required',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EXPIRATION
    |--------------------------------------------------------------------------
    */

    if (
        strtotime($otpRow['expires_at'])
        <= time()
    ) {
        fail(
            'Verification code has expired',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY OTP AGAIN
    |--------------------------------------------------------------------------
    */

    if (
        !password_verify(
            $otp,
            $otpRow['otp_hash']
        )
    ) {
        fail(
            'Invalid verification code',
            400
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE NEW PASSWORD HASH
    |--------------------------------------------------------------------------
    */

    $passwordHash =
        password_hash(
            $newPassword,
            PASSWORD_DEFAULT
        );

    /*
    |--------------------------------------------------------------------------
    | UPDATE PASSWORD
    |--------------------------------------------------------------------------
    */

    $updatePassword =
        $pdo->prepare(
            'UPDATE users
             SET password_hash = ?
             WHERE id = ?'
        );

    $updatePassword->execute([
        $passwordHash,
        (int)$user['id']
    ]);

    /*
    |--------------------------------------------------------------------------
    | MARK OTP AS USED
    |--------------------------------------------------------------------------
    */

    $useOtp =
        $pdo->prepare(
            'UPDATE password_reset_otps
             SET used_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );

    $useOtp->execute([
        (int)$otpRow['id']
    ]);

    /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - PASSWORD RESET COMPLETED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$user['id'],
    'customer',
    'password_reset_completed',
    'user',
    (int)$user['id'],
    'Customer reset account password',
    null,
    null,
    [
        'email' => $email,
        'source' => 'forgot_password'
    ]
);

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    out([
        'message' =>
            'Password reset successfully'
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
        seller_status,
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

        'sellerStatus' =>
            $user['seller_status'],

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