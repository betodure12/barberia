<?php
require_once __DIR__ . '/db.php';

$today = date('Y-m-d');
$firstDayMonth = date('Y-m-01');

// 1. Revenue Today
$stmtToday = $pdo->prepare("SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE DATE(created_at) = ?");
$stmtToday->execute([$today]);
$revenueToday = $stmtToday->fetch();

// 2. Revenue Month
$stmtMonth = $pdo->prepare("SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE DATE(created_at) >= ?");
$stmtMonth->execute([$firstDayMonth]);
$revenueMonth = $stmtMonth->fetch();

// 3. Appointments Today
$stmtAppToday = $pdo->prepare("
    SELECT a.*, c.name as client_name, c.phone as client_phone, s.name as service_name, s.price as service_price
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE a.appointment_date = ?
    ORDER BY a.appointment_time ASC
");
$stmtAppToday->execute([$today]);
$todayAppointments = $stmtAppToday->fetchAll();

// 4. Low stock products alert
$stmtLowStock = $pdo->query("
    SELECT * FROM products 
    WHERE active = 1 AND stock <= min_stock 
    ORDER BY stock ASC, category ASC
");
$lowStockProducts = $stmtLowStock->fetchAll();

// 5. Sales by Category (Services vs Decants vs Perfumes vs Alcohol vs No Alcohol)
$stmtCatSales = $pdo->query("
    SELECT 
        CASE 
            WHEN si.item_type = 'service' THEN 'Servicios'
            WHEN p.category = 'decant' THEN 'Perfumes Decant'
            WHEN p.category = 'perfume' THEN 'Perfumes Enteros'
            WHEN p.category = 'alcohol' THEN 'Bebidas Alcohólicas'
            WHEN p.category = 'no_alcohol' THEN 'Bebidas Sin Alcohol'
            ELSE 'Otros'
        END as category_label,
        SUM(si.subtotal) as total_amount,
        SUM(si.quantity) as total_units
    FROM sale_items si
    LEFT JOIN products p ON si.item_id = p.id AND si.item_type = 'product'
    GROUP BY category_label
    ORDER BY total_amount DESC
");
$salesByCategory = $stmtCatSales->fetchAll();

// 6. Top Selling Products
$stmtTopProducts = $pdo->query("
    SELECT si.item_name, si.item_type, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_sales
    FROM sale_items si
    GROUP BY si.item_name, si.item_type
    ORDER BY total_qty DESC
    LIMIT 6
");
$topProducts = $stmtTopProducts->fetchAll();

// 7. Last 7 Days Revenue Trend
$trendData = [];
for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i days"));
    $stmtTrend = $pdo->prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE DATE(created_at) = ?");
    $stmtTrend->execute([$d]);
    $trendRes = $stmtTrend->fetch();
    $trendData[] = [
        'date' => $d,
        'day_label' => date('d/m', strtotime($d)),
        'total' => (float)$trendRes['total']
    ];
}

// 8. General Counts
$totalClients = $pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();
$totalProducts = $pdo->query("SELECT COUNT(*) FROM products WHERE active = 1")->fetchColumn();
$totalServices = $pdo->query("SELECT COUNT(*) FROM services WHERE active = 1")->fetchColumn();

sendJsonResponse([
    'success' => true,
    'data' => [
        'revenue_today' => (float)$revenueToday['total'],
        'sales_count_today' => (int)$revenueToday['count'],
        'revenue_month' => (float)$revenueMonth['total'],
        'sales_count_month' => (int)$revenueMonth['count'],
        'total_clients' => (int)$totalClients,
        'total_products' => (int)$totalProducts,
        'total_services' => (int)$totalServices,
        'appointments_today_count' => count($todayAppointments),
        'today_appointments' => $todayAppointments,
        'low_stock_products' => $lowStockProducts,
        'sales_by_category' => $salesByCategory,
        'top_products' => $topProducts,
        'revenue_trend' => $trendData
    ]
]);
