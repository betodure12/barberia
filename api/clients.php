<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $search = $_GET['search'] ?? '';
        $query = "
            SELECT c.*, 
                   COUNT(DISTINCT a.id) as total_appointments,
                   COALESCE(SUM(s.total), 0) as total_spent,
                   MAX(a.appointment_date) as last_visit
            FROM clients c
            LEFT JOIN appointments a ON c.id = a.client_id
            LEFT JOIN sales s ON c.id = s.client_id
        ";

        $params = [];
        if (!empty($search)) {
            $query .= " WHERE c.name LIKE :search OR c.phone LIKE :search OR c.email LIKE :search";
            $params[':search'] = "%$search%";
        }

        $query .= " GROUP BY c.id ORDER BY c.name ASC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $clients = $stmt->fetchAll();

        sendJsonResponse(['success' => true, 'data' => $clients]);
        break;

    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM clients WHERE id = ?");
        $stmt->execute([$id]);
        $client = $stmt->fetch();

        if (!$client) {
            sendJsonResponse(['success' => false, 'error' => 'Cliente no encontrado'], 404);
        }

        // Get client's appointments
        $stmtApp = $pdo->prepare("
            SELECT a.*, s.name as service_name, s.price as service_price
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.client_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT 10
        ");
        $stmtApp->execute([$id]);
        $client['appointments'] = $stmtApp->fetchAll();

        // Get client's purchases
        $stmtSales = $pdo->prepare("
            SELECT s.*
            FROM sales s
            WHERE s.client_id = ?
            ORDER BY s.created_at DESC
            LIMIT 10
        ");
        $stmtSales->execute([$id]);
        $client['sales'] = $stmtSales->fetchAll();

        sendJsonResponse(['success' => true, 'data' => $client]);
        break;

    case 'create':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '');
        $notes = trim($data['notes'] ?? '');

        if (empty($name) || empty($phone)) {
            sendJsonResponse(['success' => false, 'error' => 'El nombre y teléfono son obligatorios'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO clients (name, phone, email, notes) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $phone, $email, $notes]);
        $newId = $pdo->lastInsertId();

        sendJsonResponse([
            'success' => true,
            'message' => 'Cliente registrado con éxito',
            'id' => $newId
        ]);
        break;

    case 'update':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '');
        $notes = trim($data['notes'] ?? '');

        if (!$id || empty($name) || empty($phone)) {
            sendJsonResponse(['success' => false, 'error' => 'Datos incompletos'], 400);
        }

        $stmt = $pdo->prepare("UPDATE clients SET name = ?, phone = ?, email = ?, notes = ? WHERE id = ?");
        $stmt->execute([$name, $phone, $email, $notes, $id]);

        sendJsonResponse(['success' => true, 'message' => 'Cliente actualizado correctamente']);
        break;

    case 'delete':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);

        if (!$id) {
            sendJsonResponse(['success' => false, 'error' => 'ID de cliente inválido'], 400);
        }

        $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ?");
        $stmt->execute([$id]);

        sendJsonResponse(['success' => true, 'message' => 'Cliente eliminado']);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
