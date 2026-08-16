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
    hero_car_id AS heroCarId,
    featured_car_1_id AS featuredCar1Id,
    featured_car_2_id AS featuredCar2Id,
    featured_car_3_id AS featuredCar3Id,
    featured_eyebrow AS featuredEyebrow,
    featured_title AS featuredTitle,
    featured_link_text AS featuredLinkText,

editorial_eyebrow AS editorialEyebrow,
editorial_title_before AS editorialTitleBefore,
editorial_title_accent AS editorialTitleAccent,
editorial_title_after AS editorialTitleAfter,
editorial_image_url AS editorialImageUrl,
editorial_certification_number AS editorialCertificationNumber,
editorial_certification_label AS editorialCertificationLabel,
editorial_item1_title AS editorialItem1Title,
editorial_item1_text AS editorialItem1Text,
editorial_item2_title AS editorialItem2Title,
editorial_item2_text AS editorialItem2Text,
editorial_item3_title AS editorialItem3Title,
editorial_item3_text AS editorialItem3Text

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
    'featuredCar1Id' => null,
    'featuredCar2Id' => null,
    'featuredCar3Id' => null,
    'featuredEyebrow' => 'The Collection',
    'featuredTitle' => 'Featured machines',
    'featuredLinkText' => 'View full collection',
    'editorialEyebrow' => 'The Veloce Standard',
'editorialTitleBefore' => 'Obsessive curation,',
'editorialTitleAccent' => 'uncompromising',
'editorialTitleAfter' => 'care',

'editorialImageUrl' =>
    'https://images.pexels.com/photos/12959473/pexels-photo-12959473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',

'editorialCertificationNumber' => '120+',
'editorialCertificationLabel' => 'Point certification',

'editorialItem1Title' => 'Concierge Authentication',
'editorialItem1Text' =>
    'Every vehicle is inspected, verified and certified by our master technicians before entering the collection.',

'editorialItem2Title' => 'Complete Provenance',
'editorialItem2Text' =>
    'Full documented history, service records and originality reports accompany each machine.',

