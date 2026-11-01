<?php
header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    try {
        $stmt = $conn->query(
            "SELECT donations.*, users.name AS donor_name
             FROM donations
             JOIN users ON donations.donor_id = users.id
             ORDER BY donations.created_at DESC"
        );

        echo json_encode([
            "success" => true,
            "donations" => $stmt->fetchAll()
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Could not load donations."]);
    }
    exit;
}

if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);

    $donorId = $data["donor_id"] ?? "";
    $title = trim($data["title"] ?? "");
    $description = trim($data["description"] ?? "");
    $category = strtolower(trim($data["category"] ?? ""));
    $quantity = trim($data["quantity"] ?? "1");
    $condition = trim($data["condition_status"] ?? "good");
    $location = trim($data["location"] ?? "");

    if (!$donorId || !$title || !$category || !$location) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Required donation information is missing."]);
        exit;
    }

if (!in_array($category, [
    "food",
    "clothes",
    "books",
    "electronics",
    "home items",
    "other"
]))    }

    try {
        $stmt = $conn->prepare(
            "INSERT INTO donations
            (donor_id, title, description, category, quantity, condition_status, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)"
        );

        $stmt->execute([
            $donorId,
            $title,
            $description,
            $category,
            $quantity,
            $condition,
            $location
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Donation saved successfully.",
            "donation_id" => $conn->lastInsertId()
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Could not save donation."]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed."]);