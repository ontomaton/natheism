<?php
header('Content-Type: application/json');

$AUTH_HASH = '6c02b16dd0d13afc3545898c99a341b41e44d88c4bda8e50d0104d00200fcd0e';
$DATA_DIR = __DIR__ . '/data';
$POSTS_FILE = $DATA_DIR . '/posts.json';
$UPLOADS_DIR = __DIR__ . '/uploads';

// Auth check
function checkAuth() {
    global $AUTH_HASH;
    $headers = getallheaders();
    $auth = isset($headers['X-Auth']) ? $headers['X-Auth'] : '';
    if (!$auth) {
        $auth = isset($headers['x-auth']) ? $headers['x-auth'] : '';
    }
    return $auth === $AUTH_HASH;
}

function readPosts() {
    global $POSTS_FILE;
    if (!file_exists($POSTS_FILE)) return [];
    $data = file_get_contents($POSTS_FILE);
    return json_decode($data, true) ?: [];
}

function writePosts($posts) {
    global $POSTS_FILE;
    file_put_contents($POSTS_FILE, json_encode($posts, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function generateId() {
    return substr(md5(uniqid(mt_rand(), true)), 0, 8);
}

function generateLikes() {
    return rand(5000, 50000);
}

function extractYouTubeId($url) {
    $patterns = [
        '/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

// Routing
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';

// GET - list posts (no auth needed)
if ($method === 'GET' && $action === 'posts') {
    echo json_encode(readPosts());
    exit;
}

// GET - list gallery photos (no auth needed)
if ($method === 'GET' && $action === 'gallery') {
    $galleryDir = __DIR__ . '/gallery';
    $photos = [];
    if (is_dir($galleryDir)) {
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $files = scandir($galleryDir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, $allowed)) {
                $photos[] = [
                    'url' => '/gallery/' . $file,
                    'filename' => $file,
                    'modified' => filemtime($galleryDir . '/' . $file)
                ];
            }
        }
        usort($photos, function($a, $b) {
            return $b['modified'] - $a['modified'];
        });
    }
    echo json_encode($photos);
    exit;
}

// All other actions require auth
if (!checkAuth()) {
    http_response_code(401);
    echo json_encode(['error' => 'UNAUTHORIZED. THIS INCIDENT HAS BEEN LOGGED.']);
    exit;
}

// POST - create post
if ($method === 'POST' && $action === 'create') {
    $posts = readPosts();

    $type = isset($_POST['type']) ? $_POST['type'] : 'text';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $author = isset($_POST['author']) && $_POST['author'] !== '' ? $_POST['author'] : null;
    $linkUrl = isset($_POST['linkUrl']) ? $_POST['linkUrl'] : null;
    $linkTitle = isset($_POST['linkTitle']) ? $_POST['linkTitle'] : null;
    $likes = isset($_POST['likes']) && $_POST['likes'] !== '' ? intval($_POST['likes']) : generateLikes();
    $featured = isset($_POST['featured']) && ($_POST['featured'] === 'true' || $_POST['featured'] === '1');

    $newPost = [
        'id' => generateId(),
        'type' => $type,
        'author' => $author,
        'content' => $content,
        'mediaUrl' => null,
        'linkUrl' => $linkUrl ?: null,
        'linkTitle' => $linkTitle ?: null,
        'timestamp' => date('c'),
        'likes' => $likes,
        'featured' => $featured,
    ];

    // Handle photo upload
    if ($type === 'photo' && isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        if (!is_dir($UPLOADS_DIR)) {
            mkdir($UPLOADS_DIR, 0755, true);
        }
        $ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (in_array($ext, $allowed)) {
            $filename = generateId() . '_' . time() . '.' . $ext;
            $dest = $UPLOADS_DIR . '/' . $filename;
            if (move_uploaded_file($_FILES['photo']['tmp_name'], $dest)) {
                $newPost['mediaUrl'] = '/uploads/' . $filename;
            }
        }
    }

    // Handle video URL
    if ($type === 'video' && isset($_POST['mediaUrl']) && $_POST['mediaUrl'] !== '') {
        $videoId = extractYouTubeId($_POST['mediaUrl']);
        $newPost['mediaUrl'] = $videoId ? "https://www.youtube.com/embed/$videoId" : $_POST['mediaUrl'];
    }

    $posts[] = $newPost;
    writePosts($posts);

    http_response_code(201);
    echo json_encode($newPost);
    exit;
}

// POST - toggle feature
if ($method === 'POST' && $action === 'feature' && $id) {
    $posts = readPosts();
    foreach ($posts as &$post) {
        if ($post['id'] === $id) {
            $post['featured'] = !$post['featured'];
            writePosts($posts);
            echo json_encode($post);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'POST NOT FOUND.']);
    exit;
}

// POST - delete (using action=delete since shared hosting may not support DELETE method)
if ($method === 'POST' && $action === 'delete' && $id) {
    $posts = readPosts();
    $filtered = [];
    $found = false;
    foreach ($posts as $post) {
        if ($post['id'] === $id) {
            $found = true;
            // Delete uploaded file if exists
            if ($post['mediaUrl'] && strpos($post['mediaUrl'], '/uploads/') === 0) {
                $filePath = __DIR__ . $post['mediaUrl'];
                if (file_exists($filePath)) unlink($filePath);
            }
        } else {
            $filtered[] = $post;
        }
    }
    if ($found) {
        writePosts($filtered);
        echo json_encode(['message' => 'DISPATCH REDACTED.']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'POST NOT FOUND.']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'INVALID REQUEST.']);
