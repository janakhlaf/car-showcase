<?php

declare(strict_types=1);
date_default_timezone_set('Asia/Hebron');

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/whatsapp.php';

$pdo = db();

/*
|--------------------------------------------------------------------------
| FIND BOOKINGS THAT START IN ABOUT 1 HOUR
|--------------------------------------------------------------------------
*/

$statement = $pdo->prepare(
    'SELECT
        t.id,
        t.name,
        t.phone,
        t.branch,
        t.test_drive_date,
        t.test_drive_time,
        t.reminder_sent_at,
        c.name AS car_name

     FROM test_drive_bookings t

     INNER JOIN cars c
        ON c.id = t.car_id

     WHERE t.status = \'confirmed\'
       AND t.reminder_sent_at IS NULL'
);

$statement->execute();

$bookings = $statement->fetchAll();

$now = new DateTime();

foreach ($bookings as $booking) {

    $appointment = new DateTime(
        $booking['test_drive_date']
        . ' '
        . $booking['test_drive_time']
    );

    $secondsUntil =
        $appointment->getTimestamp()
        - $now->getTimestamp();

    /*
    |--------------------------------------------------------------------------
    | SEND WHEN APPOINTMENT IS 55-65 MINUTES AWAY
    |--------------------------------------------------------------------------
    */

    if (
        $secondsUntil < (55 * 60)
        ||
        $secondsUntil > (65 * 60)
    ) {
        continue;
    }

    $message =
        "VELOCE Test Drive Reminder ⏰\n\n" .
        "Hi " . $booking['name'] . ",\n\n" .
        "Your test drive is scheduled in approximately one hour.\n\n" .
        "Car: " . $booking['car_name'] . "\n" .
        "Branch: " . ucfirst($booking['branch']) . "\n" .
        "Date: " . $booking['test_drive_date'] . "\n" .
        "Time: " . $booking['test_drive_time'] . "\n\n" .
        "We look forward to seeing you.";

    $sent = sendWhatsAppMessage(
        $booking['phone'],
        $message
    );

    if (!$sent) {
        continue;
    }

    /*
    |--------------------------------------------------------------------------
    | MARK REMINDER AS SENT
    |--------------------------------------------------------------------------
    */

    $update = $pdo->prepare(
        'UPDATE test_drive_bookings
         SET reminder_sent_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND reminder_sent_at IS NULL'
    );

    $update->execute([
        (int)$booking['id']
    ]);
}