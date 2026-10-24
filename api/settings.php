<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'get';

switch ($action) {
    case 'get':
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $rows = $stmt->fetchAll();
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        // Default fallbacks if empty
        $defaults = [
            'business_name' => 'MF Barber & Lounge',
            'business_phone' => '+595 993 554920',
            'business_address' => 'Local Central',
            'ticket_footer' => '¡Muchas gracias por su preferencia y compra! 💈✂️',
            'currency_code' => 'PYG',
            'currency_symbol' => '₲',
            'exchange_rate' => '7500'
        ];

        foreach ($defaults as $k => $v) {
            if (!isset($settings[$k]) || $settings[$k] === '') {
                $settings[$k] = $v;
            }
        }

        sendJsonResponse(['success' => true, 'data' => $settings]);
        break;

    case 'update':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        if (empty($data) || !is_array($data)) {
            sendJsonResponse(['success' => false, 'error' => 'Datos inválidos'], 400);
        }

        $stmt = $pdo->prepare("INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)");

        $allowedKeys = [
            'business_name',
            'business_phone',
            'business_address',
            'ticket_footer',
            'currency_code',
            'currency_symbol',
            'exchange_rate'
        ];

        foreach ($data as $key => $value) {
            if (in_array($key, $allowedKeys)) {
                $stmt->execute([$key, trim((string)$value)]);
            }
        }

        sendJsonResponse(['success' => true, 'message' => 'Configuración actualizada exitosamente']);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
