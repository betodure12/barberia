/**
 * BarberApp - Offline In-Browser Storage & API Simulator
 * Enables 100% autonomous operation without PC or Internet connection.
 */
(function() {
  'use strict';

  const DB_PREFIX = 'barber_offline_';
  const KEYS = {
    CLIENTS: DB_PREFIX + 'clients',
    SERVICES: DB_PREFIX + 'services',
    PRODUCTS: DB_PREFIX + 'products',
    APPOINTMENTS: DB_PREFIX + 'appointments',
    SALES: DB_PREFIX + 'sales',
    SALE_ITEMS: DB_PREFIX + 'sale_items',
    SETTINGS: DB_PREFIX + 'settings',
    CASH_CLOSINGS: DB_PREFIX + 'cash_closings',
    INITIALIZED: DB_PREFIX + 'initialized'
  };

  // Helper functions for storage
  function getCollection(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading localStorage key ' + key, e);
      return [];
    }
  }

  function saveCollection(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving localStorage key ' + key, e);
    }
  }

  function getNextId(collection) {
    if (!collection || collection.length === 0) return 1;
    return Math.max(...collection.map(item => parseInt(item.id, 10) || 0)) + 1;
  }

  function formatToday() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatNow() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Seed initial data if first time
  function seedDatabaseIfEmpty() {
    if (localStorage.getItem(KEYS.INITIALIZED)) {
      return;
    }

    const today = formatToday();
    const tomorrow = formatTomorrow();
    const now = formatNow();

    const clients = [
      { id: 1, name: 'Carlos Mendoza', phone: '+54 9 11 4521-8890', email: 'carlos.mendoza@email.com', notes: 'Prefiere fade medio y toalla caliente.', created_at: now },
      { id: 2, name: 'Mateo Gómez', phone: '+54 9 11 6320-1144', email: 'mateo.g@email.com', notes: 'Cliente habitual cada 15 días. Le gusta café o cerveza.', created_at: now },
      { id: 3, name: 'Lucas Rodríguez', phone: '+54 9 11 5874-9921', email: 'lucas.rod@email.com', notes: 'Fanático de los decants amaderados.', created_at: now },
      { id: 4, name: 'Santiago Fernández', phone: '+54 9 11 3145-7762', email: 'santi.f@email.com', notes: 'Corte clásico con tijera arriba y perfilado.', created_at: now },
      { id: 5, name: 'Joaquín Herrera', phone: '+54 9 11 7789-2231', email: 'joaco.h@email.com', notes: 'Degradé alto con navaja. Siempre pide agua con gas.', created_at: now }
    ];

    const services = [
      { id: 1, name: 'Corte Clásico', category: 'Corte', price: 35000, duration: 30, description: 'Corte tradicional a tijera o máquina con peinado.', active: 1, created_at: now },
      { id: 2, name: 'Degradé / Fade Pro', category: 'Corte', price: 50000, duration: 40, description: 'Fade bajo, medio o alto con terminación a navaja y shaver.', active: 1, created_at: now },
      { id: 3, name: 'Corte + Barba VIP', category: 'Combo', price: 80000, duration: 55, description: 'Corte completo, perfilado de barba, toalla caliente y aceites premium.', active: 1, created_at: now },
      { id: 4, name: 'Perfilado de Barba & Toalla', category: 'Barba', price: 30000, duration: 25, description: 'Arreglo de barba con navaja, toalla tibia y bálsamo.', active: 1, created_at: now },
      { id: 5, name: 'Tratamiento Capilar & Lavado', category: 'Tratamiento', price: 40000, duration: 30, description: 'Lavado profundo, nutrición capilar y peinado.', active: 1, created_at: now },
      { id: 6, name: 'Diseño Freestyle / Líneas', category: 'Corte', price: 25000, duration: 20, description: 'Detalles artísticos o líneas personalizadas con navaja.', active: 1, created_at: now }
    ];

    const products = [
      // Decants
      { id: 1, name: 'Dior Sauvage EDP (Decant 5ml)', category: 'decant', brand: 'Dior', size_volume: '5ml', cost_price: 25000, sale_price: 50000, stock: 15, min_stock: 4, active: 1, created_at: now },
      { id: 2, name: 'Creed Aventus (Decant 5ml)', category: 'decant', brand: 'Creed', size_volume: '5ml', cost_price: 45000, sale_price: 85000, stock: 8, min_stock: 3, active: 1, created_at: now },
      { id: 3, name: 'JPG Le Male Elixir (Decant 10ml)', category: 'decant', brand: 'Jean Paul Gaultier', size_volume: '10ml', cost_price: 35000, sale_price: 70000, stock: 12, min_stock: 3, active: 1, created_at: now },
      { id: 4, name: 'Tom Ford Tobacco Vanille (5ml)', category: 'decant', brand: 'Tom Ford', size_volume: '5ml', cost_price: 50000, sale_price: 95000, stock: 6, min_stock: 2, active: 1, created_at: now },
      { id: 5, name: 'Armaf Club De Nuit (Decant 10ml)', category: 'decant', brand: 'Armaf', size_volume: '10ml', cost_price: 20000, sale_price: 40000, stock: 20, min_stock: 5, active: 1, created_at: now },

      // Perfumes Enteros
      { id: 6, name: 'Dior Sauvage Eau de Parfum 100ml', category: 'perfume', brand: 'Dior', size_volume: '100ml', cost_price: 650000, sale_price: 950000, stock: 3, min_stock: 1, active: 1, created_at: now },
      { id: 7, name: 'Versace Eros Flame 100ml', category: 'perfume', brand: 'Versace', size_volume: '100ml', cost_price: 500000, sale_price: 750000, stock: 4, min_stock: 1, active: 1, created_at: now },
      { id: 8, name: 'Armaf Club De Nuit Intense 105ml', category: 'perfume', brand: 'Armaf', size_volume: '105ml', cost_price: 280000, sale_price: 450000, stock: 6, min_stock: 2, active: 1, created_at: now },
      { id: 9, name: 'Azzaro The Most Wanted Parfum 100ml', category: 'perfume', brand: 'Azzaro', size_volume: '100ml', cost_price: 600000, sale_price: 850000, stock: 2, min_stock: 1, active: 1, created_at: now },

      // Bebidas Alcohólicas
      { id: 10, name: 'Cerveza Corona Extra 355ml', category: 'alcohol', brand: 'Corona', size_volume: '355ml', cost_price: 10000, sale_price: 18000, stock: 24, min_stock: 6, active: 1, created_at: now },
      { id: 11, name: 'Cerveza Heineken Lata 473ml', category: 'alcohol', brand: 'Heineken', size_volume: '473ml', cost_price: 9000, sale_price: 16000, stock: 30, min_stock: 8, active: 1, created_at: now },
      { id: 12, name: 'Cerveza Artesanal IPA 500ml', category: 'alcohol', brand: 'Patagonia', size_volume: '500ml', cost_price: 14000, sale_price: 25000, stock: 18, min_stock: 5, active: 1, created_at: now },
      { id: 13, name: 'Vaso Whisky Jack Daniel\'s No. 7', category: 'alcohol', brand: 'Jack Daniel\'s', size_volume: 'Shot/Vaso', cost_price: 18000, sale_price: 35000, stock: 15, min_stock: 4, active: 1, created_at: now },

      // Bebidas Sin Alcohol
      { id: 14, name: 'Coca-Cola Original 354ml', category: 'no_alcohol', brand: 'Coca-Cola', size_volume: '354ml', cost_price: 4000, sale_price: 8000, stock: 28, min_stock: 6, active: 1, created_at: now },
      { id: 15, name: 'Coca-Cola Zero / Sin Azúcar 354ml', category: 'no_alcohol', brand: 'Coca-Cola', size_volume: '354ml', cost_price: 4000, sale_price: 8000, stock: 25, min_stock: 6, active: 1, created_at: now },
      { id: 16, name: 'Agua Mineral 500ml', category: 'no_alcohol', brand: 'Villavicencio', size_volume: '500ml', cost_price: 3000, sale_price: 6000, stock: 30, min_stock: 8, active: 1, created_at: now },
      { id: 17, name: 'Monster Energy 473ml', category: 'no_alcohol', brand: 'Monster', size_volume: '473ml', cost_price: 10000, sale_price: 18000, stock: 16, min_stock: 4, active: 1, created_at: now },
      { id: 18, name: 'Red Bull Energy 250ml', category: 'no_alcohol', brand: 'Red Bull', size_volume: '250ml', cost_price: 11000, sale_price: 20000, stock: 14, min_stock: 4, active: 1, created_at: now }
    ];

    const appointments = [
      { id: 1, client_id: 1, service_id: 3, barber_name: 'Gastón (Master Barber)', appointment_date: today, appointment_time: '10:00', status: 'Completada', notes: 'Cliente puntual.', created_at: now },
      { id: 2, client_id: 2, service_id: 2, barber_name: 'Gastón (Master Barber)', appointment_date: today, appointment_time: '11:30', status: 'Confirmada', notes: 'Recordatorio enviado.', created_at: now },
      { id: 3, client_id: 3, service_id: 1, barber_name: 'Franco', appointment_date: today, appointment_time: '14:00', status: 'Confirmada', notes: 'Interesado en probar decants.', created_at: now },
      { id: 4, client_id: 4, service_id: 3, barber_name: 'Gastón (Master Barber)', appointment_date: today, appointment_time: '16:30', status: 'Confirmada', notes: 'Combo VIP.', created_at: now },
      { id: 5, client_id: 5, service_id: 2, barber_name: 'Franco', appointment_date: tomorrow, appointment_time: '11:00', status: 'Confirmada', notes: 'Turno agendado online.', created_at: now }
    ];

    const sales = [
      {
        id: 1,
        client_id: 1,
        appointment_id: 1,
        subtotal: 130000,
        discount: 0,
        total: 130000,
        payment_method: 'Efectivo',
        amount_paid: 150000,
        change_amount: 20000,
        notes: 'Cliente muy satisfecho con el corte y decant.',
        created_at: now
      },
      {
        id: 2,
        client_id: null,
        appointment_id: null,
        subtotal: 18000,
        discount: 0,
        total: 18000,
        payment_method: 'Tarjeta',
        amount_paid: 18000,
        change_amount: 0,
        notes: 'Venta rápida mostrador',
        created_at: now
      }
    ];

    const saleItems = [
      { id: 1, sale_id: 1, item_type: 'service', item_id: 3, item_name: 'Corte + Barba VIP', quantity: 1, unit_price: 80000, subtotal: 80000 },
      { id: 2, sale_id: 1, item_type: 'product', item_id: 1, item_name: 'Dior Sauvage EDP (Decant 5ml)', quantity: 1, unit_price: 50000, subtotal: 50000 },
      { id: 3, sale_id: 2, item_type: 'product', item_id: 10, item_name: 'Cerveza Corona Extra 355ml', quantity: 1, unit_price: 18000, subtotal: 18000 }
    ];

    saveCollection(KEYS.CLIENTS, clients);
    saveCollection(KEYS.SERVICES, services);
    saveCollection(KEYS.PRODUCTS, products);
    saveCollection(KEYS.APPOINTMENTS, appointments);
    saveCollection(KEYS.SALES, sales);
    saveCollection(KEYS.SALE_ITEMS, saleItems);
    saveCollection(KEYS.SETTINGS, {
      business_name: 'MF Barber & Lounge',
      phone: '+595 981 123456',
      address: 'Av. Central 1234, Asunción',
      currency: 'PYG',
      exchange_rate: '7500'
    });

    localStorage.setItem(KEYS.INITIALIZED, '1');
    console.log('[BarberApp Offline] Base de datos inicializada localmente con éxito.');
  }

  // Parse Body from Request
  async function parseBody(options) {
    if (!options || !options.body) return {};
    if (typeof options.body === 'string') {
      try {
        return JSON.parse(options.body);
      } catch (e) {
        // May be URL encoded
        const params = new URLSearchParams(options.body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        return obj;
      }
    } else if (options.body instanceof FormData) {
      const obj = {};
      for (const [k, v] of options.body.entries()) obj[k] = v;
      return obj;
    }
    return options.body;
  }

  // Handle Offline API
  async function handleOfflineApi(url, options = {}) {
    seedDatabaseIfEmpty();

    const parsedUrl = new URL(url, window.location.href);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;
    const action = searchParams.get('action') || 'list';
    const method = (options.method || 'GET').toUpperCase();
    const body = await parseBody(options);

    let responseData = { success: false, error: 'Endpoint no reconocido' };
    let statusCode = 200;

    // --- DASHBOARD API ---
    if (pathname.includes('dashboard.php')) {
      const today = formatToday();
      const firstDayMonth = today.substring(0, 7) + '-01';

      const sales = getCollection(KEYS.SALES);
      const saleItems = getCollection(KEYS.SALE_ITEMS);
      const clients = getCollection(KEYS.CLIENTS);
      const services = getCollection(KEYS.SERVICES);
      const products = getCollection(KEYS.PRODUCTS);
      const appointments = getCollection(KEYS.APPOINTMENTS);

      // Revenue Today
      const salesToday = sales.filter(s => (s.created_at || '').startsWith(today));
      const revenueToday = salesToday.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
      const salesCountToday = salesToday.length;

      // Revenue Month
      const salesMonth = sales.filter(s => (s.created_at || '') >= firstDayMonth);
      const revenueMonth = salesMonth.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
      const salesCountMonth = salesMonth.length;

      // Appointments Today
      const todayAppointments = appointments
        .filter(a => a.appointment_date === today)
        .map(a => {
          const c = clients.find(cl => cl.id === parseInt(a.client_id, 10)) || {};
          const s = services.find(sv => sv.id === parseInt(a.service_id, 10)) || {};
          return {
            ...a,
            client_name: c.name || 'Cliente',
            client_phone: c.phone || '',
            service_name: s.name || 'Servicio',
            service_price: s.price || 0
          };
        })
        .sort((x, y) => (x.appointment_time || '').localeCompare(y.appointment_time || ''));

      // Low Stock
      const lowStockProducts = products
        .filter(p => p.active !== 0 && parseInt(p.stock, 10) <= parseInt(p.min_stock, 10))
        .sort((a, b) => parseInt(a.stock, 10) - parseInt(b.stock, 10));

      // Sales By Category
      const catMap = {
        'Servicios': { total_amount: 0, total_units: 0 },
        'Perfumes Decant': { total_amount: 0, total_units: 0 },
        'Perfumes Enteros': { total_amount: 0, total_units: 0 },
        'Bebidas Alcohólicas': { total_amount: 0, total_units: 0 },
        'Bebidas Sin Alcohol': { total_amount: 0, total_units: 0 },
        'Otros': { total_amount: 0, total_units: 0 }
      };

      saleItems.forEach(item => {
        let cat = 'Otros';
        if (item.item_type === 'service') {
          cat = 'Servicios';
        } else {
          const prod = products.find(p => p.id === parseInt(item.item_id, 10));
          const pCat = prod ? prod.category : '';
          if (pCat === 'decant') cat = 'Perfumes Decant';
          else if (pCat === 'perfume') cat = 'Perfumes Enteros';
          else if (pCat === 'alcohol') cat = 'Bebidas Alcohólicas';
          else if (pCat === 'no_alcohol') cat = 'Bebidas Sin Alcohol';
        }
        catMap[cat].total_amount += (parseFloat(item.subtotal) || 0);
        catMap[cat].total_units += (parseInt(item.quantity, 10) || 1);
      });

      const salesByCategory = Object.entries(catMap)
        .map(([k, v]) => ({ category_label: k, total_amount: v.total_amount, total_units: v.total_units }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Top Products
      const topMap = {};
      saleItems.forEach(si => {
        const key = (si.item_name || 'Producto') + '|' + si.item_type;
        if (!topMap[key]) {
          topMap[key] = { item_name: si.item_name, item_type: si.item_type, total_qty: 0, total_sales: 0 };
        }
        topMap[key].total_qty += (parseInt(si.quantity, 10) || 1);
        topMap[key].total_sales += (parseFloat(si.subtotal) || 0);
      });

      const topProducts = Object.values(topMap)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 6);

      // Trend 7 days
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
        const dayTotal = sales
          .filter(s => (s.created_at || '').startsWith(dateStr))
          .reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0);
        trendData.push({ date: dateStr, day_label: dayLabel, total: dayTotal });
      }

      responseData = {
        success: true,
        data: {
          revenue_today: revenueToday,
          sales_count_today: salesCountToday,
          revenue_month: revenueMonth,
          sales_count_month: salesCountMonth,
          total_clients: clients.length,
          total_products: products.filter(p => p.active !== 0).length,
          total_services: services.filter(s => s.active !== 0).length,
          appointments_today_count: todayAppointments.length,
          today_appointments: todayAppointments,
          low_stock_products: lowStockProducts,
          sales_by_category: salesByCategory,
          top_products: topProducts,
          sales_trend: trendData
        }
      };
    }

    // --- CLIENTS API ---
    else if (pathname.includes('clients.php')) {
      const clients = getCollection(KEYS.CLIENTS);
      const appointments = getCollection(KEYS.APPOINTMENTS);
      const sales = getCollection(KEYS.SALES);

      if (action === 'list') {
        const search = (searchParams.get('search') || '').toLowerCase().trim();
        let filtered = clients;
        if (search) {
          filtered = filtered.filter(c => 
            (c.name || '').toLowerCase().includes(search) || 
            (c.phone || '').includes(search) || 
            (c.email || '').toLowerCase().includes(search)
          );
        }

        const data = filtered.map(c => {
          const clientApps = appointments.filter(a => parseInt(a.client_id, 10) === parseInt(c.id, 10));
          const clientSales = sales.filter(s => parseInt(s.client_id, 10) === parseInt(c.id, 10));
          const totalSpent = clientSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
          const lastVisit = clientApps.length > 0 
            ? clientApps.map(a => a.appointment_date).sort().reverse()[0] 
            : null;

          return {
            ...c,
            total_appointments: clientApps.length,
            total_spent: totalSpent,
            last_visit: lastVisit
          };
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        responseData = { success: true, data };
      } else if (action === 'get') {
        const id = parseInt(searchParams.get('id'), 10);
        const client = clients.find(c => c.id === id);
        if (!client) {
          statusCode = 404;
          responseData = { success: false, error: 'Cliente no encontrado' };
        } else {
          const services = getCollection(KEYS.SERVICES);
          const clientApps = appointments
            .filter(a => parseInt(a.client_id, 10) === id)
            .map(a => {
              const s = services.find(sv => sv.id === parseInt(a.service_id, 10)) || {};
              return { ...a, service_name: s.name || 'Servicio', service_price: s.price || 0 };
            })
            .sort((a, b) => (b.appointment_date || '').localeCompare(a.appointment_date || ''))
            .slice(0, 10);

          const clientSales = sales
            .filter(s => parseInt(s.client_id, 10) === id)
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .slice(0, 10);

          responseData = {
            success: true,
            data: { ...client, appointments: clientApps, sales: clientSales }
          };
        }
      } else if (action === 'create') {
        const name = (body.name || '').trim();
        const phone = (body.phone || '').trim();
        if (!name || !phone) {
          statusCode = 400;
          responseData = { success: false, error: 'El nombre y teléfono son obligatorios' };
        } else {
          const newId = getNextId(clients);
          const newClient = {
            id: newId,
            name,
            phone,
            email: (body.email || '').trim(),
            notes: (body.notes || '').trim(),
            created_at: formatNow()
          };
          clients.push(newClient);
          saveCollection(KEYS.CLIENTS, clients);
          responseData = { success: true, message: 'Cliente registrado con éxito', id: newId };
        }
      } else if (action === 'update') {
        const id = parseInt(body.id, 10);
        const idx = clients.findIndex(c => c.id === id);
        if (idx === -1) {
          statusCode = 404;
          responseData = { success: false, error: 'Cliente no encontrado' };
        } else {
          clients[idx].name = (body.name || clients[idx].name).trim();
          clients[idx].phone = (body.phone || clients[idx].phone).trim();
          clients[idx].email = (body.email || '').trim();
          clients[idx].notes = (body.notes || '').trim();
          saveCollection(KEYS.CLIENTS, clients);
          responseData = { success: true, message: 'Cliente actualizado correctamente' };
        }
      } else if (action === 'delete') {
        const id = parseInt(body.id, 10);
        const filtered = clients.filter(c => c.id !== id);
        saveCollection(KEYS.CLIENTS, filtered);
        responseData = { success: true, message: 'Cliente eliminado' };
      }
    }

    // --- SERVICES API ---
    else if (pathname.includes('services.php')) {
      const services = getCollection(KEYS.SERVICES);

      if (action === 'list') {
        const activeOnly = searchParams.get('active') === '1';
        let filtered = services;
        if (activeOnly) {
          filtered = filtered.filter(s => s.active !== 0);
        }
        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        responseData = { success: true, data: filtered };
      } else if (action === 'create') {
        const name = (body.name || '').trim();
        const price = parseFloat(body.price) || 0;
        if (!name || price <= 0) {
          statusCode = 400;
          responseData = { success: false, error: 'Nombre y precio válido son requeridos' };
        } else {
          const newId = getNextId(services);
          const newService = {
            id: newId,
            name,
            category: (body.category || 'Corte').trim(),
            price,
            duration: parseInt(body.duration, 10) || 30,
            description: (body.description || '').trim(),
            active: 1,
            created_at: formatNow()
          };
          services.push(newService);
          saveCollection(KEYS.SERVICES, services);
          responseData = { success: true, message: 'Servicio creado exitosamente', id: newId };
        }
      } else if (action === 'update') {
        const id = parseInt(body.id, 10);
        const idx = services.findIndex(s => s.id === id);
        if (idx === -1) {
          statusCode = 404;
          responseData = { success: false, error: 'Servicio no encontrado' };
        } else {
          services[idx].name = (body.name || services[idx].name).trim();
          services[idx].category = (body.category || services[idx].category).trim();
          services[idx].price = parseFloat(body.price) || services[idx].price;
          services[idx].duration = parseInt(body.duration, 10) || services[idx].duration;
          services[idx].description = (body.description || '').trim();
          if (body.active !== undefined) services[idx].active = parseInt(body.active, 10);
          saveCollection(KEYS.SERVICES, services);
          responseData = { success: true, message: 'Servicio actualizado' };
        }
      } else if (action === 'delete') {
        const id = parseInt(body.id, 10);
        const appointments = getCollection(KEYS.APPOINTMENTS);
        const hasAppointments = appointments.some(a => parseInt(a.service_id, 10) === id);
        if (hasAppointments) {
          const idx = services.findIndex(s => s.id === id);
          if (idx !== -1) services[idx].active = 0;
          saveCollection(KEYS.SERVICES, services);
          responseData = { success: true, message: 'El servicio fue desactivado porque tiene citas asociadas' };
        } else {
          const filtered = services.filter(s => s.id !== id);
          saveCollection(KEYS.SERVICES, filtered);
          responseData = { success: true, message: 'Servicio eliminado' };
        }
      }
    }

    // --- PRODUCTS API ---
    else if (pathname.includes('products.php')) {
      const products = getCollection(KEYS.PRODUCTS);

      if (action === 'list') {
        const category = searchParams.get('category') || '';
        const search = (searchParams.get('search') || '').toLowerCase().trim();
        const lowStock = searchParams.get('low_stock') === '1';

        let filtered = products.filter(p => p.active !== 0);
        if (category && category !== 'all') {
          filtered = filtered.filter(p => p.category === category);
        }
        if (search) {
          filtered = filtered.filter(p => 
            (p.name || '').toLowerCase().includes(search) || 
            (p.brand || '').toLowerCase().includes(search)
          );
        }
        if (lowStock) {
          filtered = filtered.filter(p => parseInt(p.stock, 10) <= parseInt(p.min_stock, 10));
        }

        // Category counts
        const catMap = {};
        products.filter(p => p.active !== 0).forEach(p => {
          const c = p.category || 'otro';
          if (!catMap[c]) catMap[c] = { category: c, count: 0, total_stock: 0 };
          catMap[c].count += 1;
          catMap[c].total_stock += (parseInt(p.stock, 10) || 0);
        });

        responseData = {
          success: true,
          data: filtered,
          category_counts: Object.values(catMap)
        };
      } else if (action === 'get') {
        const id = parseInt(searchParams.get('id'), 10);
        const product = products.find(p => p.id === id);
        if (!product) {
          statusCode = 404;
          responseData = { success: false, error: 'Producto no encontrado' };
        } else {
          responseData = { success: true, data: product };
        }
      } else if (action === 'create') {
        const name = (body.name || '').trim();
        const salePrice = parseFloat(body.sale_price) || 0;
        if (!name || salePrice <= 0) {
          statusCode = 400;
          responseData = { success: false, error: 'Nombre y precio de venta son requeridos' };
        } else {
          const newId = getNextId(products);
          const newProd = {
            id: newId,
            name,
            category: body.category || 'decant',
            brand: (body.brand || '').trim(),
            size_volume: (body.size_volume || '').trim(),
            cost_price: parseFloat(body.cost_price) || 0,
            sale_price: salePrice,
            stock: parseInt(body.stock, 10) || 0,
            min_stock: parseInt(body.min_stock, 10) || 3,
            active: 1,
            created_at: formatNow()
          };
          products.push(newProd);
          saveCollection(KEYS.PRODUCTS, products);
          responseData = { success: true, message: 'Producto agregado al inventario', id: newId };
        }
      } else if (action === 'update') {
        const id = parseInt(body.id, 10);
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) {
          statusCode = 404;
          responseData = { success: false, error: 'Producto no encontrado' };
        } else {
          products[idx].name = (body.name || products[idx].name).trim();
          products[idx].category = body.category || products[idx].category;
          products[idx].brand = (body.brand || '').trim();
          products[idx].size_volume = (body.size_volume || '').trim();
          products[idx].cost_price = parseFloat(body.cost_price) || 0;
          products[idx].sale_price = parseFloat(body.sale_price) || 0;
          products[idx].stock = parseInt(body.stock, 10) || 0;
          products[idx].min_stock = parseInt(body.min_stock, 10) || 3;
          saveCollection(KEYS.PRODUCTS, products);
          responseData = { success: true, message: 'Producto actualizado correctamente' };
        }
      } else if (action === 'adjust_stock') {
        const id = parseInt(body.id, 10);
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) {
          statusCode = 404;
          responseData = { success: false, error: 'Producto no encontrado' };
        } else {
          const type = body.type || 'delta';
          if (type === 'absolute') {
            products[idx].stock = Math.max(0, parseInt(body.new_stock, 10) || 0);
          } else {
            const adj = parseInt(body.adjustment, 10) || 0;
            products[idx].stock = Math.max(0, (parseInt(products[idx].stock, 10) || 0) + adj);
          }
          saveCollection(KEYS.PRODUCTS, products);
          responseData = {
            success: true,
            message: 'Stock actualizado',
            current_stock: products[idx].stock
          };
        }
      } else if (action === 'delete') {
        const id = parseInt(body.id, 10);
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) {
          products[idx].active = 0;
          saveCollection(KEYS.PRODUCTS, products);
        }
        responseData = { success: true, message: 'Producto eliminado del catálogo' };
      }
    }

    // --- APPOINTMENTS API ---
    else if (pathname.includes('appointments.php')) {
      const appointments = getCollection(KEYS.APPOINTMENTS);
      const clients = getCollection(KEYS.CLIENTS);
      const services = getCollection(KEYS.SERVICES);

      if (action === 'list') {
        const date = searchParams.get('date') || '';
        const startDate = searchParams.get('start_date') || '';
        const endDate = searchParams.get('end_date') || '';
        const status = searchParams.get('status') || '';
        const clientId = parseInt(searchParams.get('client_id'), 10) || 0;

        let filtered = appointments;
        if (date) {
          filtered = filtered.filter(a => a.appointment_date === date);
        } else if (startDate && endDate) {
          filtered = filtered.filter(a => a.appointment_date >= startDate && a.appointment_date <= endDate);
        }

        if (status && status !== 'all') {
          filtered = filtered.filter(a => a.status === status);
        }

        if (clientId > 0) {
          filtered = filtered.filter(a => parseInt(a.client_id, 10) === clientId);
        }

        const enriched = filtered.map(a => {
          const c = clients.find(cl => cl.id === parseInt(a.client_id, 10)) || {};
          const s = services.find(sv => sv.id === parseInt(a.service_id, 10)) || {};
          return {
            ...a,
            client_name: c.name || 'Cliente',
            client_phone: c.phone || '',
            client_email: c.email || '',
            service_name: s.name || 'Servicio',
            service_price: s.price || 0,
            service_duration: s.duration || 30,
            service_category: s.category || 'Corte'
          };
        }).sort((x, y) => {
          const dComp = (x.appointment_date || '').localeCompare(y.appointment_date || '');
          if (dComp !== 0) return dComp;
          return (x.appointment_time || '').localeCompare(y.appointment_time || '');
        });

        responseData = { success: true, data: enriched };
      } else if (action === 'get') {
        const id = parseInt(searchParams.get('id'), 10);
        const a = appointments.find(ap => ap.id === id);
        if (!a) {
          statusCode = 404;
          responseData = { success: false, error: 'Reserva no encontrada' };
        } else {
          const c = clients.find(cl => cl.id === parseInt(a.client_id, 10)) || {};
          const s = services.find(sv => sv.id === parseInt(a.service_id, 10)) || {};
          responseData = {
            success: true,
            data: {
              ...a,
              client_name: c.name || '',
              client_phone: c.phone || '',
              client_email: c.email || '',
              service_name: s.name || '',
              service_price: s.price || 0,
              service_duration: s.duration || 30
            }
          };
        }
      } else if (action === 'create') {
        const clientId = parseInt(body.client_id, 10);
        let serviceId = parseInt(body.service_id, 10);
        if (!serviceId || serviceId <= 0) {
          serviceId = services.length > 0 ? services[0].id : 1;
        }
        const date = (body.appointment_date || formatToday()).trim();
        const time = (body.appointment_time || '12:00').trim();

        if (!clientId || !date || !time) {
          statusCode = 400;
          responseData = { success: false, error: 'Cliente, fecha y hora son obligatorios' };
        } else {
          const newId = getNextId(appointments);
          const newApp = {
            id: newId,
            client_id: clientId,
            service_id: serviceId,
            barber_name: (body.barber_name || 'Principal').trim(),
            appointment_date: date,
            appointment_time: time,
            status: body.status || 'Confirmada',
            notes: (body.notes || '').trim(),
            created_at: formatNow()
          };
          appointments.push(newApp);
          saveCollection(KEYS.APPOINTMENTS, appointments);
          responseData = { success: true, message: 'Turno agendado con éxito', id: newId };
        }
      } else if (action === 'update_status') {
        const id = parseInt(body.id, 10);
        const status = (body.status || '').trim();
        const idx = appointments.findIndex(a => a.id === id);
        if (idx === -1) {
          statusCode = 404;
          responseData = { success: false, error: 'Turno no encontrado' };
        } else {
          appointments[idx].status = status;
          saveCollection(KEYS.APPOINTMENTS, appointments);
          responseData = { success: true, message: `Estado actualizado a ${status}` };
        }
      } else if (action === 'delete') {
        const id = parseInt(body.id, 10);
        const filtered = appointments.filter(a => a.id !== id);
        saveCollection(KEYS.APPOINTMENTS, filtered);
        responseData = { success: true, message: 'Turno eliminado' };
      }
    }

    // --- SALES API ---
    else if (pathname.includes('sales.php')) {
      const sales = getCollection(KEYS.SALES);
      const saleItems = getCollection(KEYS.SALE_ITEMS);
      const clients = getCollection(KEYS.CLIENTS);
      const products = getCollection(KEYS.PRODUCTS);
      const appointments = getCollection(KEYS.APPOINTMENTS);

      if (action === 'list') {
        const startDate = searchParams.get('start_date') || '';
        const endDate = searchParams.get('end_date') || '';
        const paymentMethod = searchParams.get('payment_method') || '';
        const search = (searchParams.get('search') || '').toLowerCase().trim();

        let filtered = sales;
        if (startDate && endDate) {
          filtered = filtered.filter(s => {
            const d = (s.created_at || '').substring(0, 10);
            return d >= startDate && d <= endDate;
          });
        }

        if (paymentMethod && paymentMethod !== 'all') {
          if (paymentMethod === 'Tarjeta' || paymentMethod === 'POS') {
            filtered = filtered.filter(s => (s.payment_method || '').includes('Tarjeta') || (s.payment_method || '').includes('POS'));
          } else {
            filtered = filtered.filter(s => s.payment_method === paymentMethod);
          }
        }

        if (search) {
          filtered = filtered.filter(s => {
            const c = clients.find(cl => cl.id === parseInt(s.client_id, 10));
            const cName = (c ? c.name : 'Cliente Ocasional').toLowerCase();
            const notes = (s.notes || '').toLowerCase();
            return cName.includes(search) || notes.includes(search);
          });
        }

        const data = filtered.map(s => {
          const c = clients.find(cl => cl.id === parseInt(s.client_id, 10));
          const itemsCount = saleItems.filter(si => si.sale_id === s.id).length;
          return {
            ...s,
            client_name: c ? c.name : 'Cliente Ocasional / Mostrador',
            client_phone: c ? c.phone : '',
            total_items: itemsCount
          };
        }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        // Breakdown calculation
        const breakdown = {
          'Efectivo': { total: 0, count: 0 },
          'Tarjeta': { total: 0, count: 0 },
          'Transferencia': { total: 0, count: 0 },
          total_all: 0,
          count_all: 0
        };

        filtered.forEach(s => {
          const m = s.payment_method || 'Efectivo';
          const tot = parseFloat(s.total) || 0;
          if (m.includes('Tarjeta') || m.includes('POS')) {
            breakdown['Tarjeta'].total += tot;
            breakdown['Tarjeta'].count += 1;
          } else if (m.includes('Transferencia')) {
            breakdown['Transferencia'].total += tot;
            breakdown['Transferencia'].count += 1;
          } else {
            breakdown['Efectivo'].total += tot;
            breakdown['Efectivo'].count += 1;
          }
          breakdown.total_all += tot;
          breakdown.count_all += 1;
        });

        responseData = { success: true, data, breakdown };
      } else if (action === 'get') {
        const id = parseInt(searchParams.get('id'), 10);
        const sale = sales.find(s => s.id === id);
        if (!sale) {
          statusCode = 404;
          responseData = { success: false, error: 'Venta no encontrada' };
        } else {
          const c = clients.find(cl => cl.id === parseInt(sale.client_id, 10));
          const items = saleItems.filter(si => si.sale_id === id);
          const settings = getCollection(KEYS.SETTINGS);
          responseData = {
            success: true,
            data: {
              ...sale,
              client_name: c ? c.name : 'Cliente Ocasional / Mostrador',
              client_phone: c ? c.phone : '',
              client_email: c ? c.email : '',
              items,
              settings
            }
          };
        }
      } else if (action === 'create') {
        const items = body.items || [];
        const total = parseFloat(body.total) || 0;
        if (items.length === 0 || total < 0) {
          statusCode = 400;
          responseData = { success: false, error: 'El carrito no puede estar vacío y el total debe ser válido' };
        } else {
          const saleId = getNextId(sales);
          const newSale = {
            id: saleId,
            client_id: body.client_id ? parseInt(body.client_id, 10) : null,
            appointment_id: body.appointment_id ? parseInt(body.appointment_id, 10) : null,
            subtotal: parseFloat(body.subtotal) || 0,
            discount: parseFloat(body.discount) || 0,
            total,
            payment_method: body.payment_method || 'Efectivo',
            amount_paid: parseFloat(body.amount_paid) || total,
            change_amount: parseFloat(body.change_amount) || 0,
            notes: (body.notes || '').trim(),
            created_at: formatNow()
          };
          sales.push(newSale);
          saveCollection(KEYS.SALES, sales);

          // Insert items & decrement stock
          let itemNextId = getNextId(saleItems);
          items.forEach(item => {
            const type = item.item_type || item.type || 'product';
            const itemId = item.item_id ? parseInt(item.item_id, 10) : (item.id ? parseInt(item.id, 10) : null);
            const itemName = item.item_name || item.name || 'Item';
            const qty = parseInt(item.quantity, 10) || 1;
            const unitPrice = parseFloat(item.unit_price || item.price || 0);
            const itemSubtotal = parseFloat(item.subtotal || (qty * unitPrice));

            saleItems.push({
              id: itemNextId++,
              sale_id: saleId,
              item_type: type,
              item_id: itemId,
              item_name: itemName,
              quantity: qty,
              unit_price: unitPrice,
              subtotal: itemSubtotal
            });

            // Decrement stock if product
            if (type === 'product' && itemId) {
              const pIdx = products.findIndex(p => p.id === itemId);
              if (pIdx !== -1) {
                products[pIdx].stock = Math.max(0, (parseInt(products[pIdx].stock, 10) || 0) - qty);
              }
            }
          });

          saveCollection(KEYS.SALE_ITEMS, saleItems);
          saveCollection(KEYS.PRODUCTS, products);

          // Update appointment status to Completada if attached
          if (newSale.appointment_id) {
            const aIdx = appointments.findIndex(a => a.id === newSale.appointment_id);
            if (aIdx !== -1) {
              appointments[aIdx].status = 'Completada';
              saveCollection(KEYS.APPOINTMENTS, appointments);
            }
          }

          responseData = {
            success: true,
            message: 'Cobro registrado con éxito',
            sale_id: saleId
          };
        }
      } else if (action === 'cancel') {
        const saleId = parseInt(body.id, 10);
        const sIdx = sales.findIndex(s => s.id === saleId);
        if (sIdx === -1) {
          statusCode = 404;
          responseData = { success: false, error: 'Venta no encontrada' };
        } else if (sales[sIdx].status === 'Cancelada') {
          statusCode = 400;
          responseData = { success: false, error: 'Esta venta ya se encuentra anulada' };
        } else {
          // Restore stock for products in this sale
          const items = saleItems.filter(si => si.sale_id === saleId && si.item_type === 'product' && si.item_id);
          items.forEach(it => {
            const pIdx = products.findIndex(p => p.id === it.item_id);
            if (pIdx !== -1) {
              products[pIdx].stock = (parseInt(products[pIdx].stock, 10) || 0) + (parseInt(it.quantity, 10) || 1);
            }
          });
          sales[sIdx].status = 'Cancelada';
          saveCollection(KEYS.PRODUCTS, products);
          saveCollection(KEYS.SALES, sales);

          // Reset appointment if tied
          if (sales[sIdx].appointment_id) {
            const aIdx = appointments.findIndex(a => a.id === sales[sIdx].appointment_id);
            if (aIdx !== -1) {
              appointments[aIdx].status = 'Confirmada';
              saveCollection(KEYS.APPOINTMENTS, appointments);
            }
          }

          responseData = {
            success: true,
            message: 'Venta anulada correctamente. Stock reintegrado al inventario.'
          };
        }
      } else if (action === 'daily_summary') {
        const today = searchParams.get('date') || formatToday();
        const salesToday = sales.filter(s => (s.created_at || '').startsWith(today) && s.status !== 'Cancelada');

        const summary = {
          date: today,
          cash: 0,
          card: 0,
          transfer: 0,
          total: 0,
          count: salesToday.length
        };

        salesToday.forEach(s => {
          const m = s.payment_method || 'Efectivo';
          const tot = parseFloat(s.total) || 0;
          if (m.includes('Tarjeta') || m.includes('POS')) {
            summary.card += tot;
          } else if (m.includes('Transferencia')) {
            summary.transfer += tot;
          } else {
            summary.cash += tot;
          }
          summary.total += tot;
        });

        const closings = getCollection(KEYS.CASH_CLOSINGS);
        const lastClosing = closings.find(c => c.closing_date === today) || null;

        responseData = {
          success: true,
          data: summary,
          last_closing: lastClosing
        };
      } else if (action === 'close_register') {
        const closings = getCollection(KEYS.CASH_CLOSINGS);
        const closingDate = body.closing_date || formatToday();
        const initialCash = parseFloat(body.initial_cash) || 0;
        const cashSales = parseFloat(body.cash_sales) || 0;
        const cardSales = parseFloat(body.card_sales) || 0;
        const transferSales = parseFloat(body.transfer_sales) || 0;
        const totalSales = parseFloat(body.total_sales) || (cashSales + cardSales + transferSales);
        const expectedCash = parseFloat(body.expected_cash) || (initialCash + cashSales);
        const actualCash = parseFloat(body.actual_cash) || expectedCash;
        const difference = actualCash - expectedCash;

        const newClosing = {
          id: getNextId(closings),
          closing_date: closingDate,
          initial_cash: initialCash,
          cash_sales: cashSales,
          card_sales: cardSales,
          transfer_sales: transferSales,
          total_sales: totalSales,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          difference: difference,
          notes: body.notes || '',
          closed_by: body.closed_by || 'Administrador',
          created_at: formatNow()
        };

        closings.unshift(newClosing);
        saveCollection(KEYS.CASH_CLOSINGS, closings);

        responseData = {
          success: true,
          message: 'Cierre de caja guardado exitosamente',
          id: newClosing.id,
          difference: difference
        };
      } else if (action === 'closings_list') {
        const closings = getCollection(KEYS.CASH_CLOSINGS);
        responseData = { success: true, data: closings.slice(0, 30) };
      }
    }
    // --- SETTINGS API ---
    else if (pathname.includes('settings.php')) {
      let currentSettings = getCollection(KEYS.SETTINGS);
      if (!currentSettings || Array.isArray(currentSettings) || Object.keys(currentSettings).length === 0) {
        currentSettings = {
          business_name: 'MF Barber & Lounge',
          business_phone: '+595 993 554920',
          business_address: 'Local Central',
          ticket_footer: '¡Muchas gracias por su preferencia y compra! 💈✂️',
          currency_code: 'PYG',
          currency_symbol: '₲',
          exchange_rate: '7500'
        };
        saveCollection(KEYS.SETTINGS, currentSettings);
      }

      if (action === 'get') {
        responseData = { success: true, data: currentSettings };
      } else if (action === 'update') {
        const merged = { ...currentSettings, ...body };
        saveCollection(KEYS.SETTINGS, merged);
        responseData = { success: true, message: 'Configuración actualizada exitosamente' };
      }
    }

    // Return a real Response object
    return new Response(JSON.stringify(responseData), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }

  // Determine whether to intercept fetch
  const isFileProtocol = window.location.protocol === 'file:';
  const isForcedOffline = localStorage.getItem('barber_force_offline') === 'true';

  // Transparently intercept window.fetch for offline operations
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    const url = (typeof resource === 'string') ? resource : (resource ? resource.url : '');
    
    // Check if target is an API endpoint
    const isApiCall = url.includes('api/') && (
      url.includes('.php') || 
      url.includes('dashboard') || 
      url.includes('appointments') || 
      url.includes('clients') || 
      url.includes('products') || 
      url.includes('services') || 
      url.includes('sales') ||
      url.includes('settings') ||
      url.includes('sync')
    );

    if (isApiCall && (isFileProtocol || isForcedOffline || !navigator.onLine)) {
      try {
        return await handleOfflineApi(url, init);
      } catch (err) {
        console.error('[BarberApp Offline] Error handling simulated API:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Attempt network fetch with offline fallback
    try {
      return await originalFetch.apply(this, arguments);
    } catch (networkError) {
      if (isApiCall) {
        console.warn('[BarberApp Offline] Servidor no disponible, usando base de datos offline local:', networkError);
        return await handleOfflineApi(url, init);
      }
      throw networkError;
    }
  };

  // Expose Offline Manager on window
  window.BarberOffline = {
    KEYS,
    seed: seedDatabaseIfEmpty,
    getCollection,
    saveCollection,
    isOffline: () => isFileProtocol || isForcedOffline || !navigator.onLine
  };

  // Run seed immediately
  seedDatabaseIfEmpty();
  console.log('[BarberApp] Motor de base de datos local activado.');
})();
