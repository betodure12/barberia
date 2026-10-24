<?php
/**
 * Database Connection & Auto-Migration Handler
 * BarberApp Management System
 */

// Enable error reporting during development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Default headers for API
header('Content-Type: application/json; charset=utf-8');

$dbDir = __DIR__ . '/../database';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}

$dbPath = $dbDir . '/barberia.db';
$firstRun = !file_exists($dbPath);

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("PRAGMA foreign_keys = ON;");

    // Initialize tables if first run or checking schema
    initDatabaseSchema($pdo);

    if ($firstRun) {
        require_once __DIR__ . '/seed.php';
        seedDatabase($pdo);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}

function initDatabaseSchema($pdo) {
    // Clients table
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Services / Haircuts table
    $pdo->exec("CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'Corte',
        price REAL NOT NULL,
        duration INTEGER DEFAULT 30, -- minutes
        description TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Products & Extras (Decants, Full Perfumes, Alcoholic & Non-alcoholic Drinks)
    $pdo->exec("CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL, -- 'decant', 'perfume', 'alcohol', 'no_alcohol', 'otro'
        brand TEXT,
        size_volume TEXT, -- e.g. '5ml', '10ml', '100ml', '355ml', '500ml'
        cost_price REAL DEFAULT 0,
        sale_price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER DEFAULT 3,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Appointments / Reservations table
    $pdo->exec("CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        barber_name TEXT DEFAULT 'Principal',
        appointment_date TEXT NOT NULL, -- YYYY-MM-DD
        appointment_time TEXT NOT NULL, -- HH:MM
        status TEXT DEFAULT 'Pendiente', -- 'Pendiente', 'Confirmada', 'En Proceso', 'Completada', 'Cancelada'
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
    )");

    // Sales table (POS transactions)
    $pdo->exec("CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        appointment_id INTEGER,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Efectivo', -- 'Efectivo', 'Tarjeta', 'Transferencia'
        amount_paid REAL,
        change_amount REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
    )");

    // Sale items (services and products included in each sale)
    $pdo->exec("CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        item_type TEXT NOT NULL, -- 'service' or 'product'
        item_id INTEGER,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )");

    // Settings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
    )");
}

/**
 * Utility helper for sending JSON responses
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Utility helper to get JSON POST body
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : $_POST;
}
