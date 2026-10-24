<?php
/**
 * Database Seeder for BarberApp
 */

function seedDatabase($pdo) {
    // 1. Seed Clients
    $clients = [
        ['Carlos Mendoza', '+54 9 11 4521-8890', 'carlos.mendoza@email.com', 'Prefiere fade medio y toalla caliente.'],
        ['Mateo Gómez', '+54 9 11 6320-1144', 'mateo.g@email.com', 'Cliente habitual cada 15 días. Le gusta café o cerveza.'],
        ['Lucas Rodríguez', '+54 9 11 5874-9921', 'lucas.rod@email.com', 'Fanático de los decants amaderados.'],
        ['Santiago Fernández', '+54 9 11 3145-7762', 'santi.f@email.com', 'Corte clásico con tijera arriba y perfilado.'],
        ['Joaquín Herrera', '+54 9 11 7789-2231', 'joaco.h@email.com', 'Degradé alto con navaja. Siempre pide agua con gas.']
    ];

    $stmt = $pdo->prepare("INSERT INTO clients (name, phone, email, notes) VALUES (?, ?, ?, ?)");
    foreach ($clients as $c) {
        $stmt->execute($c);
    }

    // 2. Seed Services (Precios en Guaraníes)
    $services = [
        ['Corte Clásico', 'Corte', 35000, 30, 'Corte tradicional a tijera o máquina con peinado.'],
        ['Degradé / Fade Pro', 'Corte', 50000, 40, 'Fade bajo, medio o alto con terminación a navaja y shaver.'],
        ['Corte + Barba VIP', 'Combo', 80000, 55, 'Corte completo, perfilado de barba, toalla caliente y aceites premium.'],
        ['Perfilado de Barba & Toalla', 'Barba', 30000, 25, 'Arreglo de barba con navaja, toalla tibia y bálsamo.'],
        ['Tratamiento Capilar & Lavado', 'Tratamiento', 40000, 30, 'Lavado profundo, nutrición capilar y peinado.'],
        ['Diseño Freestyle / Líneas', 'Corte', 25000, 20, 'Detalles artísticos o líneas personalizadas con navaja.']
    ];

    $stmt = $pdo->prepare("INSERT INTO services (name, category, price, duration, description) VALUES (?, ?, ?, ?, ?)");
    foreach ($services as $s) {
        $stmt->execute($s);
    }

    // 3. Seed Products (Precios en Guaraníes)
    $products = [
        // Decants
        ['Dior Sauvage EDP (Decant 5ml)', 'decant', 'Dior', '5ml', 25000, 50000, 15, 4],
        ['Creed Aventus (Decant 5ml)', 'decant', 'Creed', '5ml', 45000, 85000, 8, 3],
        ['JPG Le Male Elixir (Decant 10ml)', 'decant', 'Jean Paul Gaultier', '10ml', 35000, 70000, 12, 3],
        ['Tom Ford Tobacco Vanille (5ml)', 'decant', 'Tom Ford', '5ml', 50000, 95000, 6, 2],
        ['Armaf Club De Nuit (Decant 10ml)', 'decant', 'Armaf', '10ml', 20000, 40000, 20, 5],

        // Perfumes Enteros
        ['Dior Sauvage Eau de Parfum 100ml', 'perfume', 'Dior', '100ml', 650000, 950000, 3, 1],
        ['Versace Eros Flame 100ml', 'perfume', 'Versace', '100ml', 500000, 750000, 4, 1],
        ['Armaf Club De Nuit Intense 105ml', 'perfume', 'Armaf', '105ml', 280000, 450000, 6, 2],
        ['Azzaro The Most Wanted Parfum 100ml', 'perfume', 'Azzaro', '100ml', 600000, 850000, 2, 1],

        // Bebidas Alcohólicas
        ['Cerveza Corona Extra 355ml', 'alcohol', 'Corona', '355ml', 10000, 18000, 24, 6],
        ['Cerveza Heineken Lata 473ml', 'alcohol', 'Heineken', '473ml', 9000, 16000, 30, 8],
        ['Cerveza Artesanal IPA 500ml', 'alcohol', 'Patagonia', '500ml', 14000, 25000, 18, 5],
        ['Vaso Whisky Jack Daniel\'s No. 7', 'alcohol', 'Jack Daniel\'s', 'Shot/Vaso', 18000, 35000, 15, 4],

        // Bebidas Sin Alcohol
        ['Coca-Cola Original 354ml', 'no_alcohol', 'Coca-Cola', '354ml', 4000, 8000, 28, 6],
        ['Coca-Cola Zero / Sin Azúcar 354ml', 'no_alcohol', 'Coca-Cola', '354ml', 4000, 8000, 25, 6],
        ['Agua Mineral 500ml', 'no_alcohol', 'Villavicencio', '500ml', 3000, 6000, 30, 8],
        ['Monster Energy 473ml', 'no_alcohol', 'Monster', '473ml', 10000, 18000, 16, 4],
        ['Red Bull Energy 250ml', 'no_alcohol', 'Red Bull', '250ml', 11000, 20000, 14, 4]
    ];

    $stmt = $pdo->prepare("INSERT INTO products (name, category, brand, size_volume, cost_price, sale_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($products as $p) {
        $stmt->execute($p);
    }

    // Get inserted client & service IDs
    $clientIds = $pdo->query("SELECT id FROM clients ORDER BY id ASC")->fetchAll(PDO::FETCH_COLUMN);
    $serviceIds = $pdo->query("SELECT id FROM services ORDER BY id ASC")->fetchAll(PDO::FETCH_COLUMN);
    $productIds = $pdo->query("SELECT id, sale_price FROM products ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    // 4. Seed Appointments (Today and Tomorrow)
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));

    if (count($clientIds) >= 5 && count($serviceIds) >= 3) {
        $appointments = [
            [$clientIds[0], $serviceIds[2], 'Gastón (Master Barber)', $today, '10:00', 'Completada', 'Cliente puntual.'],
            [$clientIds[1], $serviceIds[1], 'Gastón (Master Barber)', $today, '11:30', 'Confirmada', 'Recordatorio enviado.'],
            [$clientIds[2], $serviceIds[0], 'Franco', $today, '14:00', 'Pendiente', 'Interesado en probar decants.'],
            [$clientIds[3], $serviceIds[2], 'Gastón (Master Barber)', $today, '16:30', 'Confirmada', 'Combo VIP.'],
            [$clientIds[4], $serviceIds[1], 'Franco', $tomorrow, '11:00', 'Confirmada', 'Turno agendado online.']
        ];

        $stmt = $pdo->prepare("INSERT INTO appointments (client_id, service_id, barber_name, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
        foreach ($appointments as $a) {
            $stmt->execute($a);
        }
    }

    // 5. Seed sample sales for today's summary
    if (count($clientIds) > 0 && count($serviceIds) > 2) {
        $stmtApp = $pdo->query("SELECT id FROM appointments WHERE status = 'Completada' LIMIT 1");
        $compAppId = $stmtApp->fetchColumn();

        $sale1 = [
            'client_id' => $clientIds[0],
            'appointment_id' => $compAppId ?: null,
            'subtotal' => 148000,
            'discount' => 8000,
            'total' => 140000,
            'payment_method' => 'Efectivo',
            'amount_paid' => 150000,
            'change_amount' => 10000,
            'notes' => 'Corte VIP + Decant Dior Sauvage + Corona'
        ];

        $stmt = $pdo->prepare("INSERT INTO sales (client_id, appointment_id, subtotal, discount, total, payment_method, amount_paid, change_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $sale1['client_id'],
            $sale1['appointment_id'],
            $sale1['subtotal'],
            $sale1['discount'],
            $sale1['total'],
            $sale1['payment_method'],
            $sale1['amount_paid'],
            $sale1['change_amount'],
            $sale1['notes']
        ]);
        $sale1_id = $pdo->lastInsertId();

        // Items for sale 1 (Combo VIP 80.000 + Decant 50.000 + Corona 18.000 = 148.000)
        $items = [
            [$sale1_id, 'service', $serviceIds[2], 'Corte + Barba VIP', 1, 80000, 80000],
            [$sale1_id, 'product', $productIds[0]['id'], 'Dior Sauvage EDP (Decant 5ml)', 1, 50000, 50000],
            [$sale1_id, 'product', $productIds[9]['id'], 'Cerveza Corona Extra 355ml', 1, 18000, 18000]
        ];
        $stmtItem = $pdo->prepare("INSERT INTO sale_items (sale_id, item_type, item_id, item_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
        foreach ($items as $item) {
            $stmtItem->execute($item);
        }
    }

    // Settings
    $settings = [
        ['business_name', 'Barbería & Lounge Club'],
        ['business_phone', '+54 9 11 0000-0000'],
        ['business_address', 'Av. Santa Fe 2450, CABA'],
        ['currency_symbol', '$'],
        ['currency_code', 'ARS']
    ];
    $stmtSet = $pdo->prepare("INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)");
    foreach ($settings as $s) {
        $stmtSet->execute($s);
    }
}
