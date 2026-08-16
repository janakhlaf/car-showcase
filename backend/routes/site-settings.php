<?php


/*
|--------------------------------------------------------------------------
| SITE SETTINGS / HOME CMS
|--------------------------------------------------------------------------
|
| site_settings:
|   - Hero vehicle
|   - Featured vehicles
|
| home_content:
|   - Homepage text
|   - Homepage images
|   - Section content
|
*/


/* =========================================================
   HELPER: UPSERT HOME CONTENT
========================================================= */

function saveHomeContent(
    PDO $pdo,
    string $section,
    array $values
): void {

    $statement = $pdo->prepare(
        '
        INSERT INTO home_content
        (
            section,
            content_key,
            content_value
        )
        VALUES
        (
            ?,
            ?,
            ?
        )

        ON DUPLICATE KEY UPDATE
            content_value = VALUES(content_value)
        '
    );

    foreach ($values as $key => $value) {

        $statement->execute([
            $section,
            $key,
            $value,
        ]);
    }
}


/* =========================================================
   GET SITE SETTINGS + HOME CONTENT
========================================================= */

if (
    $route === 'site-settings'
    &&
    $method === 'GET'
) {

    /*
     * Vehicle settings
     */

    $settingsStatement = $pdo->query(
        '
        SELECT
            id,
            hero_car_id AS heroCarId,
            featured_car_1_id AS featuredCar1Id,
            featured_car_2_id AS featuredCar2Id,
            featured_car_3_id AS featuredCar3Id

        FROM site_settings

        WHERE id = 1

        LIMIT 1
        '
    );

    $settings = $settingsStatement->fetch();


    /*
     * Homepage CMS content
     */

    $contentStatement = $pdo->query(
        '
        SELECT
            section,
            content_key,
            content_value

        FROM home_content
        '
    );

    $contentRows = $contentStatement->fetchAll();


    /*
     * Convert rows into:
     *
     * $content["editorial"]["eyebrow"]
     * $content["featured"]["title"]
     */

    $content = [];

    foreach ($contentRows as $row) {

        $section =
            (string)$row['section'];

        $key =
            (string)$row['content_key'];

        $content[$section][$key] =
            $row['content_value'];
    }


    /*
     * Vehicle IDs
     */

    $heroCarId =
        $settings &&
        $settings['heroCarId'] !== null
            ? (int)$settings['heroCarId']
            : null;

    $featuredCar1Id =
        $settings &&
        $settings['featuredCar1Id'] !== null
            ? (int)$settings['featuredCar1Id']
            : null;

    $featuredCar2Id =
        $settings &&
        $settings['featuredCar2Id'] !== null
            ? (int)$settings['featuredCar2Id']
            : null;

    $featuredCar3Id =
        $settings &&
        $settings['featuredCar3Id'] !== null
            ? (int)$settings['featuredCar3Id']
            : null;


    /*
     * Return same field names currently expected
     * by Admin + HomePage.
     */

    out([
        'id' => 1,

        'heroCarId' =>
            $heroCarId,

        'featuredCar1Id' =>
            $featuredCar1Id,

        'featuredCar2Id' =>
            $featuredCar2Id,

        'featuredCar3Id' =>
            $featuredCar3Id,


        /*
         * Featured section
         */

        'featuredEyebrow' =>
            $content['featured']['eyebrow']
            ?? '',

        'featuredTitle' =>
            $content['featured']['title']
            ?? '',

        'featuredLinkText' =>
            $content['featured']['link_text']
            ?? '',


        /*
         * Editorial section
         */

        'editorialEyebrow' =>
            $content['editorial']['eyebrow']
            ?? '',

        'editorialTitleBefore' =>
            $content['editorial']['title_before']
            ?? '',

        'editorialTitleAccent' =>
            $content['editorial']['title_accent']
            ?? '',

        'editorialTitleAfter' =>
            $content['editorial']['title_after']
            ?? '',

        'editorialImageUrl' =>
            $content['editorial']['image_url']
            ?? '',

        'editorialCertificationNumber' =>
            $content['editorial']['certification_number']
            ?? '',

        'editorialCertificationLabel' =>
            $content['editorial']['certification_label']
            ?? '',

        'editorialItem1Title' =>
            $content['editorial']['item1_title']
            ?? '',

        'editorialItem1Text' =>
            $content['editorial']['item1_text']
            ?? '',

        'editorialItem2Title' =>
            $content['editorial']['item2_title']
            ?? '',

        'editorialItem2Text' =>
            $content['editorial']['item2_text']
            ?? '',

        'editorialItem3Title' =>
            $content['editorial']['item3_title']
            ?? '',

        'editorialItem3Text' =>
            $content['editorial']['item3_text']
            ?? '',
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

    requirePermission(
        $pdo,
        'site_content.edit'
    );

    $b = body();


    $heroCarId =
        isset($b['heroCarId'])
        &&
        $b['heroCarId'] !== ''
        &&
        $b['heroCarId'] !== null
            ? (int)$b['heroCarId']
            : null;


    /*
     * Validate vehicle
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
     * Save hero selection
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
            ? array_values(
                $b['featuredCarIds']
            )
            : [];


    /*
     * Must have exactly 3
     */

    if (
        count($featuredCarIds) !== 3
    ) {

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


    /*
     * Must be different
     */

    if (
        count(
            array_unique(
                $featuredCarIds
            )
        ) !== 3
    ) {

        fail(
            'Featured vehicles must be different',
            422
        );
    }


    /*
     * Validate cars
     */

    $carStatement = $pdo->prepare(
        '
        SELECT id
        FROM cars
        WHERE id = ?
        LIMIT 1
        '
    );

    foreach ($featuredCarIds as $carId) {

        if ($carId <= 0) {

            fail(
                'Invalid featured vehicle',
                422
            );
        }


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


    /*
     * Save vehicle selections
     */

    $statement = $pdo->prepare(
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
            featured_car_1_id =
                VALUES(featured_car_1_id),

            featured_car_2_id =
                VALUES(featured_car_2_id),

            featured_car_3_id =
                VALUES(featured_car_3_id)
        '
    );


    $statement->execute([
        $featuredCarIds[0],
        $featuredCarIds[1],
        $featuredCarIds[2],
    ]);


    out([
        'success' => true,

        'featuredCarIds' =>
            $featuredCarIds,
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


    /*
     * Save into home_content
     */

    $pdo->beginTransaction();

    try {

        saveHomeContent(
            $pdo,
            'featured',
            [
                'eyebrow' =>
                    $featuredEyebrow,

                'title' =>
                    $featuredTitle,

                'link_text' =>
                    $featuredLinkText,
            ]
        );

        $pdo->commit();

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $e;
    }


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
        trim(
            (string)(
                $b['editorialEyebrow']
                ?? ''
            )
        );

    $editorialTitleBefore =
        trim(
            (string)(
                $b['editorialTitleBefore']
                ?? ''
            )
        );

    $editorialTitleAccent =
        trim(
            (string)(
                $b['editorialTitleAccent']
                ?? ''
            )
        );

    $editorialTitleAfter =
        trim(
            (string)(
                $b['editorialTitleAfter']
                ?? ''
            )
        );

    $editorialImageUrl =
        trim(
            (string)(
                $b['editorialImageUrl']
                ?? ''
            )
        );

    $editorialCertificationNumber =
        trim(
            (string)(
                $b['editorialCertificationNumber']
                ?? ''
            )
        );

    $editorialCertificationLabel =
        trim(
            (string)(
                $b['editorialCertificationLabel']
                ?? ''
            )
        );

    $editorialItem1Title =
        trim(
            (string)(
                $b['editorialItem1Title']
                ?? ''
            )
        );

    $editorialItem1Text =
        trim(
            (string)(
                $b['editorialItem1Text']
                ?? ''
            )
        );

    $editorialItem2Title =
        trim(
            (string)(
                $b['editorialItem2Title']
                ?? ''
            )
        );

    $editorialItem2Text =
        trim(
            (string)(
                $b['editorialItem2Text']
                ?? ''
            )
        );

    $editorialItem3Title =
        trim(
            (string)(
                $b['editorialItem3Title']
                ?? ''
            )
        );

    $editorialItem3Text =
        trim(
            (string)(
                $b['editorialItem3Text']
                ?? ''
            )
        );


    /*
     * Validation
     */

    if (
        $editorialEyebrow === ''
        ||
        $editorialTitleBefore === ''
        ||
        $editorialTitleAccent === ''
        ||
        $editorialTitleAfter === ''
        ||
        $editorialImageUrl === ''
        ||
        $editorialCertificationNumber === ''
        ||
        $editorialCertificationLabel === ''
        ||
        $editorialItem1Title === ''
        ||
        $editorialItem1Text === ''
        ||
        $editorialItem2Title === ''
        ||
        $editorialItem2Text === ''
        ||
        $editorialItem3Title === ''
        ||
        $editorialItem3Text === ''
    ) {

        fail(
            'All editorial fields are required',
            422
        );
    }


    /*
     * Save into home_content
     */

    $pdo->beginTransaction();

    try {

        saveHomeContent(
            $pdo,
            'editorial',
            [
                'eyebrow' =>
                    $editorialEyebrow,

                'title_before' =>
                    $editorialTitleBefore,

                'title_accent' =>
                    $editorialTitleAccent,

                'title_after' =>
                    $editorialTitleAfter,

                'image_url' =>
                    $editorialImageUrl,

                'certification_number' =>
                    $editorialCertificationNumber,

                'certification_label' =>
                    $editorialCertificationLabel,

                'item1_title' =>
                    $editorialItem1Title,

                'item1_text' =>
                    $editorialItem1Text,

                'item2_title' =>
                    $editorialItem2Title,

                'item2_text' =>
                    $editorialItem2Text,

                'item3_title' =>
                    $editorialItem3Title,

                'item3_text' =>
                    $editorialItem3Text,
            ]
        );

        $pdo->commit();

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $e;
    }


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