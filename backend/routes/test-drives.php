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
| GET AVAILABLE TEST DRIVE SLOTS
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^test-drives/availability/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'GET'
) {
    $carId = (int)$matches[1];

    $date =
        trim(
            (string)($_GET['date'] ?? '')
        );

    if ($carId <= 0) {
        fail(
            'Invalid car',
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
            $date
        );

    if (
        !$dateObject
        ||
        $dateObject->format('Y-m-d') !== $date
    ) {
        fail(
            'Invalid date',
            422
        );
    }

    /*
    |--------------------------------------------------------------------------
    | GET DAY OF WEEK
    |--------------------------------------------------------------------------
    |
    | MySQL DAYOFWEEK style:
    | Sunday = 1
    | Monday = 2
    | ...
    | Saturday = 7
    |
    */

    $dayOfWeek =
    (int)$dateObject->format('w');

    /*
    |--------------------------------------------------------------------------
    | GET SELLER AVAILABILITY
    |--------------------------------------------------------------------------
    */

    $statement =
        $pdo->prepare(
            'SELECT
                id,
                seller_id,
                car_id,
                day_of_week,
                start_time,
                end_time,
                slot_duration
             FROM seller_test_drive_availability
             WHERE car_id = ?
               AND day_of_week = ?
               AND is_active = 1
             ORDER BY start_time ASC'
        );

    $statement->execute([
        $carId,
        $dayOfWeek
    ]);

    $availabilityRows =
        $statement->fetchAll();

    if (!$availabilityRows) {
        out([
            'available' => false,
            'slots' => []
        ]);

        exit;
    }

    /*
    |--------------------------------------------------------------------------
    | EXISTING BOOKINGS
    |--------------------------------------------------------------------------
    */

    $bookingStatement =
        $pdo->prepare(
            'SELECT
                test_drive_time,
                status
             FROM test_drive_bookings
             WHERE car_id = ?
               AND test_drive_date = ?
               AND status IN (
                    \'pending\',
                    \'confirmed\'
               )'
        );

    $bookingStatement->execute([
        $carId,
        $date
    ]);

    $existingBookings =
        $bookingStatement->fetchAll();

    $bookedTimes = [];

    foreach ($existingBookings as $booking) {
        $bookedTimes[] =
            substr(
                (string)$booking['test_drive_time'],
                0,
                5
            );
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE AVAILABLE SLOTS
    |--------------------------------------------------------------------------
    */

    $slots = [];

    foreach ($availabilityRows as $availability) {

        $slotDuration =
            (int)$availability['slot_duration'];

        if ($slotDuration <= 0) {
            continue;
        }

        $current =
            new DateTime(
                $date . ' ' .
                $availability['start_time']
            );

        $end =
            new DateTime(
                $date . ' ' .
                $availability['end_time']
            );

        while (true) {

            $slotEnd =
                clone $current;

            $slotEnd->modify(
                '+' .
                $slotDuration .
                ' minutes'
            );

            if ($slotEnd > $end) {
                break;
            }

            $time =
                $current->format('H:i');

            /*
             * Do not show past slots.
             */

            if (
                $current > new DateTime()
                &&
                !in_array(
                    $time,
                    $bookedTimes,
                    true
                )
            ) {
                $slots[] = [
                    'time' =>
                        $time,

                    'durationMinutes' =>
                        $slotDuration
                ];
            }

            $current->modify(
                '+' .
                $slotDuration .
                ' minutes'
            );
        }
    }

    out([
        'available' =>
            count($slots) > 0,

        'slots' =>
            $slots
    ]);

    exit;
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
            'SELECT
    id,
    name,
    seller_id
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
    
    $sellerId =
    $car['seller_id'] !== null
        ? (int)$car['seller_id']
        : null;


    /*
    |--------------------------------------------------------------------------
    | VALIDATE BRANCH
    |--------------------------------------------------------------------------
    */

    /*
|--------------------------------------------------------------------------
| BRANCH / SELLER VEHICLE
|--------------------------------------------------------------------------
*/

if ($sellerId !== null) {

    // Seller vehicles do not belong to a showroom branch.
    $branch = 'seller';

} else {

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
| BOOKING RULES
|--------------------------------------------------------------------------
*/

if ($sellerId !== null) {

    /*
    |--------------------------------------------------------------------------
    | SELLER VEHICLE
    |--------------------------------------------------------------------------
    */

    $dayOfWeek =
        (int)$dateObject->format('w');

    $availabilityStatement =
        $pdo->prepare(
            'SELECT
                id,
                seller_id,
                start_time,
                end_time,
                slot_duration
             FROM seller_test_drive_availability
             WHERE car_id = ?
               AND seller_id = ?
               AND day_of_week = ?
               AND is_active = 1
             ORDER BY start_time ASC'
        );

    $availabilityStatement->execute([
        $carId,
        $sellerId,
        $dayOfWeek
    ]);

    $availabilityRows =
        $availabilityStatement->fetchAll();

    $matchedAvailability = null;

    foreach ($availabilityRows as $availability) {

        $availableStart =
            new DateTime(
                $testDriveDate . ' ' .
                $availability['start_time']
            );

        $availableEnd =
            new DateTime(
                $testDriveDate . ' ' .
                $availability['end_time']
            );

        $slotDuration =
            (int)$availability['slot_duration'];

        if ($slotDuration <= 0) {
            continue;
        }

        $cursor =
            clone $availableStart;

        while (true) {

            $slotEnd =
                clone $cursor;

            $slotEnd->modify(
                '+' . $slotDuration . ' minutes'
            );

            if ($slotEnd > $availableEnd) {
                break;
            }

            if (
                $cursor->format('H:i')
                === $testDriveTime
            ) {
                $matchedAvailability =
                    $availability;

                break 2;
            }

            $cursor->modify(
                '+' . $slotDuration . ' minutes'
            );
        }
    }

    if (!$matchedAvailability) {
        fail(
            'This time is not available for this vehicle.',
            422
        );
    }

    $testDriveDurationMinutes =
        (int)$matchedAvailability['slot_duration'];

    // Seller uses their own defined slots.
    $bufferMinutes = 0;

} else {

    /*
    |--------------------------------------------------------------------------
    | VELOCE / ADMIN VEHICLE
    |--------------------------------------------------------------------------
    */

    // Original VELOCE booking:
    // 1 hour test drive + 15 minute buffer.
    $testDriveDurationMinutes = 60;
    $bufferMinutes = 15;
}


/*
|--------------------------------------------------------------------------
| CALCULATE BOOKING END / BLOCKED UNTIL
|--------------------------------------------------------------------------
*/

$bookingEnd =
    clone $bookingStart;

$bookingEnd->modify(
    '+' .
    $testDriveDurationMinutes .
    ' minutes'
);

$bookingBlockedUntil =
    clone $bookingEnd;

$bookingBlockedUntil->modify(
    '+' .
    $bufferMinutes .
    ' minutes'
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
            seller_id,
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
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\'
        )'
    );

    $insertStatement->execute([
    $user['id'],
    $carId,
    $sellerId,
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
| ACTIVITY LOG - TEST DRIVE REQUESTED
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$user['id'],
    'customer',
    'test_drive_requested',
    'test_drive',
    $bookingId,
    'Test drive request created',
    null,
    [
        'car_id' => $carId,
        'car_name' => $car['name'],
        'seller_id' => $sellerId,
        'branch' => $sellerId !== null ? null : $branch,
        'test_drive_date' => $testDriveDate,
        'test_drive_time' => $testDriveTime,
        'status' => 'pending'
    ],
    [
        'source' => 'customer_booking'
    ]
);

/*
|--------------------------------------------------------------------------
| USER MESSAGE
|--------------------------------------------------------------------------
*/
if ($sellerId !== null) {

    $userMessage =
        "VELOCE Test Drive Request\n\n" .
        "Hi " . $user['name'] . ",\n\n" .
        "Your test drive request has been submitted to the seller successfully.\n\n" .
        "Car: " . $car['name'] . "\n" .
        "Date: " . $testDriveDate . "\n" .
        "Time: " . $testDriveTime . "\n" .
        "Status: Pending\n\n" .
        "We will notify you once the seller reviews your request.";

} else {

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
}

sendWhatsAppMessage(
    $user['phone'],
    $userMessage
);


/*
|--------------------------------------------------------------------------
| ADMIN MESSAGE
|--------------------------------------------------------------------------
*/

if ($sellerId !== null) {

    /*
    |--------------------------------------------------------------------------
    | SELLER WHATSAPP
    |--------------------------------------------------------------------------
    */

    $sellerStatement =
        $pdo->prepare(
            'SELECT
                name,
                phone
             FROM users
             WHERE id = ?
             LIMIT 1'
        );

    $sellerStatement->execute([
        $sellerId
    ]);

    $seller =
        $sellerStatement->fetch();

    if (
        $seller &&
        !empty($seller['phone'])
    ) {
        $sellerMessage =
            "VELOCE - New Test Drive Request\n\n" .
            "Hi " . $seller['name'] . ",\n\n" .
            $user['name'] .
            " requested a test drive for your vehicle.\n\n" .
            "Car: " . $car['name'] . "\n" .
            "Date: " . $testDriveDate . "\n" .
            "Time: " . $testDriveTime . "\n" .
            "Status: Pending\n\n" .
            "Log in to VELOCE to review the request.";

        sendWhatsAppMessage(
            $seller['phone'],
            $sellerMessage
        );
    }

} else {

    /*
    |--------------------------------------------------------------------------
    | VELOCE ADMIN WHATSAPP
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
                t.seller_id AS sellerId,
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
            $booking['sellerId'] =
        $booking['sellerId'] !== null
            ? (int)$booking['sellerId']
            : null;

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
| SELLER - GET MY TEST DRIVE BOOKINGS
|--------------------------------------------------------------------------
*/

if (
    $route === 'seller/test-drives'
    &&
    $method === 'GET'
) {
    $seller = authenticatedUser($pdo);

    $statement =
        $pdo->prepare(
            'SELECT
                t.id,
                t.user_id AS userId,
                t.car_id AS carId,
                t.seller_id AS sellerId,

                t.name AS customerName,
                t.email AS customerEmail,
                t.phone AS customerPhone,

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

             WHERE t.seller_id = ?

             ORDER BY
                t.test_drive_date ASC,
                t.test_drive_time ASC'
        );

    $statement->execute([
        $seller['id']
    ]);

    $bookings =
        $statement->fetchAll();

    foreach ($bookings as &$booking) {
        $booking['id'] =
            (int)$booking['id'];

        $booking['userId'] =
            (int)$booking['userId'];

        $booking['carId'] =
            (int)$booking['carId'];

        $booking['sellerId'] =
            (int)$booking['sellerId'];

        $booking['carYear'] =
            (int)$booking['carYear'];
    }

    unset($booking);

    out([
        'bookings' => $bookings
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| SELLER - UPDATE TEST DRIVE STATUS
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^seller/test-drives/(\d+)/status$#',
        $route,
        $matches
    )
    &&
    $method === 'PATCH'
) {
    $seller =
        authenticatedUser($pdo);

    $bookingId =
        (int)$matches[1];

    $b = body();

    $newStatus =
        strtolower(
            trim(
                (string)($b['status'] ?? '')
            )
        );

    if (
        !in_array(
            $newStatus,
            [
                'confirmed',
                'cancelled',
                'completed'
            ],
            true
        )
    ) {
        fail(
            'Invalid booking status',
            422
        );
    }

    /*
     * Seller can only manage
     * bookings belonging to their own vehicles.
     */

    $statement =
        $pdo->prepare(
            'SELECT
                t.id,
                t.car_id,
                t.status,
                t.name,
                t.phone,
                t.test_drive_date,
                t.test_drive_time,

                c.name AS car_name

             FROM test_drive_bookings t

             INNER JOIN cars c
                ON c.id = t.car_id

             WHERE t.id = ?
               AND t.seller_id = ?

             LIMIT 1'
        );

    $statement->execute([
        $bookingId,
        $seller['id']
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

    $allowedTransitions = [
        'pending' => [
            'confirmed',
            'cancelled'
        ],

        'confirmed' => [
            'completed',
            'cancelled'
        ],

        'completed' => [],
        'cancelled' => [],
    ];

    if (
        !isset(
            $allowedTransitions[$currentStatus]
        )
        ||
        !in_array(
            $newStatus,
            $allowedTransitions[$currentStatus],
            true
        )
    ) {
        fail(
            'This booking status cannot be changed.',
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

    $dayOfWeek =
        (int)$bookingStart->format('w');

    $durationStatement =
        $pdo->prepare(
            'SELECT slot_duration
             FROM seller_test_drive_availability
             WHERE seller_id = ?
               AND car_id = ?
               AND day_of_week = ?
               AND is_active = 1
             ORDER BY id DESC
             LIMIT 1'
        );

    $durationStatement->execute([
        $seller['id'],
        (int)$booking['car_id'],
        $dayOfWeek
    ]);

    $slotDuration =
        (int)$durationStatement->fetchColumn();

    if ($slotDuration <= 0) {
        fail(
            'Could not determine the test drive duration.',
            409
        );
    }

    $bookingEnd = clone $bookingStart;

    $bookingEnd->modify(
        '+' . $slotDuration . ' minutes'
    );

    $now = new DateTime();

    if ($now < $bookingEnd) {
        fail(
            'This test drive cannot be completed before the appointment has ended.',
            409
        );
    }
}

    $update =
        $pdo->prepare(
            'UPDATE test_drive_bookings
             SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
               AND seller_id = ?'
        );

    $update->execute([
        $newStatus,
        $bookingId,
        $seller['id']
    ]);
    /*
|--------------------------------------------------------------------------
| ACTIVITY LOG - SELLER TEST DRIVE STATUS
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$seller['id'],
    'seller',
    'test_drive_status_changed',
    'test_drive',
    $bookingId,
    'Seller changed test drive status',
    [
        'status' => $currentStatus
    ],
    [
        'status' => $newStatus
    ],
    [
        'car_id' => (int)$booking['car_id'],
        'car_name' => $booking['car_name'],
        'customer_name' => $booking['name'],
        'test_drive_date' => $booking['test_drive_date'],
        'test_drive_time' => $booking['test_drive_time']
    ]
);

    /*
     * Notify customer on WhatsApp.
     */

    if ($newStatus === 'confirmed') {

        $message =
            "VELOCE Test Drive Confirmed ✅\n\n" .
            "Hi " . $booking['name'] . ",\n\n" .
            "Your test drive request has been confirmed.\n\n" .
            "Car: " . $booking['car_name'] . "\n" .
            "Date: " . $booking['test_drive_date'] . "\n" .
            "Time: " . $booking['test_drive_time'];

        sendWhatsAppMessage(
            $booking['phone'],
            $message
        );
    }

    if ($newStatus === 'cancelled') {

        $message =
            "VELOCE Test Drive Update\n\n" .
            "Hi " . $booking['name'] . ",\n\n" .
            "Your test drive request was declined.\n\n" .
            "Car: " . $booking['car_name'] . "\n" .
            "Date: " . $booking['test_drive_date'] . "\n" .
            "Time: " . $booking['test_drive_time'];

        sendWhatsAppMessage(
            $booking['phone'],
            $message
        );
    }
    if ($newStatus === 'completed') {

    $message =
        "VELOCE Test Drive Completed ✅\n\n" .
        "Hi " . $booking['name'] . ",\n\n" .
        "Your test drive with the seller has been completed successfully.\n\n" .
        "Car: " . $booking['car_name'] . "\n" .
        "Date: " . $booking['test_drive_date'] . "\n" .
        "Time: " . $booking['test_drive_time'] . "\n\n" .
        "Thank you for using VELOCE.";

    sendWhatsAppMessage(
        $booking['phone'],
        $message
    );
}

    out([
        'booking' => [
            'id' =>
                $bookingId,

            'status' =>
                $newStatus
        ]
    ]);

    exit;
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

    $currentAdmin = requirePermission(
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

WHERE t.seller_id IS NULL

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

    $currentAdmin = requirePermission(
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

    $dayOfWeek = (int)$bookingStart->format('w');

    $durationStatement = $pdo->prepare(
        'SELECT slot_duration
         FROM seller_test_drive_availability
         WHERE car_id = ?
           AND day_of_week = ?
           AND is_active = 1
         ORDER BY id DESC
         LIMIT 1'
    );

    $durationStatement->execute([
        (int)$booking['car_id'],
        $dayOfWeek
    ]);

    $slotDuration = (int)$durationStatement->fetchColumn();

    // Admin/default cars use 60 minutes.
    // Seller cars use the seller-defined slot duration.
    if ($slotDuration <= 0) {
        $slotDuration = 60;
    }

    $bookingEnd = clone $bookingStart;

    $bookingEnd->modify(
        '+' . $slotDuration . ' minutes'
    );

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
| ACTIVITY LOG - ADMIN TEST DRIVE STATUS
|--------------------------------------------------------------------------
*/

logActivity(
    $pdo,
    (int)$currentAdmin['id'],
    'admin',
    'test_drive_status_changed',
    'test_drive',
    $bookingId,
    'Admin changed test drive status',
    [
        'status' => $currentStatus
    ],
    [
        'status' => $newStatus
    ],
    [
        'admin_name' => $currentAdmin['name'],
        'admin_role' => $currentAdmin['role'],
        'car_name' => $booking['car_name'],
        'customer_name' => $booking['name'],
        'branch' => $booking['branch'],
        'test_drive_date' => $booking['test_drive_date'],
        'test_drive_time' => $booking['test_drive_time']
    ]
);

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