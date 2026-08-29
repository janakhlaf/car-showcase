<?php

/*
|--------------------------------------------------------------------------
| UPLOAD SITE CONTENT IMAGE
|--------------------------------------------------------------------------
*/

if (
    $route === 'site-content/upload-image'
    &&
    $method === 'POST'
) {
    requirePermission(
        $pdo,
        'site_content.edit'
    );

    /*
     * Check uploaded file.
     */
    if (
        !isset($_FILES['image'])
        ||
        !is_array($_FILES['image'])
    ) {
        fail(
            'Image is required',
            422
        );
    }

    $file = $_FILES['image'];

    if (
        ($file['error'] ?? UPLOAD_ERR_NO_FILE)
        !== UPLOAD_ERR_OK
    ) {
        fail(
            'Image upload failed',
            422
        );
    }

    /*
     * Maximum size: 10 MB
     */
    if (
        (int)$file['size']
        >
        10 * 1024 * 1024
    ) {
        fail(
            'Image must not exceed 10 MB',
            422
        );
    }

    /*
     * Validate actual image MIME type.
     */
    $finfo = new finfo(
        FILEINFO_MIME_TYPE
    );

    $mimeType = $finfo->file(
        $file['tmp_name']
    );

    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    if (
        !isset(
            $allowedTypes[$mimeType]
        )
    ) {
        fail(
            'Only JPG, PNG and WEBP images are allowed',
            422
        );
    }

    /*
     * Storage directory:
     * C:\xampp\htdocs\site-content-images
     */
    $uploadDirectory =
        'C:/xampp/htdocs/site-content-images';

    if (
        !is_dir($uploadDirectory)
    ) {
        fail(
            'Site content image directory does not exist',
            500
        );
    }

    /*
     * Generate safe unique filename.
     */
    $extension =
        $allowedTypes[$mimeType];

    try {
        $randomName =
            bin2hex(
                random_bytes(16)
            );
    } catch (Throwable $e) {
        fail(
            'Could not generate image filename',
            500
        );
    }

    $filename =
        'site-'
        . $randomName
        . '.'
        . $extension;

    $destination =
        $uploadDirectory
        . DIRECTORY_SEPARATOR
        . $filename;

    /*
     * Move uploaded image.
     */
    if (
        !move_uploaded_file(
            $file['tmp_name'],
            $destination
        )
    ) {
        fail(
            'Could not save uploaded image',
            500
        );
    }

    /*
     * URL stored in home_content.
     */
    $imageUrl =
        'http://localhost/site-content-images/'
        . $filename;

    out([
        'success' => true,
        'url' => $imageUrl,
    ]);
}