<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $category = $_GET['category'] ?? '';
        $search = $_GET['search'] ?? '';
        $lowStockOnly = isset($_GET['low_stock']) && $_GET['low_stock'] === '1';

        $query = "SELECT * FROM products WHERE active = 1";
        $params = [];

        if (!empty($category) && $category !== 'all') {
            $query .= " AND category = :category";
            $params[':category'] = $category;
        }

        if (!empty($search)) {
            $query .= " AND (name LIKE :search OR brand LIKE :search)";
            $params[':search'] = "%$search%";
        }

        if ($lowStockOnly) {
            $query .= " AND stock <= min_stock";
        }

        $query .= " ORDER BY category ASC, name ASC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Calculate summary counts by category
        $stmtCounts = $pdo->query("
            SELECT category, COUNT(*) as count, SUM(stock) as total_stock 
            FROM products 
            WHERE active = 1 
            GROUP BY category
        ");
        $counts = $stmtCounts->fetchAll();

        sendJsonResponse([
            'success' => true,
            'data' => $products,
            'category_counts' => $counts
        ]);
        break;

    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            sendJsonResponse(['success' => false, 'error' => 'Producto no encontrado'], 404);
        }

        sendJsonResponse(['success' => true, 'data' => $product]);
        break;

    case 'create':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $name = trim($data['name'] ?? '');
        $category = trim($data['category'] ?? 'decant');
        $brand = trim($data['brand'] ?? '');
        $size_volume = trim($data['size_volume'] ?? '');
        $cost_price = (float)($data['cost_price'] ?? 0);
        $sale_price = (float)($data['sale_price'] ?? 0);
        $stock = (int)($data['stock'] ?? 0);
        $min_stock = (int)($data['min_stock'] ?? 3);

        if (empty($name) || $sale_price <= 0) {
            sendJsonResponse(['success' => false, 'error' => 'Nombre y precio de venta son requeridos'], 400);
        }

        $allowedCategories = ['decant', 'perfume', 'alcohol', 'no_alcohol', 'otro'];
        if (!in_array($category, $allowedCategories)) {
            $category = 'otro';
        }

        $stmt = $pdo->prepare("
            INSERT INTO products (name, category, brand, size_volume, cost_price, sale_price, stock, min_stock, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([$name, $category, $brand, $size_volume, $cost_price, $sale_price, $stock, $min_stock]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Producto agregado al inventario',
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
        $category = trim($data['category'] ?? 'decant');
        $brand = trim($data['brand'] ?? '');
        $size_volume = trim($data['size_volume'] ?? '');
        $cost_price = (float)($data['cost_price'] ?? 0);
        $sale_price = (float)($data['sale_price'] ?? 0);
        $stock = (int)($data['stock'] ?? 0);
        $min_stock = (int)($data['min_stock'] ?? 3);

        if (!$id || empty($name) || $sale_price <= 0) {
            sendJsonResponse(['success' => false, 'error' => 'Datos incompletos'], 400);
        }

        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, category = ?, brand = ?, size_volume = ?, cost_price = ?, sale_price = ?, stock = ?, min_stock = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $category, $brand, $size_volume, $cost_price, $sale_price, $stock, $min_stock, $id]);

        sendJsonResponse(['success' => true, 'message' => 'Producto actualizado correctamente']);
        break;

    case 'adjust_stock':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);
        $adjustment = (int)($data['adjustment'] ?? 0); // e.g. +5 or -2
        $type = $data['type'] ?? 'delta'; // 'delta' or 'absolute'
        $newStock = (int)($data['new_stock'] ?? 0);

        if (!$id) {
            sendJsonResponse(['success' => false, 'error' => 'ID inválido'], 400);
        }

        if ($type === 'absolute') {
            $stmt = $pdo->prepare("UPDATE products SET stock = MAX(0, ?) WHERE id = ?");
            $stmt->execute([$newStock, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?");
            $stmt->execute([$adjustment, $id]);
        }

        $stmtGet = $pdo->prepare("SELECT stock FROM products WHERE id = ?");
        $stmtGet->execute([$id]);
        $updated = $stmtGet->fetch();

        sendJsonResponse([
            'success' => true,
            'message' => 'Stock actualizado',
            'current_stock' => $updated['stock'] ?? 0
        ]);
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

        // Soft delete
        $stmt = $pdo->prepare("UPDATE products SET active = 0 WHERE id = ?");
        $stmt->execute([$id]);

        sendJsonResponse(['success' => true, 'message' => 'Producto eliminado del catálogo']);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
