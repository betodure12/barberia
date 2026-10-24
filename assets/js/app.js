const App = {
  currentView: 'appointments',
  historyStack: ['appointments'],
  currency: localStorage.getItem('barber_currency') || 'PYG',
  exchangeRate: parseFloat(localStorage.getItem('barber_exchange_rate')) || 7500,

  init() {
    this.setupNavigation();
    this.setupClock();
    this.setupMobileMenu();
    this.setupGlobalEvents();
    this.updateCurrencyUI();
    
    // Check and show offline autonomous badge if active
    if (window.BarberOffline && window.BarberOffline.isOffline()) {
      const badge = document.getElementById('app-mode-badge');
      if (badge) badge.style.display = 'inline-flex';
    }

    // Load initial view (appointments / turnos de hoy)
    this.navigate('appointments', false);
  },

  setCurrency(cur) {
    this.currency = cur;
    localStorage.setItem('barber_currency', cur);
    this.updateCurrencyUI();
    this.refreshCurrentView();
    const name = cur === 'PYG' ? 'Guaraníes (₲ Gs.)' : 'Dólares ($ USD)';
    this.toast(`Moneda actual: ${name}`, 'info');
  },

  setExchangeRate(rate) {
    const val = parseFloat(rate);
    if (!val || val <= 0) {
      this.toast('Cotización inválida', 'error');
      return;
    }
    this.exchangeRate = val;
    localStorage.setItem('barber_exchange_rate', val);
    this.updateCurrencyUI();
    this.refreshCurrentView();
    this.toast(`Cotización guardada: 1 USD = ₲ ${val.toLocaleString('es-PY')}`, 'success');
    this.closeModal('modal-exchange-rate');
  },

  updateCurrencyUI() {
    const btnPyg = document.getElementById('btn-cur-pyg');
    const btnUsd = document.getElementById('btn-cur-usd');
    const labelRate = document.getElementById('sidebar-exchange-rate-text');
    const inputRate = document.getElementById('modal-rate-input');

    if (btnPyg) btnPyg.classList.toggle('active', this.currency === 'PYG');
    if (btnUsd) btnUsd.classList.toggle('active', this.currency === 'USD');
    if (labelRate) labelRate.textContent = `1 USD = ₲ ${this.exchangeRate.toLocaleString('es-PY')}`;
    if (inputRate) inputRate.value = this.exchangeRate;
  },

  openExchangeRateModal() {
    const inputRate = document.getElementById('modal-rate-input');
    if (inputRate) inputRate.value = this.exchangeRate;
    this.updateRatePreview();
    this.openModal('modal-exchange-rate');
  },

  updateRatePreview() {
    const inputRate = document.getElementById('modal-rate-input');
    const previewEl = document.getElementById('rate-preview-calc');
    if (!inputRate || !previewEl) return;

    const rate = parseFloat(inputRate.value) || this.exchangeRate;
    previewEl.innerHTML = `
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.6;">
        <div>• <strong>₲ 50.000</strong> ≈ <strong style="color: var(--gold-light);">$ ${(50000 / rate).toFixed(2)} USD</strong></div>
        <div>• <strong>₲ 100.000</strong> ≈ <strong style="color: var(--gold-light);">$ ${(100000 / rate).toFixed(2)} USD</strong></div>
        <div>• <strong>$ 10 USD</strong> ≈ <strong style="color: var(--gold-light);">₲ ${(10 * rate).toLocaleString('es-PY')}</strong></div>
      </div>
    `;
  },

  formatMoney(amount, targetCur = null) {
    const num = parseFloat(amount) || 0;
    const cur = targetCur || this.currency || 'PYG';
    const rate = this.exchangeRate || 7500;

    if (cur === 'USD') {
      const usd = num / rate;
      return '$ ' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return '₲ ' + Math.round(num).toLocaleString('es-PY');
    }
  },

  formatDual(amount) {
    const num = parseFloat(amount) || 0;
    const cur = this.currency || 'PYG';
    const rate = this.exchangeRate || 7500;

    if (cur === 'PYG') {
      const usd = num / rate;
      return `₲ ${Math.round(num).toLocaleString('es-PY')} <span class="dual-currency">(≈ $ ${usd.toFixed(2)})</span>`;
    } else {
      const usd = num / rate;
      return `$ ${usd.toFixed(2)} <span class="dual-currency">(≈ ₲ ${Math.round(num).toLocaleString('es-PY')})</span>`;
    }
  },

  refreshCurrentView() {
    const viewName = this.currentView;
    try {
      if (viewName === 'dashboard' && typeof Dashboard !== 'undefined') Dashboard.load();
      if (viewName === 'appointments' && typeof Appointments !== 'undefined') Appointments.fetchAppointments();
      if (viewName === 'clients' && typeof Clients !== 'undefined') Clients.renderClients();
      if (viewName === 'services' && typeof Services !== 'undefined') Services.renderServices();
      if (viewName === 'inventory' && typeof Inventory !== 'undefined') Inventory.renderProducts();
      if (viewName === 'pos' && typeof POS !== 'undefined') {
        POS.renderCatalog();
        POS.renderCart();
      }
      if (viewName === 'sales' && typeof Sales !== 'undefined') {
        Sales.renderBreakdown();
        Sales.renderSales();
      }
    } catch (e) {
      console.error('Error refreshing view on currency change:', e);
    }
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item, .mobile-nav-btn').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          this.navigate(targetView);
          // Close mobile menu if open
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) sidebar.classList.remove('open');
        }
      });
    });

    // Back button in topbar
    const backBtn = document.getElementById('btn-topbar-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.goBack();
      });
    }
  },

  navigate(viewName, addToHistory = true) {
    if (addToHistory && this.currentView !== viewName) {
      this.historyStack.push(viewName);
    }
    this.currentView = viewName;

    // Update Back button visibility & Hamburger menu
    const backBtn = document.getElementById('btn-topbar-back');
    const menuBtn = document.getElementById('btn-mobile-menu');
    const isMobile = window.innerWidth <= 768;
    const isRoot = (viewName === 'appointments');

    if (backBtn) {
      if (isRoot) {
        backBtn.style.display = 'none';
        if (menuBtn) menuBtn.style.display = 'inline-flex';
      } else {
        backBtn.style.display = 'inline-flex';
        // Hide hamburger menu in subviews on mobile to give full width to title
        if (menuBtn && isMobile) menuBtn.style.display = 'none';
      }
    }

    // Update active nav items (sidebar + bottom nav)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });
    document.querySelectorAll('.mobile-nav-btn').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Hide all view sections, show target
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update Page Header (concise for mobile screens)
    const titles = {
      appointments: { title: isMobile ? 'Turnos' : 'Agenda de Turnos', subtitle: 'Turnos del día, reservas y atención directa' },
      pos: { title: isMobile ? 'Venta Rápida (Caja)' : 'Venta Rápida & Caja (POS)', subtitle: 'Cobro de cortes, perfumes decants, bebidas y tickets' },
      clients: { title: isMobile ? 'Clientes' : 'Directorio de Clientes', subtitle: 'Base de clientes, ficha de estilo y cobro directo' },
      inventory: { title: isMobile ? 'Stock' : 'Stock & Inventario', subtitle: 'Perfumes decants fraccionados, botellas y bebidas' },
      sales: { title: isMobile ? 'Reportes' : 'Reportes & Recaudación', subtitle: 'Resumen de ingresos del día, desglose y comprobantes' },
      services: { title: isMobile ? 'Cortes & Tarifas' : 'Cortes & Servicios', subtitle: 'Catálogo de cortes de cabello, barba y tarifas' },
      dashboard: { title: isMobile ? 'Panel General' : 'Panel de Control', subtitle: 'Resumen general y estadísticas de la barbería' }
    };

    if (titles[viewName]) {
      const pageTitleEl = document.getElementById('page-title');
      const pageSubEl = document.getElementById('page-subtitle');
      if (pageTitleEl) pageTitleEl.textContent = titles[viewName].title;
      if (pageSubEl) pageSubEl.textContent = titles[viewName].subtitle;
    }

    // Trigger module loaders safely
    try {
      if (viewName === 'dashboard' && typeof Dashboard !== 'undefined') Dashboard.load();
      if (viewName === 'appointments' && typeof Appointments !== 'undefined') Appointments.load();
      if (viewName === 'clients' && typeof Clients !== 'undefined') Clients.load();
      if (viewName === 'services' && typeof Services !== 'undefined') Services.load();
      if (viewName === 'inventory' && typeof Inventory !== 'undefined') Inventory.load();
      if (viewName === 'pos' && typeof POS !== 'undefined') POS.load();
      if (viewName === 'sales' && typeof Sales !== 'undefined') Sales.load();
    } catch (err) {
      console.error(`Error loading view ${viewName}:`, err);
    }
  },

  goBack() {
    if (this.historyStack.length > 1) {
      this.historyStack.pop(); // remove current view
      const prevView = this.historyStack.pop(); // get previous view
      this.navigate(prevView || 'appointments', true);
    } else {
      this.navigate('appointments', false);
    }
  },

  setupClock() {
    const clockEl = document.getElementById('live-time');
    const updateTime = () => {
      const now = new Date();
      const options = { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      if (clockEl) {
        clockEl.textContent = now.toLocaleDateString('es-ES', options).toUpperCase();
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  setupMobileMenu() {
    const toggleBtn = document.getElementById('btn-mobile-menu');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    const openSidebar = () => {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('visible');
    };
    const closeSidebar = () => {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
    };

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
      });
    }

    // Close sidebar when any nav item is tapped (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) closeSidebar();
      });
    });
  },

  setupGlobalEvents() {
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // Close button in modals
    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) this.closeModal(modal.id);
      });
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'bi-info-circle';
    if (type === 'success') icon = 'bi-check-circle-fill text-emerald';
    if (type === 'error') icon = 'bi-exclamation-triangle-fill text-rose';

    toast.innerHTML = `
      <i class="bi ${icon}" style="font-size: 1.2rem;"></i>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  cleanPhoneForWhatsApp(phone) {
    if (!phone) return '';
    let clean = phone.toString().replace(/[^0-9]/g, '');

    // Handle leading 00 international prefix (e.g. 00595...)
    if (clean.startsWith('00')) {
      clean = clean.substring(2);
    }

    // If starts with 5950 (country code + local 0), remove the 0
    if (clean.startsWith('5950')) {
      clean = '595' + clean.substring(4);
    }

    // If already has Paraguay country code (5959XXXXXXXX)
    if (clean.startsWith('595') && clean.length >= 11) {
      return clean;
    }

    // If has international country code with standard length (e.g. Argentina 549..., Brazil 55..., etc.)
    if ((clean.startsWith('54') || clean.startsWith('55') || clean.startsWith('1')) && clean.length >= 11) {
      return clean;
    }

    // Paraguay Local Mobile with leading 0: e.g. 0993554920 (10 digits starting with 09)
    if (clean.startsWith('09') && clean.length === 10) {
      return '595' + clean.substring(1); // 595993554920
    }

    // Paraguay Local Mobile without leading 0: e.g. 993554920 (9 digits starting with 9)
    if (clean.startsWith('9') && clean.length === 9) {
      return '595' + clean; // 595993554920
    }

    // Any other number starting with 0 (strip leading 0 and add 595 for Paraguay)
    if (clean.startsWith('0')) {
      const withoutZero = clean.substring(1);
      return '595' + withoutZero;
    }

    // If 9 digits, add 595
    if (clean.length === 9) {
      return '595' + clean;
    }

    return clean;
  },

  sendWhatsApp(phone, message) {
    if (!phone) {
      this.toast('El cliente no tiene teléfono registrado', 'error');
      return;
    }
    const cleanPhone = this.cleanPhoneForWhatsApp(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      this.toast('Número de teléfono incompleto o inválido', 'error');
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  },

  async openSettingsModal() {
    try {
      const res = await fetch('api/settings.php?action=get');
      const json = await res.json();
      if (json.success && json.data) {
        const s = json.data;
        const nameInput = document.getElementById('setting-business-name');
        const phoneInput = document.getElementById('setting-business-phone');
        const addressInput = document.getElementById('setting-business-address');
        const footerInput = document.getElementById('setting-ticket-footer');
        const rateInput = document.getElementById('setting-exchange-rate');

        if (nameInput) nameInput.value = s.business_name || '';
        if (phoneInput) phoneInput.value = s.business_phone || '';
        if (addressInput) addressInput.value = s.business_address || '';
        if (footerInput) footerInput.value = s.ticket_footer || '';
        if (rateInput) rateInput.value = s.exchange_rate || this.exchangeRate || 7500;

        this.openModal('modal-settings');
      } else {
        this.toast('Error al consultar configuración', 'error');
      }
    } catch (e) {
      this.toast('Error al abrir configuración', 'error');
    }
  },

  async saveSettings(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('setting-business-name')?.value.trim();
    const phone = document.getElementById('setting-business-phone')?.value.trim();
    const address = document.getElementById('setting-business-address')?.value.trim();
    const footer = document.getElementById('setting-ticket-footer')?.value.trim();
    const rate = document.getElementById('setting-exchange-rate')?.value.trim();

    if (!name) {
      this.toast('El nombre del negocio es obligatorio', 'error');
      return;
    }

    try {
      const res = await fetch('api/settings.php?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: name,
          business_phone: phone,
          business_address: address,
          ticket_footer: footer,
          exchange_rate: rate,
          currency_code: 'PYG',
          currency_symbol: '₲'
        })
      });
      const json = await res.json();
      if (json.success) {
        if (rate && parseFloat(rate) > 0) {
          this.setExchangeRate(parseFloat(rate));
        }
        this.toast('Configuración guardada exitosamente', 'success');
        this.closeModal('modal-settings');
      } else {
        this.toast(json.error || 'Error al guardar configuración', 'error');
      }
    } catch (err) {
      this.toast('Error de conexión al guardar configuración', 'error');
    }
  },

  async syncOfflineData() {
    if (!window.BarberOffline) {
      this.toast('Motor offline no disponible', 'info');
      return;
    }

    const clients = BarberOffline.getCollection(BarberOffline.KEYS.CLIENTS);
    const services = BarberOffline.getCollection(BarberOffline.KEYS.SERVICES);
    const products = BarberOffline.getCollection(BarberOffline.KEYS.PRODUCTS);
    const appointments = BarberOffline.getCollection(BarberOffline.KEYS.APPOINTMENTS);
    const sales = BarberOffline.getCollection(BarberOffline.KEYS.SALES);
    const saleItems = BarberOffline.getCollection(BarberOffline.KEYS.SALE_ITEMS);

    if (sales.length === 0 && appointments.length === 0 && clients.length === 0) {
      this.toast('No hay datos pendientes para sincronizar', 'info');
      return;
    }

    this.toast('Sincronizando datos con el servidor...', 'info');

    try {
      const res = await fetch('api/sync.php?action=import_offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients,
          services,
          products,
          appointments,
          sales,
          sale_items: saleItems
        })
      });
      const json = await res.json();
      if (json.success && json.imported) {
        const imp = json.imported;
        this.toast(`¡Sincronizado! ${imp.clients} clientes, ${imp.appointments} turnos, ${imp.sales} ventas subidas al servidor`, 'success');
        this.refreshCurrentView();
      } else {
        this.toast(json.error || 'Error al sincronizar con el servidor', 'error');
      }
    } catch (err) {
      this.toast('No se pudo conectar al servidor para sincronizar', 'error');
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
