<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| GET / CREATE CONVERSATION FOR A CAR
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^messages/car/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'POST'
) {
    $user =
        authenticatedUser($pdo);

    $carId =
        (int)$matches[1];

    $statement =
        $pdo->prepare(
            'SELECT
                id,
                seller_id
             FROM cars
             WHERE id = ?
             LIMIT 1'
        );

    $statement->execute([
        $carId
    ]);

    $car =
        $statement->fetch();

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

    if (!$sellerId) {
        fail(
            'This vehicle does not have a seller.',
            422
        );
    }

    if ($sellerId === $user['id']) {
        fail(
            'You cannot message yourself.',
            422
        );
    }

    $find =
        $pdo->prepare(
            'SELECT id
             FROM conversations
             WHERE car_id = ?
               AND customer_id = ?
               AND seller_id = ?
             LIMIT 1'
        );

    $find->execute([
        $carId,
        $user['id'],
        $sellerId
    ]);

    $conversationId =
        $find->fetchColumn();

    if (!$conversationId) {

        $insert =
            $pdo->prepare(
                'INSERT INTO conversations
                (
                    car_id,
                    customer_id,
                    seller_id
                )
                VALUES (?, ?, ?)'
            );

        $insert->execute([
            $carId,
            $user['id'],
            $sellerId
        ]);

        $conversationId =
            (int)$pdo->lastInsertId();
    }

    out([
        'conversationId' =>
            (int)$conversationId
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| GET MY CONVERSATIONS
|--------------------------------------------------------------------------
*/

if (
    $route === 'messages'
    &&
    $method === 'GET'
) {
    $user =
        authenticatedUser($pdo);

    $statement =
        $pdo->prepare(
            'SELECT
                c.id,
                c.car_id AS carId,
                c.customer_id AS customerId,
                c.seller_id AS sellerId,
                c.updated_at AS updatedAt,

                car.name AS carName,
                car.year AS carYear,

                b.name AS brandName,

                customer.name AS customerName,
                seller.name AS sellerName,

                (
                    SELECT m.message
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.id DESC
                    LIMIT 1
                ) AS lastMessage,

                (
                    SELECT m.created_at
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.id DESC
                    LIMIT 1
                ) AS lastMessageAt,

                (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.conversation_id = c.id
                      AND m.sender_id <> ?
                      AND m.is_read = 0
                ) AS unreadCount

             FROM conversations c

             INNER JOIN cars car
                ON car.id = c.car_id

             INNER JOIN brands b
                ON b.id = car.brand_id

             INNER JOIN users customer
                ON customer.id = c.customer_id

             INNER JOIN users seller
                ON seller.id = c.seller_id

             WHERE
    (
        c.customer_id = ?
        OR
        c.seller_id = ?
    )

    AND EXISTS (
        SELECT 1
        FROM messages mx
        WHERE mx.conversation_id = c.id
    )

ORDER BY
    COALESCE(lastMessageAt, c.updated_at)
DESC'
        );

    $statement->execute([
        $user['id'],
        $user['id'],
        $user['id']
    ]);

    $conversations =
        $statement->fetchAll();

    foreach (
        $conversations
        as &$conversation
    ) {
        $conversation['id'] =
            (int)$conversation['id'];

        $conversation['carId'] =
            (int)$conversation['carId'];

        $conversation['customerId'] =
            (int)$conversation['customerId'];

        $conversation['sellerId'] =
            (int)$conversation['sellerId'];

        $conversation['unreadCount'] =
            (int)$conversation['unreadCount'];
    }

    unset($conversation);

    out([
        'conversations' =>
            $conversations
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| GET ONE CONVERSATION + MESSAGES
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^messages/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'GET'
) {
    $user =
        authenticatedUser($pdo);

    $conversationId =
        (int)$matches[1];

    $statement =
        $pdo->prepare(
            'SELECT
                c.id,
                c.car_id AS carId,
                c.customer_id AS customerId,
                c.seller_id AS sellerId,

                car.name AS carName,
                car.year AS carYear,

                b.name AS brandName,

                customer.name AS customerName,
                seller.name AS sellerName

             FROM conversations c

             INNER JOIN cars car
                ON car.id = c.car_id

             INNER JOIN brands b
                ON b.id = car.brand_id

             INNER JOIN users customer
                ON customer.id = c.customer_id

             INNER JOIN users seller
                ON seller.id = c.seller_id

             WHERE c.id = ?
               AND (
                    c.customer_id = ?
                    OR
                    c.seller_id = ?
               )

             LIMIT 1'
        );

    $statement->execute([
        $conversationId,
        $user['id'],
        $user['id']
    ]);

    $conversation =
        $statement->fetch();

    if (!$conversation) {
        fail(
            'Conversation not found',
            404
        );
    }

    $messageStatement =
        $pdo->prepare(
            'SELECT
                m.id,
                m.sender_id AS senderId,
                m.message,
                m.is_read AS isRead,
                m.created_at AS createdAt,

                u.name AS senderName

             FROM messages m

             INNER JOIN users u
                ON u.id = m.sender_id

             WHERE m.conversation_id = ?

             ORDER BY m.id ASC'
        );

    $messageStatement->execute([
        $conversationId
    ]);

    $messages =
        $messageStatement->fetchAll();

    foreach ($messages as &$message) {
        $message['id'] =
            (int)$message['id'];

        $message['senderId'] =
            (int)$message['senderId'];

        $message['isRead'] =
            (bool)$message['isRead'];
    }

    unset($message);

    /*
     * Mark messages from the other person as read.
     */

    $markRead =
        $pdo->prepare(
            'UPDATE messages
             SET is_read = 1
             WHERE conversation_id = ?
               AND sender_id <> ?
               AND is_read = 0'
        );

    $markRead->execute([
        $conversationId,
        $user['id']
    ]);

    out([
        'conversation' => [
            'id' =>
                (int)$conversation['id'],

            'carId' =>
                (int)$conversation['carId'],

            'customerId' =>
                (int)$conversation['customerId'],

            'sellerId' =>
                (int)$conversation['sellerId'],

            'carName' =>
                $conversation['carName'],

            'carYear' =>
                (int)$conversation['carYear'],

            'brandName' =>
                $conversation['brandName'],

            'customerName' =>
                $conversation['customerName'],

            'sellerName' =>
                $conversation['sellerName'],
        ],

        'messages' =>
            $messages
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| SEND MESSAGE
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '#^messages/(\d+)$#',
        $route,
        $matches
    )
    &&
    $method === 'POST'
) {
    $user =
        authenticatedUser($pdo);

    $conversationId =
        (int)$matches[1];

    $b = body();

    $messageText =
        trim(
            (string)($b['message'] ?? '')
        );

    if ($messageText === '') {
        fail(
            'Message is required',
            422
        );
    }

    if (mb_strlen($messageText) > 2000) {
        fail(
            'Message is too long',
            422
        );
    }

    $check =
    $pdo->prepare(
        'SELECT
            c.id,
            c.car_id,
            c.customer_id,
            c.seller_id,

            car.name AS car_name,
            car.year AS car_year,

            b.name AS brand_name,

            customer.name AS customer_name

         FROM conversations c

         INNER JOIN cars car
            ON car.id = c.car_id

         INNER JOIN brands b
            ON b.id = car.brand_id

         INNER JOIN users customer
            ON customer.id = c.customer_id

         WHERE c.id = ?
           AND (
                c.customer_id = ?
                OR
                c.seller_id = ?
           )

         LIMIT 1'
    );

$check->execute([
    $conversationId,
    $user['id'],
    $user['id']
]);

$conversationForMessage =
    $check->fetch();

    if (!$conversationForMessage) {
    fail(
        'Conversation not found',
        404
    );
}
    /*
|--------------------------------------------------------------------------
| CHECK IF THIS IS THE FIRST MESSAGE
|--------------------------------------------------------------------------
*/

$firstMessageCheck =
    $pdo->prepare(
        'SELECT COUNT(*)
         FROM messages
         WHERE conversation_id = ?'
    );

$firstMessageCheck->execute([
    $conversationId
]);

$isFirstMessage =
    (int)$firstMessageCheck->fetchColumn() === 0;
    $shouldSendWhatsApp =
    $isFirstMessage
    &&
    (int)$conversationForMessage['customer_id']
        === (int)$user['id'];
        error_log(
    'WHATSAPP TEST: first=' .
    ($isFirstMessage ? 'YES' : 'NO') .
    ' shouldSend=' .
    ($shouldSendWhatsApp ? 'YES' : 'NO') .
    ' customer=' .
    $conversationForMessage['customer_id'] .
    ' currentUser=' .
    $user['id']
);

    $insert =
        $pdo->prepare(
            'INSERT INTO messages
            (
                conversation_id,
                sender_id,
                message,
                is_read
            )
            VALUES (?, ?, ?, 0)'
        );

    $insert->execute([
        $conversationId,
        $user['id'],
        $messageText
    ]);

    $messageId =
        (int)$pdo->lastInsertId();

    $updateConversation =
        $pdo->prepare(
            'UPDATE conversations
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );

    $updateConversation->execute([
        $conversationId
    ]);
    if ($shouldSendWhatsApp) {
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
        (int)$conversationForMessage['seller_id']
    ]);

    $seller =
        $sellerStatement->fetch();

    if (
        $seller &&
        !empty($seller['phone'])
    ) {
        $customerName =
            $conversationForMessage['customer_name'];

        $carName =
            $conversationForMessage['car_name'];

        $carYear =
            $conversationForMessage['car_year'];

        $brandName =
            $conversationForMessage['brand_name'];

        $whatsappMessage =
            "Hello {$seller['name']},\n\n"
            . "{$customerName} contacted you about your "
            . "{$carYear} {$brandName} {$carName} on VELOCE.\n\n"
            . "Log in to VELOCE to view the message and reply.";

        sendWhatsAppMessage(
            $seller['phone'],
            $whatsappMessage
        );
    }
}


    out(
        [
            'message' => [
                'id' =>
                    $messageId,

                'conversationId' =>
                    $conversationId,

                'senderId' =>
                    $user['id'],

                'senderName' =>
                    $user['name'],

                'message' =>
                    $messageText,

                'isRead' =>
                    false,

                'createdAt' =>
                    date('Y-m-d H:i:s'),
            ]
        ],
        201
    );

    exit;
}


/*
|--------------------------------------------------------------------------
| UNREAD MESSAGE COUNT
|--------------------------------------------------------------------------
*/

if (
    $route === 'messages/unread-count'
    &&
    $method === 'GET'
) {
    $user =
        authenticatedUser($pdo);

    $statement =
        $pdo->prepare(
            'SELECT COUNT(*)

             FROM messages m

             INNER JOIN conversations c
                ON c.id = m.conversation_id

             WHERE
                (
                    c.customer_id = ?
                    OR
                    c.seller_id = ?
                )

               AND m.sender_id <> ?

               AND m.is_read = 0'
        );

    $statement->execute([
        $user['id'],
        $user['id'],
        $user['id']
    ]);

    out([
        'unreadCount' =>
            (int)$statement->fetchColumn()
    ]);

    exit;
}