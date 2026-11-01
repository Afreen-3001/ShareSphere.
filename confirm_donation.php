<?php
header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "POST method required."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$requestId = $data["request_id"] ?? "";
$userId = $data["user_id"] ?? "";

if (!$requestId || !$userId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Request ID and user ID are required."
    ]);
    exit;
}

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare(
        "SELECT
            requests.id,
            requests.status,
            requests.donor_confirmed,
            requests.ngo_confirmed,
            requests.ngo_id,
            donations.donor_id,
            donations.id AS donation_id
         FROM requests
         JOIN donations
            ON requests.donation_id = donations.id
         WHERE requests.id = ?
         FOR UPDATE"
    );

    $stmt->execute([$requestId]);
    $request = $stmt->fetch();

    if (!$request || $request["status"] === "rejected") {
        $conn->rollBack();
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Valid request not found."
        ]);
        exit;
    }

    $isDonor = ($userId == $request["donor_id"]);
    $isNGO = ($userId == $request["ngo_id"]);

    if (!$isDonor && !$isNGO) {
        $conn->rollBack();
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "You are not part of this request."
        ]);
        exit;
    }

    if ($request["status"] === "completed") {
        $conn->rollBack();
        echo json_encode([
            "success" => true,
            "message" => "This donation is already completed."
        ]);
        exit;
    }

    if ($isDonor) {
        $update = $conn->prepare(
            "UPDATE requests
             SET donor_confirmed = 1
             WHERE id = ?"
        );
        $update->execute([$requestId]);
    }

    if ($isNGO) {
        $update = $conn->prepare(
            "UPDATE requests
             SET ngo_confirmed = 1
             WHERE id = ?"
        );
        $update->execute([$requestId]);
    }

    $check = $conn->prepare(
        "SELECT donor_confirmed, ngo_confirmed
         FROM requests
         WHERE id = ?"
    );

    $check->execute([$requestId]);
    $confirmations = $check->fetch();

    $bothConfirmed =
        $confirmations["donor_confirmed"] == 1 &&
        $confirmations["ngo_confirmed"] == 1;

    if ($bothConfirmed) {
        $finish = $conn->prepare(
            "UPDATE donations
             SET status = 'donated'
             WHERE id = ?"
        );
        $finish->execute([$request["donation_id"]]);

        $complete = $conn->prepare(
            "UPDATE requests
             SET status = 'completed'
             WHERE id = ?"
        );
        $complete->execute([$requestId]);
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "completed" => $bothConfirmed,
        "donor_confirmed" => (bool)$confirmations["donor_confirmed"],
        "ngo_confirmed" => (bool)$confirmations["ngo_confirmed"],
        "message" => $bothConfirmed
            ? "Both confirmations received. Donation completed!"
            : "Your confirmation has been saved. Waiting for the other confirmation."
    ]);

} catch (PDOException $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Could not update donation confirmation."
    ]);
}
?>