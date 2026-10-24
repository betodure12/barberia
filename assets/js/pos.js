/**
 * BarberApp Pro - Point of Sale (POS) & Checkout Controller
 */

const POS = {
  cart: [],
  services: [],
  products: [],
  clients: [],
  currentTab: 'all',
  activeAppointmentId: null,
  searchTerm: '',

  async load() {
    this.setupEvents();
    await Promise.all([this.loadCatalog(), this.loadClients()]);
  },

  setupEvents() {
    // POS category tabs
    document.querySelectorAll('.pos-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pos-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.getAttribute('data-tab');
        this.renderCatalog();
      });
    });

    // Search input - debounced for mid-range phone performance
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      let searchDebounce;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          this.searchTerm = e.target.value.toLowerCase();
          this.renderCatalog();
        }, 200);
      });
    }

    // Payment method switch
    const payMethodSelect = document.getElementById('pos-payment-method');
    if (payMethodSelect) {
      payMethodSelect.addEventListener('change', () => {
        const cashBox = document.getElementById('pos-cash-calculator-box');
        if (cashBox) {
          cashBox.style.display = (payMethodSelect.value === 'Efectivo') ? 'block' : 'none';
        }
      });
    }

    // Payment currency switch (Guaraníes vs USD)
    const payCurSelect = document.getElementById('pos-pay-currency');
    if (payCurSelect) {
      payCurSelect.addEventListener('change', () => this.calculateTotals());
    }

    // Amount paid input for change calculation
    const paidInput = document.getElementById('pos-amount-paid');
    if (paidInput) {
      paidInput.addEventListener('input', () => this.calculateTotals());
    }

    // Discount input
    const discountInput = document.getElementById('pos-discount-input');
    if (discountInput) {
      discountInput.addEventListener('input', () => this.calculateTotals());
    }
  },

  async loadCatalog() {
    try {
      const [resServices, resProducts] = await Promise.all([
        fetch('api/services.php?action=list&active=1'),
        fetch('api/products.php?action=list')
      ]);

      const jsonServ = await resServices.json();
      const jsonProd = await resProducts.json();

      if (jsonServ.success) this.services = jsonServ.data;
      if (jsonProd.success) this.products = jsonProd.data;

      this.renderCatalog();
    } catch (e) {
      console.error('Error loading POS catalog:', e);
    }
  },

  openQuickAddClient() {
    this.pendingSelectNewClient = true;
    if (typeof Clients !== 'undefined') {
      Clients.openNewModal();
    } else {
      App.openModal('modal-client');
    }
  },

  syncClientSelect(clientId) {
    const selectMain = document.getElementById('pos-client-select-main');
    const selectCart = document.getElementById('pos-client-select');
    if (selectMain) selectMain.value = clientId || '';
    if (selectCart) selectCart.value = clientId || '';
    
    if (clientId) {
      const client = this.clients.find(c => c.id == clientId);
      const name = client ? client.name : 'Cliente';
      App.toast(`Ticket asignado a: ${name}`, 'info');
    }
  },

  async loadClients(selectId = null) {
    try {
      const res = await fetch('api/clients.php?action=list');
      const json = await res.json();
      if (json.success) {
        this.clients = json.data;
        const optionsHtml = '<option value="">-- Venta Casual / Mostrador (Sin cliente) --</option>' +
          this.clients.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');

        const selectCart = document.getElementById('pos-client-select');
        const selectMain = document.getElementById('pos-client-select-main');

        const currentVal = selectId || this.selectedClientId || (selectCart ? selectCart.value : '') || (selectMain ? selectMain.value : '') || '';

        if (selectCart) {
          selectCart.innerHTML = optionsHtml;
          if (currentVal) selectCart.value = currentVal;
        }
        if (selectMain) {
          selectMain.innerHTML = optionsHtml;
          if (currentVal) selectMain.value = currentVal;
        }
        this.selectedClientId = null;
      }
    } catch (e) {
      console.error('Error loading clients in POS:', e);
    }
  },

  renderCatalog() {
    const container = document.getElementById('pos-catalog-grid');
    if (!container) return;

    let items = [];

    // 1. Services
    if (this.currentTab === 'all' || this.currentTab === 'services') {
      this.services.forEach(s => {
        items.push({
          type: 'service',
          id: s.id,
          name: s.name,
          category: s.category,
          price: s.price,
          extra: `${s.duration} min`,
          stock: null
        });
      });
    }

    // 2. Products
    if (this.currentTab === 'all' || this.currentTab !== 'services') {
      this.products.forEach(p => {
        if (this.currentTab === 'all' || this.currentTab === p.category) {
          items.push({
            type: 'product',
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.sale_price,
            extra: p.size_volume || p.brand,
            stock: p.stock
          });
        }
      });
    }

    // Filter by search
    if (this.searchTerm) {
      items = items.filter(it => 
        it.name.toLowerCase().includes(this.searchTerm) ||
        (it.extra && it.extra.toLowerCase().includes(this.searchTerm)) ||
        (it.category && it.category.toLowerCase().includes(this.searchTerm))
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="bi bi-search" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
          No hay artículos que coincidan con la búsqueda
        </div>
      `;
      return;
    }

    const catBadges = {
      service: { class: 'badge-gold', name: 'Corte', icon: 'bi-scissors' },
      decant: { class: 'category-badge-decant', name: 'Decant', icon: 'bi-droplet-half' },
      perfume: { class: 'category-badge-perfume', name: 'Perfume', icon: 'bi-gem' },
      alcohol: { class: 'category-badge-alcohol', name: 'Bebida', icon: 'bi-cup-straw' },
      no_alcohol: { class: 'category-badge-no_alcohol', name: 'Sin Alcohol', icon: 'bi-cup-hot' },
      otro: { class: 'badge-secondary', name: 'Otro', icon: 'bi-box' }
    };

    let html = '';
    items.forEach(it => {
      const isProduct = it.type === 'product';
      const isOut = isProduct && it.stock <= 0;
      const badgeInfo = catBadges[it.type === 'service' ? 'service' : (it.category || 'otro')] || catBadges.otro;

      let metaBadge = '';
      if (!isProduct) {
        metaBadge = `<span class="badge badge-gold" style="font-size: 0.72rem;"><i class="bi bi-clock"></i> ${it.extra}</span>`;
      } else if (it.stock <= 0) {
        metaBadge = `<span class="badge badge-rose" style="font-size: 0.72rem;"><i class="bi bi-x-circle"></i> Agotado</span>`;
      } else if (it.stock <= 3) {
        metaBadge = `<span class="badge badge-rose" style="font-size: 0.72rem;"><i class="bi bi-exclamation-triangle"></i> Stock: ${it.stock} un.</span>`;
      } else {
        metaBadge = `<span class="badge badge-emerald" style="font-size: 0.72rem;"><i class="bi bi-box-seam"></i> Stock: ${it.stock} un.</span>`;
      }

      html += `
        <div class="pos-item-card ${isOut ? 'disabled' : ''}" onclick="POS.addItemToCart('${it.type}', ${it.id}, '${encodeURIComponent(it.name)}', ${it.price}, ${it.stock})" title="Tocar para agregar al ticket">
          <div class="pos-item-top">
            <span class="badge ${badgeInfo.class}"><i class="bi ${badgeInfo.icon}"></i> ${badgeInfo.name}</span>
            ${metaBadge}
          </div>
          <div class="pos-item-body">
            <div class="item-name">${it.name}</div>
            ${it.extra && isProduct ? `<div class="item-meta"><i class="bi bi-tag"></i> ${it.extra}</div>` : ''}
          </div>
          <div class="pos-item-bottom">
            <div class="item-price">${App.formatMoney(it.price)}</div>
            <div class="pos-item-actions" onclick="event.stopPropagation()">
              <button type="button" class="btn btn-secondary btn-sm btn-icon" title="Editar" onclick="POS.openEditItem('${it.type}', ${it.id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button type="button" class="btn btn-danger btn-sm btn-icon" title="Eliminar" onclick="POS.deleteItem('${it.type}', ${it.id})">
                <i class="bi bi-trash"></i>
              </button>
              <button type="button" class="btn btn-gold btn-sm pos-add-btn" ${isOut ? 'disabled' : ''} onclick="POS.addItemToCart('${it.type}', ${it.id}, '${encodeURIComponent(it.name)}', ${it.price}, ${it.stock})">
                <i class="bi bi-cart-plus"></i> <span class="btn-add-text">Agregar</span>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  openNewItemModal() {
    if (this.currentTab === 'services') {
      if (typeof Services !== 'undefined') Services.openNewModal();
    } else if (this.currentTab !== 'all') {
      if (typeof Inventory !== 'undefined') {
        Inventory.openNewModal();
        const catSelect = document.getElementById('product-modal-category');
        if (catSelect && this.currentTab) catSelect.value = this.currentTab;
      }
    } else {
      App.openModal('modal-pos-new-item');
    }
  },

  openEditItem(type, id) {
    if (type === 'service') {
      if (typeof Services !== 'undefined') {
        if (!Services.servicesList || Services.servicesList.length === 0) {
          Services.servicesList = this.services;
        }
        Services.openEditModal(id);
      }
    } else {
      if (typeof Inventory !== 'undefined') {
        if (!Inventory.productsList || Inventory.productsList.length === 0) {
          Inventory.productsList = this.products;
        }
        Inventory.openEditModal(id);
      }
    }
  },

  async deleteItem(type, id) {
    const isService = type === 'service';
    const item = isService ? this.services.find(s => s.id == id) : this.products.find(p => p.id == id);
    const itemName = item ? item.name : 'este artículo';

    if (!confirm(`¿Estás seguro de eliminar "${itemName}" del catálogo?`)) return;

    try {
      const endpoint = isService ? 'api/services.php?action=delete' : 'api/products.php?action=delete';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      });
      const json = await res.json();

      if (json.success) {
        App.toast(`${isService ? 'Servicio' : 'Producto'} eliminado con éxito`, 'success');
        await this.loadCatalog();
        if (typeof Services !== 'undefined') Services.fetchServices();
        if (typeof Inventory !== 'undefined') Inventory.fetchProducts();
        if (typeof Dashboard !== 'undefined') Dashboard.load();
      } else {
        App.toast(json.error || 'Error al eliminar', 'error');
      }
    } catch (e) {
      console.error('Error deleting item from POS:', e);
      App.toast('Error de conexión al eliminar', 'error');
    }
  },

  addItemToCart(type, id, nameEncoded, price, stock = null) {
    const name = decodeURIComponent(nameEncoded);
    const existingIndex = this.cart.findIndex(i => i.item_type === type && i.item_id === id);

    if (existingIndex > -1) {
      if (type === 'product' && stock !== null && this.cart[existingIndex].quantity >= stock) {
        App.toast(`Stock máximo alcanzado (${stock} un.)`, 'error');
        return;
      }
      this.cart[existingIndex].quantity += 1;
      this.cart[existingIndex].subtotal = this.cart[existingIndex].quantity * this.cart[existingIndex].unit_price;
    } else {
      if (type === 'product' && stock !== null && stock <= 0) {
        App.toast('Este producto no tiene stock disponible', 'error');
        return;
      }
      this.cart.push({
        item_type: type,
        item_id: id,
        item_name: name,
        unit_price: parseFloat(price),
        quantity: 1,
        subtotal: parseFloat(price),
        max_stock: stock
      });
    }

    this.renderCart();

    // Haptic feedback if available on mobile
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    // Get active client name if any
    const selectMain = document.getElementById('pos-client-select-main');
    const selectCart = document.getElementById('pos-client-select');
    const sel = (selectMain && selectMain.value) ? selectMain : (selectCart && selectCart.value ? selectCart : null);
    const clientName = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].text.split('(')[0].trim() : '';

    if (clientName && !clientName.includes('Venta Casual') && !clientName.includes('Mostrador')) {
      App.toast(`✅ "${name}" agregado al ticket de ${clientName}`, 'success');
    } else {
      App.toast(`✅ "${name}" agregado al ticket`, 'success');
    }
  },

  addServiceToCart(id, nameEncoded, price) {
    App.navigate('pos');
    this.addItemToCart('service', id, nameEncoded, price);
  },

  addProductToCart(id, nameEncoded, price, stock) {
    App.navigate('pos');
    this.addItemToCart('product', id, nameEncoded, price, stock);
  },

  startSaleFromAppointment(appointmentId, clientId, serviceId) {
    App.navigate('pos');
    this.cart = [];
    this.activeAppointmentId = appointmentId;

    // Set client
    this.syncClientSelect(clientId);

    // Add service to cart
    const service = this.services.find(s => s.id == serviceId);
    if (service) {
      this.addItemToCart('service', service.id, encodeURIComponent(service.name), service.price);
    }

    App.toast('Turno cargado en caja. ¡Puedes agregar bebidas o perfumes antes de cobrar!', 'info');
  },

  startSaleForClient(clientId, clientNameEncoded) {
    App.navigate('pos');
    this.clearCart();
    this.activeAppointmentId = null;

    this.syncClientSelect(clientId);

    const clientName = decodeURIComponent(clientNameEncoded || 'Cliente');
    App.toast(`Cobro iniciado para ${clientName}. Toca los cortes o productos para agregarlos.`, 'info');
  },

  changeQty(index, delta) {
    const item = this.cart[index];
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.cart.splice(index, 1);
    } else {
      if (item.item_type === 'product' && item.max_stock !== null && newQty > item.max_stock) {
        App.toast(`Stock insuficiente (máx: ${item.max_stock})`, 'error');
        return;
      }
      item.quantity = newQty;
      item.subtotal = item.quantity * item.unit_price;
    }
    this.renderCart();
  },

  removeItem(index) {
    this.cart.splice(index, 1);
    this.renderCart();
  },

  clearCart() {
    this.cart = [];
    this.activeAppointmentId = null;
    const clientSelect = document.getElementById('pos-client-select');
    if (clientSelect) clientSelect.value = '';
    const selectMain = document.getElementById('pos-client-select-main');
    if (selectMain) selectMain.value = '';
    const discountInput = document.getElementById('pos-discount-input');
    if (discountInput) discountInput.value = 0;
    const paidInput = document.getElementById('pos-amount-paid');
    if (paidInput) paidInput.value = '';
    this.renderCart();
  },

  showMobileView(tab) {
    const btnCatalog = document.getElementById('pos-btn-show-catalog');
    const btnCart = document.getElementById('pos-btn-show-cart');
    const panelCatalog = document.getElementById('pos-panel-catalog');
    const panelCart = document.getElementById('pos-panel-cart');

    if (tab === 'cart') {
      if (btnCart) {
        btnCart.classList.add('active', 'btn-gold');
        btnCart.classList.remove('btn-secondary');
      }
      if (btnCatalog) {
        btnCatalog.classList.remove('active', 'btn-gold');
        btnCatalog.classList.add('btn-secondary');
      }
      if (panelCatalog) panelCatalog.classList.add('mobile-hidden');
      if (panelCart) panelCart.classList.remove('mobile-hidden');
    } else {
      if (btnCatalog) {
        btnCatalog.classList.add('active', 'btn-gold');
        btnCatalog.classList.remove('btn-secondary');
      }
      if (btnCart) {
        btnCart.classList.remove('active', 'btn-gold');
        btnCart.classList.add('btn-secondary');
      }
      if (panelCatalog) panelCatalog.classList.remove('mobile-hidden');
      if (panelCart) panelCart.classList.add('mobile-hidden');
    }
  },

  renderCart() {
    const container = document.getElementById('pos-cart-items-container');
    const totalItems = this.cart.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);

    const cartBadge = document.getElementById('pos-cart-count-badge');
    const btnCart = document.getElementById('pos-btn-show-cart');
    if (cartBadge) {
      if (totalItems > 0) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = 'inline-block';
      } else {
        cartBadge.style.display = 'none';
      }
    }
    if (btnCart) {
      btnCart.innerHTML = `<i class="bi bi-cart3"></i> Carrito (${totalItems}) <span class="badge badge-gold" style="margin-left: 4px; font-family: var(--font-mono);">${App.formatMoney(subtotal)}</span>`;
    }

    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <i class="bi bi-cart3" style="font-size: 2.2rem; display: block; margin-bottom: 8px;"></i>
          El carrito está vacío.<br>Haz clic en los servicios o productos para agregarlos.
        </div>
      `;
      this.calculateTotals();
      return;
    }

    let html = '';
    this.cart.forEach((item, index) => {
      let icon = item.item_type === 'service' ? 'bi-scissors text-gold' : 'bi-box-seam';

      html += `
        <div class="cart-item-row">
          <div style="flex: 1; padding-right: 8px;">
            <div style="font-weight: 700; color: #fff; line-height: 1.2;">
              <i class="bi ${icon}" style="font-size: 0.8rem;"></i> ${item.item_name}
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); font-family: var(--font-mono);">
              ${App.formatMoney(item.unit_price)} c/u
            </div>
          </div>
          <div class="cart-qty-ctrls">
            <button class="cart-qty-btn" onclick="POS.changeQty(${index}, -1)">-</button>
            <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.9rem; min-width: 20px; text-align: center;">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="POS.changeQty(${index}, 1)">+</button>
          </div>
          <div style="text-align: right; min-width: 75px; margin-left: 10px;">
            <div style="font-family: var(--font-mono); font-weight: 700; color: var(--gold-light);">${App.formatMoney(item.subtotal)}</div>
            <button class="btn-danger btn-sm" style="padding: 2px 6px; font-size: 0.68rem; margin-top: 2px;" onclick="POS.removeItem(${index})"><i class="bi bi-x"></i></button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    this.calculateTotals();
  },

  calculateTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountEl = document.getElementById('pos-discount-input');
    const discount = parseFloat(discountEl ? discountEl.value : 0) || 0;
    const total = Math.max(0, subtotal - discount);

    const subtotalEl = document.getElementById('pos-summary-subtotal');
    const totalEl = document.getElementById('pos-summary-total');
    if (subtotalEl) subtotalEl.textContent = App.formatMoney(subtotal);
    if (totalEl) {
      totalEl.innerHTML = App.formatDual(total);
    }

    // Update the paid input placeholder with the expected total in selected currency
    const curPayMode = document.getElementById('pos-pay-currency') ? document.getElementById('pos-pay-currency').value : (App.currency || 'PYG');
    const paidEl = document.getElementById('pos-amount-paid');
    if (paidEl) {
      if (curPayMode === 'USD') {
        const totalUSD = total / (App.exchangeRate || 7500);
        paidEl.placeholder = `$ ${totalUSD.toFixed(2)}`;
      } else {
        paidEl.placeholder = `₲ ${Math.round(total).toLocaleString('es-PY')}`;
      }
    }

    // Auto calculate change with multi-currency support
    let amountPaidInBase = total;
    if (paidEl && paidEl.value !== '') {
      const rawPaid = parseFloat(paidEl.value) || 0;
      if (curPayMode === 'USD') {
        amountPaidInBase = rawPaid * (App.exchangeRate || 7500);
      } else {
        amountPaidInBase = rawPaid;
      }
    }

    const changeBase = Math.max(0, amountPaidInBase - total);
    const changeEl = document.getElementById('pos-summary-change');
    if (changeEl) {
      changeEl.innerHTML = App.formatDual(changeBase);
    }
  },

  async processCheckout() {
    if (this.cart.length === 0) {
      App.toast('El carrito está vacío', 'error');
      return;
    }

    const clientId = document.getElementById('pos-client-select').value;
    const paymentMethod = document.getElementById('pos-payment-method').value;
    const discount = parseFloat(document.getElementById('pos-discount-input').value) || 0;
    const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    const total = Math.max(0, subtotal - discount);
    const notes = document.getElementById('pos-notes-input').value;

    // Convert paid amount to base currency (PYG) for storage
    const paidInput = document.getElementById('pos-amount-paid');
    const curPayMode = document.getElementById('pos-pay-currency') ? document.getElementById('pos-pay-currency').value : 'PYG';
    let amountPaidInPYG = total; // default: exact total
    if (paidInput && paidInput.value !== '') {
      const rawPaid = parseFloat(paidInput.value) || 0;
      amountPaidInPYG = (curPayMode === 'USD') ? rawPaid * (App.exchangeRate || 7500) : rawPaid;
    }
    const changeAmount = Math.max(0, amountPaidInPYG - total);

    const payload = {
      client_id: clientId || null,
      appointment_id: this.activeAppointmentId || null,
      items: this.cart,
      subtotal: subtotal,
      discount: discount,
      total: total,
      payment_method: paymentMethod,
      amount_paid: amountPaidInPYG,
      change_amount: changeAmount,
      notes: notes
    };

    const checkoutBtn = document.getElementById('btn-pos-checkout');
    if (checkoutBtn) checkoutBtn.disabled = true;

    try {
      const res = await fetch('api/sales.php?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        App.toast('¡Cobro registrado con éxito!', 'success');
        const saleId = json.sale_id;

        // Clear Cart
        this.clearCart();
        await this.loadCatalog(); // Refresh products stock

        // Show Printable Receipt Modal
        Sales.viewReceipt(saleId);

        if (Dashboard) Dashboard.load();
      } else {
        App.toast(json.error || 'Error al procesar el cobro', 'error');
      }
    } catch (e) {
      console.error(e);
      App.toast('Error de red', 'error');
    } finally {
      if (checkoutBtn) checkoutBtn.disabled = false;
    }
  }
};

window.POS = POS;
