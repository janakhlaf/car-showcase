<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD STATS
|--------------------------------------------------------------------------
*/

if (
    $route === 'admin/dashboard-stats'
    &&
    $method === 'GET'
) {
    // لازم يكون Admin مسجل دخول
    admin();

    /*
    |--------------------------------------------------------------------------
    | TOTAL USERS
    |--------------------------------------------------------------------------
    */

    $totalUsers = (int)$pdo
        ->query(
            'SELECT COUNT(*)
             FROM users'
        )
        ->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | TOTAL VEHICLES
    |--------------------------------------------------------------------------
    */

    $totalVehicles = (int)$pdo
    ->query(
        "SELECT COUNT(*)
         FROM cars
         WHERE approval_status = 'approved'"
    )
    ->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | TOTAL SELLERS
    |--------------------------------------------------------------------------
    */

    $totalSellers = (int)$pdo
    ->query(
        "SELECT COUNT(DISTINCT user_id)
         FROM seller_requests
         WHERE status = 'approved'"
    )
    ->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | TEST DRIVE REQUESTS
    |--------------------------------------------------------------------------
    */

    $testDriveRequests = (int)$pdo
        ->query(
            'SELECT COUNT(*)
             FROM test_drive_bookings'
        )
        ->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | PENDING VEHICLE REVIEWS
    |--------------------------------------------------------------------------
    */

    $pendingVehicleReviews = (int)$pdo
        ->query(
            "SELECT COUNT(*)
             FROM cars
             WHERE seller_id IS NOT NULL
             AND approval_status = 'pending'"
        )
        ->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | PENDING SELLER REQUESTS
    |--------------------------------------------------------------------------
    */

    $pendingSellerRequests = (int)$pdo
        ->query(
            "SELECT COUNT(*)
             FROM seller_requests
             WHERE status = 'pending'"
        )
        ->fetchColumn();


    /*
    |--------------------------------------------------------------------------
    | MOST REQUESTED VEHICLE
    |--------------------------------------------------------------------------
    */

    $mostRequestedStatement = $pdo->query(
        "SELECT
            c.id,
            c.name,
            COUNT(t.id) AS requestCount

         FROM test_drive_bookings t

         JOIN cars c
            ON c.id = t.car_id

         GROUP BY
            c.id,
            c.name

         ORDER BY requestCount DESC

         LIMIT 1"
    );

    $mostRequestedVehicle =
        $mostRequestedStatement->fetch();

    if ($mostRequestedVehicle) {
        $mostRequestedVehicle['id'] =
            (int)$mostRequestedVehicle['id'];

        $mostRequestedVehicle['requestCount'] =
            (int)$mostRequestedVehicle['requestCount'];
    }


    /*
    |--------------------------------------------------------------------------
    | BOOKING STATUS DISTRIBUTION
    |--------------------------------------------------------------------------
    */

    $statusStatement = $pdo->query(
        "SELECT
            status,
            COUNT(*) AS total

         FROM test_drive_bookings

         GROUP BY status"
    );

    $bookingStatuses = [];

    foreach ($statusStatement->fetchAll() as $row) {
        $bookingStatuses[] = [
            'status' => $row['status'],
            'total' => (int)$row['total'],
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | TOP REQUESTED VEHICLES
    |--------------------------------------------------------------------------
    */

    $topVehiclesStatement = $pdo->query(
        "SELECT
            c.id,
            c.name,
            COUNT(t.id) AS requestCount

         FROM test_drive_bookings t

         JOIN cars c
            ON c.id = t.car_id

         GROUP BY
            c.id,
            c.name

         ORDER BY requestCount DESC

         LIMIT 5"
    );

    $topVehicles = [];

    foreach ($topVehiclesStatement->fetchAll() as $row) {
        $topVehicles[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'requestCount' =>
                (int)$row['requestCount'],
        ];
    }

        /*
    |--------------------------------------------------------------------------
    | TEST DRIVE ACTIVITY - LAST 7 DAYS
    |--------------------------------------------------------------------------
    */

    $activityStatement = $pdo->query(
        "SELECT
            DATE(created_at) AS activityDate,
            COUNT(*) AS total

         FROM test_drive_bookings

         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)

         GROUP BY DATE(created_at)

         ORDER BY activityDate ASC"
    );

    $activityRows = [];

    foreach ($activityStatement->fetchAll() as $row) {
        $activityRows[$row['activityDate']] =
            (int)$row['total'];
    }


    /*
     * نضمن ظهور كل الأيام السبعة
     * حتى لو في يوم ما كان فيه أي Request.
     */

    $testDriveActivity = [];

    for ($i = 6; $i >= 0; $i--) {

        $date =
            date(
                'Y-m-d',
                strtotime("-{$i} days")
            );

        $testDriveActivity[] = [
            'date' => $date,
            'label' =>
                date(
                    'M j',
                    strtotime($date)
                ),
            'requests' =>
                $activityRows[$date] ?? 0,
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | RETURN DASHBOARD DATA
    |--------------------------------------------------------------------------
    */

    out([
        'totalUsers' =>
            $totalUsers,

        'totalVehicles' =>
            $totalVehicles,

        'totalSellers' =>
            $totalSellers,

        'testDriveRequests' =>
            $testDriveRequests,

        'pendingVehicleReviews' =>
            $pendingVehicleReviews,

        'pendingSellerRequests' =>
            $pendingSellerRequests,

        'mostRequestedVehicle' =>
            $mostRequestedVehicle ?: null,

                'bookingStatuses' =>
            $bookingStatuses,

        'topVehicles' =>
            $topVehicles,

        'testDriveActivity' =>
            $testDriveActivity,
    ]);
}