'editorialItem3Title' => 'Global Delivery',
'editorialItem3Text' =>
    'Enclosed transport, customs handling and white-glove handover anywhere in the world.',
]);
}


    out([
    'id' => (int)$settings['id'],

    'heroCarId' =>
        $settings['heroCarId'] !== null
            ? (int)$settings['heroCarId']
            : null,

    'featuredCar1Id' =>
        $settings['featuredCar1Id'] !== null
            ? (int)$settings['featuredCar1Id']
            : null,

    'featuredCar2Id' =>
        $settings['featuredCar2Id'] !== null
            ? (int)$settings['featuredCar2Id']
            : null,

    'featuredCar3Id' =>
        $settings['featuredCar3Id'] !== null
            ? (int)$settings['featuredCar3Id']
            : null,
            'featuredEyebrow' =>
    $settings['featuredEyebrow'] ?? 'The Collection',

'featuredTitle' =>
    $settings['featuredTitle'] ?? 'Featured machines',

'featuredLinkText' =>
    $settings['featuredLinkText'] ?? 'View full collection',
    'editorialEyebrow' =>
    $settings['editorialEyebrow']
    ?? 'The Veloce Standard',

'editorialTitleBefore' =>
    $settings['editorialTitleBefore']
    ?? 'Obsessive curation,',

'editorialTitleAccent' =>
    $settings['editorialTitleAccent']
    ?? 'uncompromising',

'editorialTitleAfter' =>
    $settings['editorialTitleAfter']
    ?? 'care',

'editorialImageUrl' =>
    $settings['editorialImageUrl']
    ?? 'https://images.pexels.com/photos/12959473/pexels-photo-12959473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',

'editorialCertificationNumber' =>
    $settings['editorialCertificationNumber']
    ?? '120+',

'editorialCertificationLabel' =>
    $settings['editorialCertificationLabel']
    ?? 'Point certification',

'editorialItem1Title' =>
    $settings['editorialItem1Title']
    ?? 'Concierge Authentication',

'editorialItem1Text' =>
    $settings['editorialItem1Text']
    ?? 'Every vehicle is inspected, verified and certified by our master technicians before entering the collection.',

'editorialItem2Title' =>
    $settings['editorialItem2Title']
    ?? 'Complete Provenance',

'editorialItem2Text' =>
    $settings['editorialItem2Text']
    ?? 'Full documented history, service records and originality reports accompany each machine.',

'editorialItem3Title' =>
    $settings['editorialItem3Title']
    ?? 'Global Delivery',

'editorialItem3Text' =>
    $settings['editorialItem3Text']
    ?? 'Enclosed transport, customs handling and white-glove handover anywhere in the world.',
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


/* =========================================================
   UPDATE FEATURED VEHICLES
========================================================= */

if (
    $route === 'site-settings/featured-cars'
    &&
    $method === 'PUT'
) {

    requirePermission(
        $pdo,
        'site_content.edit'
    );

    $b = body();

    $featuredCarIds =
        isset($b['featuredCarIds'])
        &&
        is_array($b['featuredCarIds'])
            ? array_values($b['featuredCarIds'])
            : [];

    if (count($featuredCarIds) !== 3) {
        fail(
            'Exactly three featured vehicles are required',
            422
        );
    }

    $featuredCarIds =
        array_map(
            'intval',
            $featuredCarIds
        );

    if (
        count(
            array_unique($featuredCarIds)
        ) !== 3
    ) {
        fail(
            'Featured vehicles must be different',
            422
        );
    }

    foreach ($featuredCarIds as $carId) {

        if ($carId <= 0) {
            fail(
                'Invalid featured vehicle',
                422
            );
        }

        $carStatement =
            $pdo->prepare(
                '
                SELECT id
                FROM cars
                WHERE id = ?
                LIMIT 1
                '
            );

        $carStatement->execute([
            $carId
        ]);

        if (!$carStatement->fetch()) {
            fail(
                'One or more selected vehicles do not exist',
                422
            );
        }
    }

    $statement =
        $pdo->prepare(
            '
            INSERT INTO site_settings
            (
                id,
                featured_car_1_id,
                featured_car_2_id,
                featured_car_3_id
            )

            VALUES
            (
                1,
                ?,
                ?,
                ?
            )

            ON DUPLICATE KEY UPDATE
                featured_car_1_id = VALUES(featured_car_1_id),
                featured_car_2_id = VALUES(featured_car_2_id),
                featured_car_3_id = VALUES(featured_car_3_id)
            '
        );

    $statement->execute([
        $featuredCarIds[0],
        $featuredCarIds[1],
        $featuredCarIds[2],
    ]);

    out([
        'success' => true,
        'featuredCarIds' => $featuredCarIds,
    ]);
}
/* =========================================================
   UPDATE FEATURED TEXT
========================================================= */

if (
    $route === 'site-settings/featured-text'
    &&
    $method === 'PUT'
) {

    requirePermission(
        $pdo,
        'site_content.edit'
    );

    $b = body();

    $featuredEyebrow =
        trim(
            (string)(
                $b['featuredEyebrow']
                ?? ''
            )
        );

    $featuredTitle =
        trim(
            (string)(
                $b['featuredTitle']
                ?? ''
            )
        );

    $featuredLinkText =
        trim(
            (string)(
                $b['featuredLinkText']
                ?? ''
            )
        );


    if ($featuredEyebrow === '') {
        fail(
            'Featured eyebrow is required',
            422
        );
    }

    if ($featuredTitle === '') {
        fail(
            'Featured title is required',
            422
        );
    }

    if ($featuredLinkText === '') {
        fail(
            'Featured link text is required',
            422
        );
    }


    $statement =
        $pdo->prepare(
            '
            INSERT INTO site_settings
            (
                id,
                featured_eyebrow,
                featured_title,
                featured_link_text
            )

            VALUES
            (
                1,
                ?,
                ?,
                ?
            )

            ON DUPLICATE KEY UPDATE
                featured_eyebrow = VALUES(featured_eyebrow),
                featured_title = VALUES(featured_title),
                featured_link_text = VALUES(featured_link_text)
            '
        );

    $statement->execute([
        $featuredEyebrow,
        $featuredTitle,
        $featuredLinkText,
    ]);


    out([
        'success' => true,

        'featuredEyebrow' =>
            $featuredEyebrow,

        'featuredTitle' =>
            $featuredTitle,

        'featuredLinkText' =>
            $featuredLinkText,
    ]);
}
/* =========================================================
   UPDATE EDITORIAL CONTENT
========================================================= */

if (
    $route === 'site-settings/editorial'
    &&
    $method === 'PUT'
) {

    requirePermission(
        $pdo,
        'site_content.edit'
    );

    $b = body();

    $editorialEyebrow =
        trim((string)($b['editorialEyebrow'] ?? ''));

    $editorialTitleBefore =
        trim((string)($b['editorialTitleBefore'] ?? ''));

    $editorialTitleAccent =
        trim((string)($b['editorialTitleAccent'] ?? ''));

    $editorialTitleAfter =
        trim((string)($b['editorialTitleAfter'] ?? ''));

    $editorialImageUrl =
        trim((string)($b['editorialImageUrl'] ?? ''));

    $editorialCertificationNumber =
        trim((string)($b['editorialCertificationNumber'] ?? ''));

    $editorialCertificationLabel =
        trim((string)($b['editorialCertificationLabel'] ?? ''));

    $editorialItem1Title =
        trim((string)($b['editorialItem1Title'] ?? ''));

    $editorialItem1Text =
        trim((string)($b['editorialItem1Text'] ?? ''));

    $editorialItem2Title =
        trim((string)($b['editorialItem2Title'] ?? ''));

    $editorialItem2Text =
        trim((string)($b['editorialItem2Text'] ?? ''));

    $editorialItem3Title =
        trim((string)($b['editorialItem3Title'] ?? ''));

    $editorialItem3Text =
        trim((string)($b['editorialItem3Text'] ?? ''));


    if (
        $editorialEyebrow === '' ||
        $editorialTitleBefore === '' ||
        $editorialTitleAccent === '' ||
        $editorialTitleAfter === '' ||
        $editorialImageUrl === '' ||
        $editorialCertificationNumber === '' ||
        $editorialCertificationLabel === '' ||
        $editorialItem1Title === '' ||
        $editorialItem1Text === '' ||
        $editorialItem2Title === '' ||
        $editorialItem2Text === '' ||
        $editorialItem3Title === '' ||
        $editorialItem3Text === ''
    ) {
        fail(
            'All editorial fields are required',
            422
        );
    }


    $statement =
        $pdo->prepare(
            '
            INSERT INTO site_settings
            (
                id,
                editorial_eyebrow,
                editorial_title_before,
                editorial_title_accent,
                editorial_title_after,
                editorial_image_url,
                editorial_certification_number,
                editorial_certification_label,
                editorial_item1_title,
                editorial_item1_text,
                editorial_item2_title,
                editorial_item2_text,
                editorial_item3_title,
                editorial_item3_text
            )

            VALUES
            (
                1,
                ?,?,?,?,?,?,?,?,?,?,?,?,?
            )

            ON DUPLICATE KEY UPDATE
                editorial_eyebrow = VALUES(editorial_eyebrow),
                editorial_title_before = VALUES(editorial_title_before),
                editorial_title_accent = VALUES(editorial_title_accent),
                editorial_title_after = VALUES(editorial_title_after),
                editorial_image_url = VALUES(editorial_image_url),
                editorial_certification_number = VALUES(editorial_certification_number),
                editorial_certification_label = VALUES(editorial_certification_label),
                editorial_item1_title = VALUES(editorial_item1_title),
                editorial_item1_text = VALUES(editorial_item1_text),
                editorial_item2_title = VALUES(editorial_item2_title),
                editorial_item2_text = VALUES(editorial_item2_text),
                editorial_item3_title = VALUES(editorial_item3_title),
                editorial_item3_text = VALUES(editorial_item3_text)
            '
        );


    $statement->execute([
        $editorialEyebrow,
        $editorialTitleBefore,
        $editorialTitleAccent,
        $editorialTitleAfter,
        $editorialImageUrl,
        $editorialCertificationNumber,
        $editorialCertificationLabel,
        $editorialItem1Title,
        $editorialItem1Text,
        $editorialItem2Title,
        $editorialItem2Text,
        $editorialItem3Title,
        $editorialItem3Text,
    ]);


    out([
        'success' => true,

        'editorialEyebrow' =>
            $editorialEyebrow,

        'editorialTitleBefore' =>
            $editorialTitleBefore,

        'editorialTitleAccent' =>
            $editorialTitleAccent,

        'editorialTitleAfter' =>
            $editorialTitleAfter,

        'editorialImageUrl' =>
            $editorialImageUrl,

        'editorialCertificationNumber' =>
            $editorialCertificationNumber,

        'editorialCertificationLabel' =>
            $editorialCertificationLabel,

        'editorialItem1Title' =>
            $editorialItem1Title,

        'editorialItem1Text' =>
            $editorialItem1Text,

        'editorialItem2Title' =>
            $editorialItem2Title,

        'editorialItem2Text' =>
            $editorialItem2Text,

        'editorialItem3Title' =>
            $editorialItem3Title,

        'editorialItem3Text' =>
            $editorialItem3Text,
    ]);
}