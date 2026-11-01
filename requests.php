<?php
header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    try {
        $stmt = $conn->query(
            "SELECT
                requests.*,
                donations.title AS donation_title,
                donations.donor_id,
                ngo_users.name AS ngo_name,
                donor_users.name AS donor_name
             FROM requests
             JOIN donations ON requests.donation_id = donations.id
             JOIN users AS ngo_users ON requests.ngo_id = ngo_users.id
             JOIN users AS donor_users ON donations.donor_id = donor_users.id
             ORDER BY requests.created_at DESC"
        );

        echo json_encode([
            "success" => true,
            "requests" => $stmt->fetchAll()
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Could not load requests."
        ]);
    }

    exit;
}

if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);

    $donationId = $data["donation_id"] ?? "";
    $ngoId = $data["ngo_id"] ?? "";
    $message = trim($data["message"] ?? "");

    if (!$donationId || !$ngoId || !$message) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Please provide all required information."
        ]);
        exit;
    }

    try {
        $conn->beginTransaction();

        $ngoCheck = $conn->prepare(
            "SELECT id FROM users WHERE id = ? AND role = 'ngo'"
        );
        $ngoCheck->execute([$ngoId]);

        if (!$ngoCheck->fetch()) {
            $conn->rollBack();
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Only registered NGOs can request donations."
            ]);
            exit;
        }

        $donationCheck = $conn->prepare(
            "SELECT id, donor_id, status
             FROM donations
             WHERE id = ?
             FOR UPDATE"
        );
        $donationCheck->execute([$donationId]);
        $donation = $donationCheck->fetch();

        if (!$donation || $donation["status"] !== "available") {
            $conn->rollBack();
            http_response_code(409);
            echo json_encode([
                "success" => false,
                "message" => "This donation is no longer available."
            ]);
            exit;
        }

        if ($donation["donor_id"] == $ngoId) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "You cannot request your own donation."
            ]);
            exit;
        }

        $stmt = $conn->prepare(
            "INSERT INTO requests (donation_id, ngo_id, message)
             VALUES (?, ?, ?)"
        );
        $stmt->execute([$donationId, $ngoId, $message]);

        $update = $conn->prepare(
            "UPDATE donations SET status = 'requested' WHERE id = ?"
        );
        $update->execute([$donationId]);

        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "Donation request submitted successfully."
        ]);

    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Could not submit the request."
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