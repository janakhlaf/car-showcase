<?php


/*
|--------------------------------------------------------------------------
| SITE SETTINGS / CMS
|--------------------------------------------------------------------------
|
| This file handles website content settings that are controlled
| from the Admin Dashboard.
|
*/


/* =========================================================
   GET SITE SETTINGS
========================================================= */

if (
    $route === 'site-settings'
    &&
    $method === 'GET'
) {

    $statement = $pdo->query(
        '
        SELECT
            id,
            hero_car_id AS heroCarId

        FROM site_settings

        WHERE id = 1

        LIMIT 1
        '
    );

    $settings = $statement->fetch();


    /*
     * If settings row does not exist yet,
     * return default values.
     */

    if (!$settings) {

        out([
            'id' => 1,
            'heroCarId' => null,
        ]);
    }


    out([
        'id' => (int)$settings['id'],

        'heroCarId' =>
            $settings['heroCarId'] !== null
                ? (int)$settings['heroCarId']
                : null,
    ]);
}


/* =========================================================
   UPDATE HERO VEHICLE
========================================================= */

if (
    $route === 'site-settings/hero-car'
    &&
    $method === 'PUT'
) {

    /*
     * Only an admin with website content permission
     * should be allowed to change CMS content.
     */

    requirePermission(
        $pdo,
        'site_content.edit'
    );

    $b = body();


    /*
     * Read selected vehicle.
     */

    $heroCarId =
        isset($b['heroCarId'])
        &&
        $b['heroCarId'] !== ''
        &&
        $b['heroCarId'] !== null
            ? (int)$b['heroCarId']
            : null;


    /*
     * Validate selected vehicle exists.
     */

    if ($heroCarId !== null) {

        $carStatement = $pdo->prepare(
            '
            SELECT id
            FROM cars
            WHERE id = ?
            LIMIT 1
            '
        );

        $carStatement->execute([
            $heroCarId
        ]);

        if (!$carStatement->fetch()) {

            fail(
                'Selected vehicle does not exist',
                422
            );
        }
    }


    /*
     * Insert settings row if it does not exist,
     * otherwise update it.
     */

    $statement = $pdo->prepare(
        '
        INSERT INTO site_settings
        (
            id,
            hero_car_id
        )

        VALUES
        (
            1,
            ?
        )

        ON DUPLICATE KEY UPDATE
            hero_car_id = VALUES(hero_car_id)
        '
    );

    $statement->execute([
        $heroCarId
    ]);


    out([
        'success' => true,
        'heroCarId' => $heroCarId,
    ]);
}