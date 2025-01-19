<?php
header('Content-Type: application/json');

// Replace these with your actual database credentials
$servername = "localhost";
$username = "u807574647_avawaters"; // Your DB username
$password = "Avawaters123"; // Your DB password
$dbname = "u807574647_avawaters"; // Your DB name

try {
    // Create a PDO instance for MySQL database connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get the POST data
    $input = json_decode(file_get_contents('php://input'), true);
    $usernameInput = $input['username'];
    $passwordInput = $input['password'];

    // Query the database for the user by username
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
    $stmt->execute(['username' => $usernameInput]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Check if user exists and password is correct
    if ($user && password_verify($passwordInput, $user['password'])) {
        if ($user['type'] == 2) {
            // Return the user data for valid staff login
            echo json_encode($user);
        } else {
            // Only staff can log in
            echo json_encode(['error' => 'Only staff can log in.']);
        }
    } else {
        // Invalid credentials
        echo json_encode(['error' => 'Invalid username or password.']);
    }
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
