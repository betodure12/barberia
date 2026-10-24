<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $startDate = $_GET['start_date'] ?? '';
        $endDate = $_GET['end_date'] ?? '';
        $paymentMethod = $_GET['payment_method'] ?? '';
        $search = $_GET['search'] ?? '';

        $query = "
            SELECT s.*, 
                   COALESCE(c.name, 'Cliente Ocasional') as client_name,
                   c.phone as client_phone,
                   COUNT(si.id) as total_items
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($startDate) && !empty($endDate)) {
            $query .= " AND DATE(s.created_at) BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $startDate;
            $params[':end_date'] = $endDate;
        }

        if (!empty($paymentMethod) && $paymentMethod !== 'all') {
            if ($paymentMethod === 'Tarjeta' || $paymentMethod === 'POS') {
                $query .= " AND (s.payment_method = 'Tarjeta' OR s.payment_method = 'POS' OR s.payment_method LIKE '%POS%' OR s.payment_method LIKE '%Tarjeta%')";
            } else {
                $query .= " AND s.payment_method = :payment_method";
                $params[':payment_method'] = $paymentMethod;
            }
        }

        if (!empty($search)) {
            $query .= " AND (c.name LIKE :search OR s.notes LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $query .= " GROUP BY s.id ORDER BY s.created_at DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $sales = $stmt->fetchAll();

        // Breakdown by payment method for the current date and search scope
        $summaryQuery = "
            SELECT 
                s.payment_method,
                COUNT(DISTINCT s.id) as count,
                COALESCE(SUM(s.total), 0) as total
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE 1=1
        ";
        $summaryParams = [];
        if (!empty($startDate) && !empty($endDate)) {
            $summaryQuery .= " AND DATE(s.created_at) BETWEEN :sum_start AND :sum_end";
            $summaryParams[':sum_start'] = $startDate;
            $summaryParams[':sum_end'] = $endDate;
        }
        if (!empty($search)) {
            $summaryQuery .= " AND (c.name LIKE :sum_search OR s.notes LIKE :sum_search)";
            $summaryParams[':sum_search'] = "%$search%";
        }
        $summaryQuery .= " GROUP BY s.payment_method";

        $stmtSum = $pdo->prepare($summaryQuery);
        $stmtSum->execute($summaryParams);
        $summaryRows = $stmtSum->fetchAll();

        $breakdown = [
            'Efectivo' => ['total' => 0, 'count' => 0],
            'Tarjeta' => ['total' => 0, 'count' => 0], // Cobro en POS
            'Transferencia' => ['total' => 0, 'count' => 0],
            'total_all' => 0,
            'count_all' => 0
        ];

        foreach ($summaryRows as $row) {
            $m = $row['payment_method'];
            $tot = (float)$row['total'];
            $cnt = (int)$row['count'];
            if (stripos($m, 'Tarjeta') !== false || stripos($m, 'POS') !== false) {
                $breakdown['Tarjeta']['total'] += $tot;
                $breakdown['Tarjeta']['count'] += $cnt;
            } elseif (stripos($m, 'Transferencia') !== false) {
                $breakdown['Transferencia']['total'] += $tot;
                $breakdown['Transferencia']['count'] += $cnt;
            } else {
                $breakdown['Efectivo']['total'] += $tot;
                $breakdown['Efectivo']['count'] += $cnt;
            }
            $breakdown['total_all'] += $tot;
            $breakdown['count_all'] += $cnt;
        }

        sendJsonResponse([
            'success' => true, 
            'data' => $sales,
            'breakdown' => $breakdown
        ]);
        break;

    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("
            SELECT s.*, 
                   COALESCE(c.name, 'Cliente Ocasional') as client_name,
                   c.phone as client_phone,
                   c.email as client_email
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        $sale = $stmt->fetch();

        if (!$sale) {
            sendJsonResponse(['success' => false, 'error' => 'Venta no encontrada'], 404);
        }

        // Get items
        $stmtItems = $pdo->prepare("SELECT * FROM sale_items WHERE sale_id = ?");
        $stmtItems->execute([$id]);
        $sale['items'] = $stmtItems->fetchAll();

        // Get business settings
        $stmtSettings = $pdo->query("SELECT * FROM settings");
        $settingsRaw = $stmtSettings->fetchAll();
        $settings = [];
        foreach ($settingsRaw as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        $sale['settings'] = $settings;

        sendJsonResponse(['success' => true, 'data' => $sale]);
        break;

    case 'create':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $clientId = !empty($data['client_id']) ? (int)$data['client_id'] : null;
        $appointmentId = !empty($data['appointment_id']) ? (int)$data['appointment_id'] : null;
        $items = $data['items'] ?? [];
        $subtotal = (float)($data['subtotal'] ?? 0);
        $discount = (float)($data['discount'] ?? 0);
        $total = (float)($data['total'] ?? 0);
        $paymentMethod = trim($data['payment_method'] ?? 'Efectivo');
        $amountPaid = (float)($data['amount_paid'] ?? $total);
        $changeAmount = (float)($data['change_amount'] ?? 0);
        $notes = trim($data['notes'] ?? '');

        if (empty($items) || $total < 0) {
            sendJsonResponse(['success' => false, 'error' => 'El carrito no puede estar vacío y el total debe ser válido'], 400);
        }

        try {
            $pdo->beginTransaction();

            // 1. Insert sale
            $stmtSale = $pdo->prepare("
                INSERT INTO sales (client_id, appointment_id, subtotal, discount, total, payment_method, amount_paid, change_amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtSale->execute([$clientId, $appointmentId, $subtotal, $discount, $total, $paymentMethod, $amountPaid, $changeAmount, $notes]);
            $saleId = $pdo->lastInsertId();

            // 2. Insert items and decrement product stock
            $stmtItem = $pdo->prepare("
                INSERT INTO sale_items (sale_id, item_type, item_id, item_name, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            $stmtStockDec = $pdo->prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?");

            foreach ($items as $item) {
                $type = $item['item_type'] ?? ($item['type'] ?? 'product');
                $itemId = !empty($item['item_id']) ? (int)$item['item_id'] : (!empty($item['id']) ? (int)$item['id'] : null);
                $itemName = trim($item['item_name'] ?? ($item['name'] ?? 'Producto'));
                $qty = (int)($item['quantity'] ?? 1);
                $unitPrice = (float)($item['unit_price'] ?? ($item['price'] ?? 0));
                $itemSubtotal = (float)($item['subtotal'] ?? ($qty * $unitPrice));

                $stmtItem->execute([$saleId, $type, $itemId, $itemName, $qty, $unitPrice, $itemSubtotal]);

                if ($type === 'product' && $itemId) {
                    $stmtStockDec->execute([$qty, $itemId]);
                }
            }

            // 3. If linked to an appointment, update appointment status to 'Completada'
            if ($appointmentId) {
                $stmtApp = $pdo->prepare("UPDATE appointments SET status = 'Completada' WHERE id = ?");
                $stmtApp->execute([$appointmentId]);
            }

            $pdo->commit();

            sendJsonResponse([
                'success' => true,
                'message' => 'Cobro registrado con éxito',
                'sale_id' => $saleId
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'error' => 'Error al procesar la venta: ' . $e->getMessage()], 500);
        }
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
