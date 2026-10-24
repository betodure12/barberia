<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $onlyActive = isset($_GET['active']) && $_GET['active'] === '1';
        $query = "SELECT * FROM services";
        if ($onlyActive) {
            $query .= " WHERE active = 1";
        }
        $query .= " ORDER BY price ASC, name ASC";

        $stmt = $pdo->query($query);
        $services = $stmt->fetchAll();

        sendJsonResponse(['success' => true, 'data' => $services]);
        break;

    case 'create':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $name = trim($data['name'] ?? '');
        $category = trim($data['category'] ?? 'Corte');
        $price = (float)($data['price'] ?? 0);
        $duration = (int)($data['duration'] ?? 30);
        $description = trim($data['description'] ?? '');

        if (empty($name) || $price <= 0) {
            sendJsonResponse(['success' => false, 'error' => 'Nombre y precio válido son requeridos'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO services (name, category, price, duration, description, active) VALUES (?, ?, ?, ?, ?, 1)");
        $stmt->execute([$name, $category, $price, $duration, $description]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Servicio creado exitosamente',
            'id' => $pdo->lastInsertId()
        ]);
        break;

    case 'update':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $category = trim($data['category'] ?? 'Corte');
        $price = (float)($data['price'] ?? 0);
        $duration = (int)($data['duration'] ?? 30);
        $description = trim($data['description'] ?? '');
        $active = isset($data['active']) ? (int)$data['active'] : 1;

        if (!$id || empty($name) || $price <= 0) {
            sendJsonResponse(['success' => false, 'error' => 'Datos incompletos o inválidos'], 400);
        }

        $stmt = $pdo->prepare("UPDATE services SET name = ?, category = ?, price = ?, duration = ?, description = ?, active = ? WHERE id = ?");
        $stmt->execute([$name, $category, $price, $duration, $description, $active, $id]);

        sendJsonResponse(['success' => true, 'message' => 'Servicio actualizado']);
        break;

    case 'delete':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);

        if (!$id) {
            sendJsonResponse(['success' => false, 'error' => 'ID inválido'], 400);
        }

        // Check if service is referenced in appointments
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) as count FROM appointments WHERE service_id = ?");
        $stmtCheck->execute([$id]);
        $res = $stmtCheck->fetch();

        if ($res && $res['count'] > 0) {
            // Soft delete
            $stmt = $pdo->prepare("UPDATE services SET active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            sendJsonResponse(['success' => true, 'message' => 'El servicio fue desactivado porque tiene citas asociadas']);
        } else {
            $stmt = $pdo->prepare("DELETE FROM services WHERE id = ?");
            $stmt->execute([$id]);
            sendJsonResponse(['success' => true, 'message' => 'Servicio eliminado']);
        }
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
