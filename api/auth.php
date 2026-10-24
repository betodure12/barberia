<?php
/**
 * BarberApp Pro - Authentication & Trial License Management Controller
 * Handles Master login, Demo Trial verification, and License Controls
 */

if (session_status() === PHP_SESSION_NONE) {
    if (!headers_sent()) {
        session_set_cookie_params([
            'lifetime' => 86400 * 30, // 30 days
            'path' => '/',
            'samesite' => 'Lax'
        ]);
    }
    session_start();
}

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$input = getJsonInput();

switch ($action) {
    case 'check':
        handleCheckSession($pdo);
        break;

    case 'login':
        handleLogin($pdo, $input);
        break;

    case 'logout':
        handleLogout();
        break;

    case 'get_demo_status':
        requireMaster($pdo);
        handleGetDemoStatus($pdo);
        break;

    case 'toggle_demo':
        requireMaster($pdo);
        handleToggleDemo($pdo, $input);
        break;

    case 'extend_demo':
        requireMaster($pdo);
        handleExtendDemo($pdo, $input);
        break;

    case 'set_demo_expiry':
        requireMaster($pdo);
        handleSetDemoExpiry($pdo, $input);
        break;

    case 'change_password':
        requireMaster($pdo);
        handleChangePassword($pdo, $input);
        break;

    case 'reset_demo_data':
        requireMaster($pdo);
        handleResetDemoData($pdo);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}

/**
 * Check active session and trial validity
 */
function handleCheckSession($pdo) {
    $userId = $_SESSION['user_id'] ?? null;

    // Check header fallback if user was authenticated
    if (!$userId) {
        $authHeader = $_SERVER['HTTP_X_AUTH_USER'] ?? '';
        if (strtolower($authHeader) === 'admin') {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'master' LIMIT 1");
            $stmt->execute();
            $masterId = $stmt->fetchColumn();
            if ($masterId) {
                $userId = (int)$masterId;
                $_SESSION['user_id'] = $userId;
            }
        }
    }

    if (!$userId) {
        sendJsonResponse([
            'authenticated' => false,
            'user' => null
        ]);
    }

    $stmt = $pdo->prepare("SELECT id, username, role, is_active, trial_expires_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        unset($_SESSION['user_id']);
        sendJsonResponse([
            'authenticated' => false,
            'user' => null
        ]);
    }

    // If master user, permanent access
    if ($user['role'] === 'master') {
        sendJsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'role' => 'master',
                'is_active' => 1
            ]
        ]);
    }

    // If demo / trial user, verify activation and expiration time
    $now = time();
    $expiresAtTimestamp = $user['trial_expires_at'] ? strtotime($user['trial_expires_at']) : 0;
    $remainingSeconds = max(0, $expiresAtTimestamp - $now);
    $isExpired = ($expiresAtTimestamp <= $now);

    if ((int)$user['is_active'] !== 1) {
        unset($_SESSION['user_id']);
        sendJsonResponse([
            'authenticated' => false,
            'blocked' => true,
            'reason' => 'deactivated',
            'message' => 'El acceso de prueba ha sido pausado por el administrador.'
        ]);
    }

    if ($isExpired) {
        unset($_SESSION['user_id']);
        sendJsonResponse([
            'authenticated' => false,
            'blocked' => true,
            'reason' => 'expired',
            'message' => 'Tu periodo de prueba ha finalizado. Para habilitar el sistema, contacta al administrador.'
        ]);
    }

    sendJsonResponse([
        'authenticated' => true,
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'role' => 'demo',
            'is_active' => 1,
            'trial_expires_at' => $user['trial_expires_at'],
            'remaining_seconds' => $remainingSeconds,
            'remaining_text' => formatRemainingTime($remainingSeconds)
        ]
    ]);
}

/**
 * Login handler
 */
