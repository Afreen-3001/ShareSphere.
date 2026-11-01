<?php
header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $requestId = $_GET["request_id"] ?? "";
    $userId = $_GET["user_id"] ?? "";

    if (!$requestId || !$userId) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Request ID and user ID are required."
        ]);
        exit;
    }

    try {
        $check = $conn->prepare(
            "SELECT donations.donor_id, requests.ngo_id
             FROM requests
             JOIN donations ON requests.donation_id = donations.id
             WHERE requests.id = ?"
        );

        $check->execute([$requestId]);
        $request = $check->fetch();

        if (!$request || !in_array($userId, [
            $request["donor_id"],
            $request["ngo_id"]
        ])) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "You cannot access these messages."
            ]);
            exit;
        }

        $stmt = $conn->prepare(
            "SELECT *
             FROM messages
             WHERE request_id = ?
             ORDER BY sent_at ASC"
        );

        $stmt->execute([$requestId]);

        echo json_encode([
            "success" => true,
            "messages" => $stmt->fetchAll()
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Could not load messages."
        ]);
    }

    exit;
}

if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);

    $requestId = $data["request_id"] ?? "";
    $senderId = $data["sender_id"] ?? "";
    $receiverId = $data["receiver_id"] ?? "";
    $message = trim($data["message"] ?? "");

    if (!$requestId || !$senderId || !$receiverId || !$message) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "All message fields are required."
        ]);
        exit;
    }

    try {
        $check = $conn->prepare(
            "SELECT donations.donor_id, requests.ngo_id
             FROM requests
             JOIN donations ON requests.donation_id = donations.id
             WHERE requests.id = ?"
        );

        $check->execute([$requestId]);
        $request = $check->fetch();

        if (!$request) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "Request not found."
            ]);
            exit;
        }

        $donorId = $request["donor_id"];
        $ngoId = $request["ngo_id"];

        $validParticipants =
            ($senderId == $donorId && $receiverId == $ngoId) ||
            ($senderId == $ngoId && $receiverId == $donorId);

        if (!$validParticipants) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Invalid message participants."
            ]);
            exit;
        }

        $stmt = $conn->prepare(
            "INSERT INTO messages
             (request_id, sender_id, receiver_id, message)
             VALUES (?, ?, ?, ?)"
        );

        $stmt->execute([
            $requestId,
            $senderId,
            $receiverId,
            $message
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Message saved successfully."
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Could not save message."
        ]);
    }

    exit;
}

http_response_code(405);
echo json_encode([
    "success" => false,
    "message" => "Method not allowed."
]);
?>