<?php

declare(strict_types=1);

function sendWhatsAppMessage(
    string $phone,
    string $message
): bool {
    $apiUrl =
        rtrim(
            getenv('GREEN_API_URL') ?: '',
            '/'
        );

    $instanceId =
        getenv('GREEN_API_INSTANCE_ID') ?: '';

    $token =
        getenv('GREEN_API_TOKEN') ?: '';

    if (
        $apiUrl === ''
        ||
        $instanceId === ''
        ||
        $token === ''
    ) {
        error_log(
            'GREEN-API configuration is missing'
        );

        return false;
    }

    $phone = preg_replace(
        '/\D+/',
        '',
        $phone
    );

    if ($phone === '') {
        return false;
    }

    $url =
        $apiUrl .
        '/waInstance' .
        $instanceId .
        '/sendMessage/' .
        $token;

    $payload = json_encode([
        'chatId' =>
            $phone . '@c.us',

        'message' =>
            $message,
    ]);

    if ($payload === false) {
        return false;
    }

    $ch = curl_init($url);

    curl_setopt_array(
        $ch,
        [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 20,
        ]
    );

    $response =
        curl_exec($ch);

    $httpCode =
        (int)curl_getinfo(
            $ch,
            CURLINFO_HTTP_CODE
        );

    if ($response === false) {
        error_log(
            'GREEN-API Error: ' .
            curl_error($ch)
        );

        curl_close($ch);

        return false;
    }

    curl_close($ch);

    if (
        $httpCode < 200
        ||
        $httpCode >= 300
    ) {
        error_log(
            'GREEN-API HTTP Error: ' .
            $httpCode .
            ' Response: ' .
            $response
        );

        return false;
    }

    return true;
}