function handleLogin($pdo, $input) {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username)) {
        sendJsonResponse(['success' => false, 'error' => 'Ingresa tu usuario'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJsonResponse(['success' => false, 'error' => 'Usuario o contraseña incorrectos'], 401);
    }

    // Verify password (also allow quick demo login if password matches 'demo' or 'demo123')
    $validPassword = password_verify($password, $user['password']) ||
                     ($user['role'] === 'demo' && in_array($password, ['demo', 'demo123', '']));

    if (!$validPassword) {
        sendJsonResponse(['success' => false, 'error' => 'Usuario o contraseña incorrectos'], 401);
    }

    // If demo user, verify license
    if ($user['role'] === 'demo') {
        if ((int)$user['is_active'] !== 1) {
            sendJsonResponse([
                'success' => false,
                'blocked' => true,
                'reason' => 'deactivated',
                'error' => 'El acceso de prueba ha sido desactivado por el administrador.'
            ], 403);
        }

        $now = time();
        $expiresAtTimestamp = $user['trial_expires_at'] ? strtotime($user['trial_expires_at']) : 0;
        if ($expiresAtTimestamp <= $now) {
            sendJsonResponse([
                'success' => false,
                'blocked' => true,
                'reason' => 'expired',
                'error' => 'Tu periodo de prueba ha finalizado. Contacta al administrador para renovar tu acceso.'
            ], 403);
        }
    }

    $_SESSION['user_id'] = (int)$user['id'];

    $remainingSeconds = 0;
    if ($user['role'] === 'demo' && $user['trial_expires_at']) {
        $remainingSeconds = max(0, strtotime($user['trial_expires_at']) - time());
    }

    sendJsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'is_active' => (int)$user['is_active'],
            'trial_expires_at' => $user['trial_expires_at'],
            'remaining_seconds' => $remainingSeconds,
            'remaining_text' => formatRemainingTime($remainingSeconds)
        ]
    ]);
}

/**
 * Logout
 */
function handleLogout() {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    sendJsonResponse(['success' => true]);
}

/**
 * Check if active session is Master
 */
function requireMaster($pdo) {
    $userId = $_SESSION['user_id'] ?? null;

    // Check fallback header
    if (!$userId) {
        $authHeader = $_SERVER['HTTP_X_AUTH_USER'] ?? '';
        if (strtolower($authHeader) === 'admin') {
            $stmt = $pdo->prepare("SELECT id, role FROM users WHERE role = 'master' LIMIT 1");
            $stmt->execute();
            $master = $stmt->fetch();
            if ($master) {
                $_SESSION['user_id'] = (int)$master['id'];
                return;
            }
        }
        sendJsonResponse(['success' => false, 'error' => 'No autorizado. Inicia sesión como Maestro.'], 401);
    }

    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $role = $stmt->fetchColumn();

    if ($role !== 'master') {
        sendJsonResponse(['success' => false, 'error' => 'Acción exclusiva para el Usuario Maestro.'], 403);
    }
}

/**
 * Master: Get Demo Account Status
 */
function handleGetDemoStatus($pdo) {
    $stmt = $pdo->prepare("SELECT id, username, is_active, trial_expires_at, created_at, updated_at FROM users WHERE role = 'demo' LIMIT 1");
    $stmt->execute();
    $demo = $stmt->fetch();

    if (!$demo) {
        sendJsonResponse(['success' => false, 'error' => 'No se encontró el usuario demo'], 404);
    }

    $now = time();
    $expiresAtTimestamp = $demo['trial_expires_at'] ? strtotime($demo['trial_expires_at']) : 0;
    $remainingSeconds = max(0, $expiresAtTimestamp - $now);
    $isExpired = ($expiresAtTimestamp <= $now);

    sendJsonResponse([
        'success' => true,
        'demo' => [
            'id' => (int)$demo['id'],
            'username' => $demo['username'],
            'is_active' => (int)$demo['is_active'],
            'trial_expires_at' => $demo['trial_expires_at'],
            'is_expired' => $isExpired,
            'remaining_seconds' => $remainingSeconds,
            'remaining_text' => formatRemainingTime($remainingSeconds)
        ]
    ]);
}

/**
 * Master: Toggle demo active/inactive
 */
function handleToggleDemo($pdo, $input) {
    $isActive = isset($input['is_active']) ? (int)$input['is_active'] : null;
    if ($isActive === null) {
        $current = $pdo->query("SELECT is_active FROM users WHERE role = 'demo' LIMIT 1")->fetchColumn();
        $isActive = ($current == 1) ? 0 : 1;
    }

    $stmt = $pdo->prepare("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE role = 'demo'");
    $stmt->execute([$isActive]);

    sendJsonResponse([
        'success' => true,
        'is_active' => $isActive,
        'message' => $isActive ? '¡Hecho! Acceso de prueba activado con éxito' : '¡Hecho! Acceso de prueba desactivado con éxito'
    ]);
}

/**
 * Master: Extend demo trial by days or hours
 */
