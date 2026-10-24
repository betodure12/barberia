<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'status';

switch ($action) {
    case 'status':
        sendJsonResponse([
            'success' => true,
            'server_online' => true,
            'server_time' => date('Y-m-d H:i:s'),
            'database' => 'SQLite Ready'
        ]);
        break;

    case 'import_offline':
        if ($method !== 'POST') {
            sendJsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        }

        $data = getJsonInput();
        $clients = $data['clients'] ?? [];
        $services = $data['services'] ?? [];
        $products = $data['products'] ?? [];
        $appointments = $data['appointments'] ?? [];
        $sales = $data['sales'] ?? [];
        $saleItems = $data['sale_items'] ?? [];

        $imported = [
            'clients' => 0,
            'appointments' => 0,
            'sales' => 0
        ];

        try {
            $pdo->beginTransaction();

            // 1. Map clients: find existing by phone or insert
            $clientIdMap = []; // offlineId => serverId
            foreach ($clients as $c) {
                $phone = trim($c['phone'] ?? '');
                $name = trim($c['name'] ?? '');
                $offId = $c['id'] ?? null;

                if (empty($name) || empty($phone)) continue;

                $stmtCheck = $pdo->prepare("SELECT id FROM clients WHERE phone = ? LIMIT 1");
                $stmtCheck->execute([$phone]);
                $existingId = $stmtCheck->fetchColumn();

                if ($existingId) {
                    $clientIdMap[$offId] = (int)$existingId;
                } else {
                    $stmtIns = $pdo->prepare("INSERT INTO clients (name, phone, email, notes) VALUES (?, ?, ?, ?)");
                    $stmtIns->execute([$name, $phone, $c['email'] ?? '', $c['notes'] ?? '']);
                    $newId = (int)$pdo->lastInsertId();
                    $clientIdMap[$offId] = $newId;
                    $imported['clients']++;
                }
            }

            // 2. Map services
            $serviceIdMap = [];
            foreach ($services as $s) {
                $sName = trim($s['name'] ?? '');
                if (!$sName) continue;
                $stmtS = $pdo->prepare("SELECT id FROM services WHERE name = ? LIMIT 1");
                $stmtS->execute([$sName]);
                $srvId = $stmtS->fetchColumn();
                if ($srvId) {
                    $serviceIdMap[$s['id']] = (int)$srvId;
                }
            }

            // 3. Map products
            $productIdMap = [];
            foreach ($products as $p) {
                $pName = trim($p['name'] ?? '');
                if (!$pName) continue;
                $stmtP = $pdo->prepare("SELECT id FROM products WHERE name = ? LIMIT 1");
                $stmtP->execute([$pName]);
                $prodId = $stmtP->fetchColumn();
                if ($prodId) {
                    $productIdMap[$p['id']] = (int)$prodId;
                }
            }

            // 4. Import Appointments
            $appointmentIdMap = [];
            foreach ($appointments as $a) {
                $offAppId = $a['id'] ?? null;
                $offClientId = $a['client_id'] ?? null;
                $offServiceId = $a['service_id'] ?? null;

                $realClientId = $clientIdMap[$offClientId] ?? null;
                if (!$realClientId) {
                    $firstC = $pdo->query("SELECT id FROM clients ORDER BY id ASC LIMIT 1")->fetchColumn();
                    $realClientId = $firstC ?: 1;
                }

                $realServiceId = $serviceIdMap[$offServiceId] ?? null;
                if (!$realServiceId) {
                    $firstS = $pdo->query("SELECT id FROM services WHERE active = 1 ORDER BY id ASC LIMIT 1")->fetchColumn();
                    $realServiceId = $firstS ?: 1;
                }

                $appDate = $a['appointment_date'] ?? date('Y-m-d');
                $appTime = $a['appointment_time'] ?? '12:00';

                // Check if appointment already exists
                $stmtCheckApp = $pdo->prepare("SELECT id FROM appointments WHERE client_id = ? AND appointment_date = ? AND appointment_time = ? LIMIT 1");
                $stmtCheckApp->execute([$realClientId, $appDate, $appTime]);
                $existingAppId = $stmtCheckApp->fetchColumn();

                if ($existingAppId) {
                    $appointmentIdMap[$offAppId] = (int)$existingAppId;
                } else {
                    $stmtInsApp = $pdo->prepare("
                        INSERT INTO appointments (client_id, service_id, barber_name, appointment_date, appointment_time, status, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmtInsApp->execute([
                        $realClientId,
                        $realServiceId,
                        $a['barber_name'] ?? 'Principal',
                        $appDate,
                        $appTime,
                        $a['status'] ?? 'Confirmada',
                        $a['notes'] ?? ''
                    ]);
                    $newAppId = (int)$pdo->lastInsertId();
                    $appointmentIdMap[$offAppId] = $newAppId;
                    $imported['appointments']++;
                }
            }

            // 5. Import Sales
            foreach ($sales as $sale) {
                $offSaleId = $sale['id'] ?? null;
                $createdAt = $sale['created_at'] ?? date('Y-m-d H:i:s');
                $total = (float)($sale['total'] ?? 0);

                // Prevent duplicate sale import (check total, created_at, payment_method)
                $stmtCheckSale = $pdo->prepare("SELECT id FROM sales WHERE created_at = ? AND total = ? LIMIT 1");
                $stmtCheckSale->execute([$createdAt, $total]);
                if ($stmtCheckSale->fetchColumn()) {
                    continue; // Already on server
                }

                $offClientId = $sale['client_id'] ?? null;
                $realClientId = $clientIdMap[$offClientId] ?? null;

                $offAppId = $sale['appointment_id'] ?? null;
                $realAppId = $appointmentIdMap[$offAppId] ?? null;

                $stmtSaleIns = $pdo->prepare("
                    INSERT INTO sales (client_id, appointment_id, subtotal, discount, total, payment_method, amount_paid, change_amount, notes, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtSaleIns->execute([
                    $realClientId,
                    $realAppId,
                    (float)($sale['subtotal'] ?? $total),
                    (float)($sale['discount'] ?? 0),
                    $total,
                    $sale['payment_method'] ?? 'Efectivo',
                    (float)($sale['amount_paid'] ?? $total),
                    (float)($sale['change_amount'] ?? 0),
                    $sale['notes'] ?? '',
                    $sale['status'] ?? 'Completada',
                    $createdAt
                ]);
                $newSaleId = (int)$pdo->lastInsertId();
                $imported['sales']++;

                // Import sale items
                $itemsForThisSale = array_filter($saleItems, function($it) use ($offSaleId) {
                    return isset($it['sale_id']) && $it['sale_id'] == $offSaleId;
                });

                $stmtItemIns = $pdo->prepare("
                    INSERT INTO sale_items (sale_id, item_type, item_id, item_name, quantity, unit_price, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");

                foreach ($itemsForThisSale as $it) {
                    $iType = $it['item_type'] ?? 'product';
                    $rawId = $it['item_id'] ?? null;
                    $realItemId = null;
                    if ($iType === 'product' && $rawId && isset($productIdMap[$rawId])) {
                        $realItemId = $productIdMap[$rawId];
                    } elseif ($iType === 'service' && $rawId && isset($serviceIdMap[$rawId])) {
                        $realItemId = $serviceIdMap[$rawId];
                    }

                    $stmtItemIns->execute([
                        $newSaleId,
                        $iType,
                        $realItemId,
                        $it['item_name'] ?? 'Producto',
                        (int)($it['quantity'] ?? 1),
                        (float)($it['unit_price'] ?? 0),
                        (float)($it['subtotal'] ?? 0)
                    ]);
                }
            }

            $pdo->commit();

            sendJsonResponse([
                'success' => true,
                'message' => 'Sincronización completada con éxito',
                'imported' => $imported
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'error' => 'Error al sincronizar: ' . $e->getMessage()], 500);
        }
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
}
