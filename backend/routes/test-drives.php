<?php

declare(strict_types=1);
require_once __DIR__ . '/../helpers/whatsapp.php';


/*
|--------------------------------------------------------------------------
| AUTHENTICATED USER
|--------------------------------------------------------------------------
*/

function authenticatedUser(PDO $pdo): array
{
    try {
        $token = getBearerToken();

        $payload =
            verifyUserAccessToken(
                $token
            );

    } catch (Throwable $e) {
        fail(
            'Authentication required',
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
            phone
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


    return [
        'id' =>
            (int)$user['id'],

        'name' =>
            $user['name'],

        'email' =>
            $user['email'],

        'phone' =>
            $user['phone'],
    ];
}
/*
|--------------------------------------------------------------------------
| CREATE TEST DRIVE BOOKING
|--------------------------------------------------------------------------
*/

if (
    $route === 'test-drives'
    &&
    $method === 'POST'
) {
    $user =
        authenticatedUser($pdo);

    $b = body();


    /*
    |--------------------------------------------------------------------------
    | READ DATA
    |--------------------------------------------------------------------------
    */

    $carId =
        (int)($b['carId'] ?? 0);

    $branch =
        strtolower(
            trim(
                (string)($b['branch'] ?? '')
            )
        );

    $testDriveDate =
        trim(
            (string)($b['testDriveDate'] ?? '')
        );

    $testDriveTime =
        trim(
            (string)($b['testDriveTime'] ?? '')
        );

    $notes =
        trim(
            (string)($b['notes'] ?? '')
        );


    /*
    |--------------------------------------------------------------------------
    | VALIDATE CAR
    |--------------------------------------------------------------------------
    */

    if ($carId <= 0) {
        fail(
            'Car is required',
            422
        );
    }

    $carStatement =
        $pdo->prepare(
            'SELECT id, name
             FROM cars
             WHERE id = ?
             LIMIT 1'
        );

    $carStatement->execute([
        $carId
    ]);

    $car =
        $carStatement->fetch();

    if (!$car) {
        fail(
            'Car not found',
            404
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE BRANCH
    |--------------------------------------------------------------------------
    */

    $allowedBranches = [
        'nablus',
        'ramallah'
    ];

    if (
        !in_array(
            $branch,
            $allowedBranches,
            true
        )
    ) {
        fail(
            'Invalid branch',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE DATE
    |--------------------------------------------------------------------------
    */

    $dateObject =
        DateTime::createFromFormat(
            'Y-m-d',
            $testDriveDate
        );

    if (
        !$dateObject
        ||
        $dateObject->format('Y-m-d')
            !== $testDriveDate
    ) {
        fail(
            'Invalid test drive date',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE TIME
    |--------------------------------------------------------------------------
    */

    $timeObject =
        DateTime::createFromFormat(
            'H:i',
            $testDriveTime
        );

    if (
        !$timeObject
        ||
        $timeObject->format('H:i')
            !== $testDriveTime
    ) {
        fail(
            'Invalid test drive time',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | PREVENT PAST BOOKINGS
    |--------------------------------------------------------------------------
    */

    $bookingStart =
        new DateTime(
            $testDriveDate
            . ' '
            . $testDriveTime
        );

    $now =
        new DateTime();

    if ($bookingStart <= $now) {
        fail(
            'Test drive must be scheduled in the future',
            422
        );
    }
        /*
    |--------------------------------------------------------------------------
    | BOOKING DURATION
    |--------------------------------------------------------------------------
    */

    $testDriveDurationMinutes = 60;
    $bufferMinutes = 15;

    $bookingEnd =
        clone $bookingStart;

    $bookingEnd->modify(
        '+' . $testDriveDurationMinutes . ' minutes'
    );

    $bookingBlockedUntil =
        clone $bookingEnd;

    $bookingBlockedUntil->modify(
        '+' . $bufferMinutes . ' minutes'
    );


    /*
    |--------------------------------------------------------------------------
    | CHECK FOR OVERLAPPING BOOKINGS
    |--------------------------------------------------------------------------
    */

    $conflictStatement =
        $pdo->prepare(
            'SELECT
                id,
                test_drive_date,
                test_drive_time,
                status

             FROM test_drive_bookings

             WHERE car_id = ?
               AND branch = ?
               AND test_drive_date = ?
               AND status IN (
                    \'pending\',
                    \'confirmed\'
               )'
        );

    $conflictStatement->execute([
        $carId,
        $branch,
        $testDriveDate
    ]);

    $existingBookings =
        $conflictStatement->fetchAll();


    foreach (
        $existingBookings
        as $existingBooking
    ) {

        $existingStart =
            new DateTime(
                $existingBooking['test_drive_date']
                . ' '
                . $existingBooking['test_drive_time']
            );

        $existingEnd =
            clone $existingStart;

        $existingEnd->modify(
            '+' . $testDriveDurationMinutes . ' minutes'
        );

        $existingBlockedUntil =
            clone $existingEnd;

        $existingBlockedUntil->modify(
            '+' . $bufferMinutes . ' minutes'
        );


        /*
         * Conflict exists when:
         *
         * new booking starts before
         * existing blocked period ends
         *
         * AND
         *
         * new blocked period ends after
         * existing booking starts
         */

        if (
            $bookingStart
                < $existingBlockedUntil
            &&
            $bookingBlockedUntil
                > $existingStart
        ) {
            fail(
                'This time slot is no longer available. Please choose another time.',
                409
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE BOOKING
    |--------------------------------------------------------------------------
    */

    $insertStatement =
        $pdo->prepare(
            'INSERT INTO test_drive_bookings
            (
                user_id,
                car_id,
                name,
                email,
                phone,
                branch,
                test_drive_date,
                test_drive_time,
                notes,
                status
            )
            VALUES
            (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\'
            )'
        );

    $insertStatement->execute([
        $user['id'],
        $carId,
        $user['name'],
        $user['email'],
        $user['phone'],
        $branch,
        $testDriveDate,
        $testDriveTime,
        $notes !== ''
            ? $notes
            : null
    ]);

    /*
|--------------------------------------------------------------------------
| WHATSAPP NOTIFICATIONS - NEW BOOKING
|--------------------------------------------------------------------------
*/

$bookingId = (int)$pdo->lastInsertId();

/*
|--------------------------------------------------------------------------
| USER MESSAGE
|--------------------------------------------------------------------------
*/

$userMessage =
    "VELOCE Test Drive Request\n\n" .
    "Hi " . $user['name'] . ",\n\n" .
    "Your test drive request has been submitted successfully.\n\n" .
    "Car: " . $car['name'] . "\n" .
    "Branch: " . ucfirst($branch) . "\n" .
    "Date: " . $testDriveDate . "\n" .
    "Time: " . $testDriveTime . "\n" .
    "Status: Pending\n\n" .
    "We will notify you once your request is reviewed.";

sendWhatsAppMessage(
    $user['phone'],
    $userMessage
);


/*
|--------------------------------------------------------------------------
| ADMIN MESSAGE
|--------------------------------------------------------------------------
*/

$adminPhone =
    getenv('WHATSAPP_ADMIN_PHONE') ?: '';

if ($adminPhone !== '') {

    $adminMessage =
        "VELOCE - New Test Drive Booking\n\n" .
        "A new test drive request has been submitted.\n\n" .
        "Booking ID: #" . $bookingId . "\n" .
        "Customer: " . $user['name'] . "\n" .
        "Email: " . $user['email'] . "\n" .
        "Phone: +" . $user['phone'] . "\n" .
        "Car: " . $car['name'] . "\n" .
        "Branch: " . ucfirst($branch) . "\n" .
        "Date: " . $testDriveDate . "\n" .
        "Time: " . $testDriveTime . "\n" .
        "Status: Pending";

    sendWhatsAppMessage(
        $adminPhone,
        $adminMessage
    );
}


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out(
        [
            'booking' => [
                'id' =>
                    $bookingId,

                'carId' =>
                    $carId,

                'carName' =>
                    $car['name'],

                'branch' =>
                    $branch,

                'testDriveDate' =>
                    $testDriveDate,

                'testDriveTime' =>
                    $testDriveTime,

                'status' =>
                    'pending',

                'durationMinutes' =>
                    $testDriveDurationMinutes,

                'bufferMinutes' =>
                    $bufferMinutes,
            ]
        ],
        201
    );
}
/*
|--------------------------------------------------------------------------
| GET CURRENT USER TEST DRIVE BOOKINGS
|--------------------------------------------------------------------------
*/

if (
    $route === 'test-drives/my'
    &&
    $method === 'GET'
) {
    $user =
        authenticatedUser($pdo);

    $statement =
        $pdo->prepare(
            'SELECT
                t.id,
                t.car_id AS carId,
                t.branch,
                t.test_drive_date AS testDriveDate,
                t.test_drive_time AS testDriveTime,
                t.notes,
                t.status,
                t.created_at AS createdAt,

                c.name AS carName,
                c.year AS carYear,

                b.name AS brandName

             FROM test_drive_bookings t

             INNER JOIN cars c
                ON c.id = t.car_id

             INNER JOIN brands b
                ON b.id = c.brand_id

             WHERE t.user_id = ?

             ORDER BY
                t.test_drive_date DESC,
                t.test_drive_time DESC'
        );

    $statement->execute([
        $user['id']
    ]);

    $bookings =
        $statement->fetchAll();

    foreach (
        $bookings
        as &$booking
    ) {
        $booking['id'] =
            (int)$booking['id'];

        $booking['carId'] =
            (int)$booking['carId'];

        $booking['carYear'] =
            (int)$booking['carYear'];
    }

    unset($booking);

    out([
        'bookings' =>
            $bookings
    ]);
}
/* 
|--------------------------------------------------------------------------
| ADMIN - GET ALL TEST DRIVE BOOKINGS
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/test-drives'
    &&
    $method === 'GET'
) {

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATE ADMIN
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | CHECK PERMISSION
    |--------------------------------------------------------------------------
    */

    requirePermission(
    $pdo,
    'test_drives.manage'
);


    /*
    |--------------------------------------------------------------------------
    | GET BOOKINGS
    |--------------------------------------------------------------------------
    */

    $statement = $pdo->prepare(
        'SELECT
            t.id,
            t.user_id,
            t.car_id,
            t.name,
            t.email,
            t.phone,
            t.branch,
            t.test_drive_date,
            t.test_drive_time,
            t.notes,
            t.status,
            t.created_at,
            t.updated_at,

            c.name AS car_name,
            c.year AS car_year

        FROM test_drive_bookings t

        INNER JOIN cars c
            ON c.id = t.car_id

        ORDER BY
            t.test_drive_date ASC,
            t.test_drive_time ASC'
    );

    $statement->execute();

    $bookings = $statement->fetchAll();


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
    'bookings' => $bookings
]);

    exit;
}
/*
|--------------------------------------------------------------------------
| ADMIN - UPDATE TEST DRIVE BOOKING STATUS
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^admin/test-drives/(\d+)/status$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {

    /*
    |--------------------------------------------------------------------------
    | CHECK ADMIN PERMISSION
    |--------------------------------------------------------------------------
    */

    requirePermission(
        $pdo,
        'test_drives.manage'
    );


    /*
    |--------------------------------------------------------------------------
    | BOOKING ID
    |--------------------------------------------------------------------------
    */

    $bookingId =
        (int)$matches[1];

    if ($bookingId <= 0) {
        fail(
            'Invalid booking',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | READ REQUEST
    |--------------------------------------------------------------------------
    */

    $b = body();

    $newStatus =
        strtolower(
            trim(
                (string)($b['status'] ?? '')
            )
        );


    /*
    |--------------------------------------------------------------------------
    | VALIDATE REQUESTED STATUS
    |--------------------------------------------------------------------------
    */

    $allowedStatuses = [
        'confirmed',
        'completed',
        'cancelled'
    ];

    if (
        !in_array(
            $newStatus,
            $allowedStatuses,
            true
        )
    ) {
        fail(
            'Invalid booking status',
            422
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GET CURRENT BOOKING
    |--------------------------------------------------------------------------
    */

    $statement =
    $pdo->prepare(
        'SELECT
            t.id,
            t.status,
            t.name,
            t.phone,
            t.branch,
            t.test_drive_date,
            t.test_drive_time,
            c.name AS car_name

         FROM test_drive_bookings t

         INNER JOIN cars c
            ON c.id = t.car_id

         WHERE t.id = ?
         LIMIT 1'
    );

    $statement->execute([
        $bookingId
    ]);

    $booking =
        $statement->fetch();


    if (!$booking) {
        fail(
            'Test drive booking not found',
            404
        );
    }


    $currentStatus =
        strtolower(
            (string)$booking['status']
        );


    /*
    |--------------------------------------------------------------------------
    | ALLOWED STATUS TRANSITIONS
    |--------------------------------------------------------------------------
    |
    | pending
    |   -> confirmed
    |   -> cancelled
    |
    | confirmed
    |   -> completed
    |   -> cancelled
    |
    | completed / cancelled
    |   -> CLOSED
    |
    */

    $allowedTransitions = [

        'pending' => [
            'confirmed',
            'cancelled'
        ],

        'confirmed' => [
            'completed'
        ],

        'completed' => [],

        'cancelled' => [],
    ];


    if (
        !isset(
            $allowedTransitions[
                $currentStatus
            ]
        )
    ) {
        fail(
            'Invalid current booking status',
            409
        );
    }


    if (
        !in_array(
            $newStatus,
            $allowedTransitions[
                $currentStatus
            ],
            true
        )
    ) {
        fail(
            'This booking status cannot be changed from '
            . $currentStatus
            . ' to '
            . $newStatus,
            409
        );
    }
    /*
|--------------------------------------------------------------------------
| PREVENT EARLY COMPLETION
|--------------------------------------------------------------------------
*/

if ($newStatus === 'completed') {

    $bookingStart = new DateTime(
        $booking['test_drive_date']
        . ' '
        . $booking['test_drive_time']
    );

    $bookingEnd = clone $bookingStart;

    // Test drive duration = 60 minutes
    $bookingEnd->modify('+60 minutes');

    $now = new DateTime();

    if ($now < $bookingEnd) {
        fail(
            'This test drive cannot be completed before the appointment has ended.',
            409
        );
    }
}


    /*
    |--------------------------------------------------------------------------
    | UPDATE STATUS
    |--------------------------------------------------------------------------
    */

    $updateStatement =
        $pdo->prepare(
            'UPDATE test_drive_bookings
             SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );

    $updateStatement->execute([
        $newStatus,
        $bookingId
    ]);

    /*
|--------------------------------------------------------------------------
| WHATSAPP NOTIFICATION - CONFIRMED
|--------------------------------------------------------------------------
*/

if ($newStatus === 'confirmed') {

    $message =
        "VELOCE Test Drive Confirmed ✅\n\n" .
        "Hi " . $booking['name'] . ",\n\n" .
        "Your test drive request has been confirmed.\n\n" .
        "Car: " . $booking['car_name'] . "\n" .
        "Branch: " . ucfirst($booking['branch']) . "\n" .
        "Date: " . $booking['test_drive_date'] . "\n" .
        "Time: " . $booking['test_drive_time'] . "\n\n" .
        "We look forward to seeing you.";

    sendWhatsAppMessage(
        $booking['phone'],
        $message
    );
}

/*
|--------------------------------------------------------------------------
| WHATSAPP NOTIFICATION - CANCELLED
|--------------------------------------------------------------------------
*/

if ($newStatus === 'cancelled') {

    $message =
        "VELOCE Test Drive Update\n\n" .
        "Hi " . $booking['name'] . ",\n\n" .
        "Unfortunately, your test drive request has been cancelled.\n\n" .
        "Car: " . $booking['car_name'] . "\n" .
        "Branch: " . ucfirst($booking['branch']) . "\n" .
        "Date: " . $booking['test_drive_date'] . "\n" .
        "Time: " . $booking['test_drive_time'] . "\n\n" .
        "You can submit a new booking request at any time.";

    sendWhatsAppMessage(
        $booking['phone'],
        $message
    );
}


/*
|--------------------------------------------------------------------------
| WHATSAPP NOTIFICATION - COMPLETED
|--------------------------------------------------------------------------
*/

if ($newStatus === 'completed') {

    $message =
        "VELOCE Test Drive Completed ✅\n\n" .
        "Hi " . $booking['name'] . ",\n\n" .
        "Your test drive has been completed successfully.\n\n" .
        "Thank you for choosing VELOCE.\n" .
        "We hope you enjoyed your driving experience.";

    sendWhatsAppMessage(
        $booking['phone'],
        $message
    );
}

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    out([
        'booking' => [
            'id' =>
                $bookingId,

            'status' =>
                $newStatus,
        ]
    ]);

    exit;
}