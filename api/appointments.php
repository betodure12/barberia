<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $date = $_GET['date'] ?? '';
        $startDate = $_GET['start_date'] ?? '';
        $endDate = $_GET['end_date'] ?? '';
        $status = $_GET['status'] ?? '';
        $clientId = (int)($_GET['client_id'] ?? 0);

        $query = "
            SELECT a.*, 
                   c.name as client_name, c.phone as client_phone, c.email as client_email,
                   s.name as service_name, s.price as service_price, s.duration as service_duration, s.category as service_category
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($date)) {
            $query .= " AND a.appointment_date = :date";
            $params[':date'] = $date;
        } elseif (!empty($startDate) && !empty($endDate)) {
            $query .= " AND a.appointment_date BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $startDate;
            $params[':end_date'] = $endDate;
        }

        if (!empty($status) && $status !== 'all') {
            $query .= " AND a.status = :status";
            $params[':status'] = $status;
        }

        if ($clientId > 0) {
            $query .= " AND a.client_id = :client_id";
            $params[':client_id'] = $clientId;
        }

        $query .= " ORDER BY a.appointment_date ASC, a.appointment_time ASC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll();

        sendJsonResponse(['success' => true, 'data' => $appointments]);
        break;

    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("
            SELECT a.*, 
                   c.name as client_name, c.phone as client_phone, c.email as client_email,
                   s.name as service_name, s.price as service_price, s.duration as service_duration
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            sendJsonResponse(['success' => false, 'error' => 'Reserva no encontrada'], 404);
        }

        sendJsonResponse(['success' => true, 'data' => $appointment]);
        break;

    case 'create':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $clientId = (int)($data['client_id'] ?? 0);
        $serviceId = (int)($data['service_id'] ?? 0);
        if ($serviceId <= 0) {
            $stmtFirst = $pdo->query("SELECT id FROM services WHERE active = 1 ORDER BY id ASC LIMIT 1");
            $firstServ = $stmtFirst->fetch();
            $serviceId = $firstServ ? (int)$firstServ['id'] : 1;
        }
        $barberName = trim($data['barber_name'] ?? 'Principal');
        $date = trim($data['appointment_date'] ?? date('Y-m-d'));
        $time = trim($data['appointment_time'] ?? '12:00');
        $status = trim($data['status'] ?? 'Confirmada');
        $notes = trim($data['notes'] ?? '');

        if (!$clientId || empty($date) || empty($time)) {
            sendJsonResponse(['success' => false, 'error' => 'Cliente, fecha y hora son obligatorios'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO appointments (client_id, service_id, barber_name, appointment_date, appointment_time, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$clientId, $serviceId, $barberName, $date, $time, $status, $notes]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Turno agendado con éxito',
            'id' => $pdo->lastInsertId()
        ]);
        break;

    case 'update_status':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);
        $status = trim($data['status'] ?? '');

        $validStatuses = ['Pendiente', 'Confirmada', 'En Proceso', 'Completada', 'Cancelada'];
        if (!$id || !in_array($status, $validStatuses)) {
            sendJsonResponse(['success' => false, 'error' => 'Estado inválido'], 400);
        }

        $stmt = $pdo->prepare("UPDATE appointments SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);

        sendJsonResponse(['success' => true, 'message' => 'Estado de turno actualizado']);
        break;

    case 'update':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);
        $clientId = (int)($data['client_id'] ?? 0);
        $serviceId = (int)($data['service_id'] ?? 0);
        $barberName = trim($data['barber_name'] ?? 'Principal');
        $date = trim($data['appointment_date'] ?? '');
        $time = trim($data['appointment_time'] ?? '');
        $status = trim($data['status'] ?? 'Pendiente');
        $notes = trim($data['notes'] ?? '');

        if (!$id || !$clientId || !$serviceId || empty($date) || empty($time)) {
            sendJsonResponse(['success' => false, 'error' => 'Datos incompletos'], 400);
        }

        $stmt = $pdo->prepare("
            UPDATE appointments 
            SET client_id = ?, service_id = ?, barber_name = ?, appointment_date = ?, appointment_time = ?, status = ?, notes = ?
            WHERE id = ?
        ");
        $stmt->execute([$clientId, $serviceId, $barberName, $date, $time, $status, $notes, $id]);

        sendJsonResponse(['success' => true, 'message' => 'Turno modificado correctamente']);
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

        $stmt = $pdo->prepare("DELETE FROM appointments WHERE id = ?");
        $stmt->execute([$id]);

        sendJsonResponse(['success' => true, 'message' => 'Turno eliminado']);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
