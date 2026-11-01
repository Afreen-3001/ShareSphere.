<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "POST method required"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data["name"] ?? "");
$email = trim(strtolower($data["email"] ?? ""));
$password = $data["password"] ?? "";
$phone = trim($data["phone"] ?? "");
$role = strtolower(trim($data["role"] ?? ""));
$organization = trim($data["organization_name"] ?? "");

if (!$name || !$email || !$password || !in_array($role, ["donor", "ngo"])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Please provide all required information."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid email address."]);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Password must contain at least 8 characters."]);
    exit;
}

if ($role === "ngo" && !$organization) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Organization name is required."]);
    exit;
}

try {
    $conn->beginTransaction();

    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]);

    if ($check->fetch()) {
        $conn->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "This email is already registered."]);
        exit;
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare(
        "INSERT INTO users (name, email, password, phone, role)
         VALUES (?, ?, ?, ?, ?)"
    );

    $stmt->execute([$name, $email, $hashedPassword, $phone, $role]);

    $userId = $conn->lastInsertId();

    if ($role === "ngo") {
        $ngo = $conn->prepare(
            "INSERT INTO ngo_profiles (user_id, organization_name)
             VALUES (?, ?)"
        );
        $ngo->execute([$userId, $organization]);
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Registration successful."
    ]);

} catch (PDOException $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Registration failed."
    ]);
}