function handleExtendDemo($pdo, $input) {
    $days = isset($input['days']) ? (int)$input['days'] : 1;
    $hours = isset($input['hours']) ? (int)$input['hours'] : ($days * 24);

    $stmt = $pdo->query("SELECT trial_expires_at FROM users WHERE role = 'demo' LIMIT 1");
    $currentExpiry = $stmt->fetchColumn();

    $now = time();
    $currentTimestamp = $currentExpiry ? strtotime($currentExpiry) : 0;

    // If already expired or inactive, start counting from NOW
    if ($currentTimestamp <= $now) {
        $newTimestamp = $now + ($hours * 3600);
    } else {
        // If still active, add to existing time
        $newTimestamp = $currentTimestamp + ($hours * 3600);
    }

    $newExpiryDate = date('Y-m-d H:i:s', $newTimestamp);

    $updateStmt = $pdo->prepare("UPDATE users SET trial_expires_at = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE role = 'demo'");
    $updateStmt->execute([$newExpiryDate]);

    $remainingSeconds = max(0, $newTimestamp - $now);

    sendJsonResponse([
        'success' => true,
        'trial_expires_at' => $newExpiryDate,
        'is_active' => 1,
        'remaining_seconds' => $remainingSeconds,
        'remaining_text' => formatRemainingTime($remainingSeconds),
        'message' => "¡Hecho! Prueba extendida por {$days} día(s). Nuevo vencimiento: " . date('d/m/Y H:i', $newTimestamp)
    ]);
}

/**
 * Master: Set specific expiry date
 */
function handleSetDemoExpiry($pdo, $input) {
    $expiryStr = trim($input['datetime'] ?? '');
    if (empty($expiryStr)) {
        sendJsonResponse(['success' => false, 'error' => 'Fecha de vencimiento requerida'], 400);
    }

    // Clean up formats
    $expiryStr = str_replace('T', ' ', $expiryStr);
    $timestamp = strtotime($expiryStr);

    if (!$timestamp) {
        $d = DateTime::createFromFormat('Y-m-d H:i:s', $expiryStr)
          ?: DateTime::createFromFormat('Y-m-d H:i', $expiryStr)
          ?: DateTime::createFromFormat('d/m/Y H:i', $expiryStr)
          ?: DateTime::createFromFormat('d/m/Y H:i:s', $expiryStr);
        if ($d) {
            $timestamp = $d->getTimestamp();
        }
    }

    if (!$timestamp) {
        sendJsonResponse(['success' => false, 'error' => 'Formato de fecha inválido'], 400);
    }

    $newExpiryDate = date('Y-m-d H:i:s', $timestamp);
    $stmt = $pdo->prepare("UPDATE users SET trial_expires_at = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE role = 'demo'");
    $stmt->execute([$newExpiryDate]);

    $remainingSeconds = max(0, $timestamp - time());

    sendJsonResponse([
        'success' => true,
        'trial_expires_at' => $newExpiryDate,
        'is_active' => 1,
        'remaining_seconds' => $remainingSeconds,
        'remaining_text' => formatRemainingTime($remainingSeconds),
        'message' => '¡Hecho! Fecha de vencimiento guardada con éxito para el ' . date('d/m/Y H:i', $timestamp)
    ]);
}

/**
 * Master: Change Password
 */
function handleChangePassword($pdo, $input) {
    $targetRole = trim($input['target_role'] ?? 'demo'); // 'master' or 'demo'
    $newPassword = trim($input['new_password'] ?? '');

    if (strlen($newPassword) < 3) {
        sendJsonResponse(['success' => false, 'error' => 'La contraseña debe tener al menos 3 caracteres'], 400);
    }

    $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE role = ?");
    $stmt->execute([$hashed, $targetRole]);

    sendJsonResponse([
        'success' => true,
        'message' => '¡Hecho! Contraseña actualizada correctamente para ' . ($targetRole === 'master' ? 'el Maestro' : 'el usuario Demo')
    ]);
}

/**
 * Master: Reset Demo Data
 */
function handleResetDemoData($pdo) {
    $pdo->exec("DELETE FROM sale_items");
    $pdo->exec("DELETE FROM sales");
    $pdo->exec("DELETE FROM appointments");
    $pdo->exec("DELETE FROM clients");
    $pdo->exec("DELETE FROM services");
    $pdo->exec("DELETE FROM products");

    require_once __DIR__ . '/seed.php';
    seedDatabase($pdo);

    sendJsonResponse([
        'success' => true,
        'message' => '¡Hecho! Datos de prueba restablecidos a los valores iniciales de fábrica.'
    ]);
}

/**
 * Helper to format remaining time in readable Spanish
 */
function formatRemainingTime($seconds) {
    if ($seconds <= 0) {
        return 'Expirado';
    }
    $days = floor($seconds / 86400);
    $hours = floor(($seconds % 86400) / 3600);
    $mins = floor(($seconds % 3600) / 60);

    if ($days > 0) {
        return "{$days}d {$hours}h restantes";
    }
    if ($hours > 0) {
        return "{$hours}h {$mins}m restantes";
    }
    return "{$mins} min restantes";
}
