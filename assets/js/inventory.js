/**
 * BarberApp Pro - Inventory & Extras Controller
 * Handles Decants, Full Perfumes, Alcoholic & Non-Alcoholic Drinks
 */

const Inventory = {
  productsList: [],
  currentCategory: 'all',
  searchTerm: '',

  async load() {
    this.setupFilters();
    await this.fetchProducts();
  },

  setupFilters() {
    document.querySelectorAll('.inv-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.inv-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.getAttribute('data-category');
        this.renderProducts();
      });
    });

    const searchInput = document.getElementById('inv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderProducts();
      });
    }
  },

  async fetchProducts() {
    const container = document.getElementById('inventory-list-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin" style="font-size: 2rem; color: var(--gold-primary);"></i></div>`;

    try {
      const res = await fetch('api/products.php?action=list');
      const json = await res.json();

      if (json.success) {
        this.productsList = json.data;
        this.renderProducts();
      }
    } catch (e) {
      container.innerHTML = `<p style="color: var(--rose); text-align: center;">Error al cargar el inventario.</p>`;
    }
  },

  renderProducts() {
    const container = document.getElementById('inventory-list-container');
    if (!container) return;

    let filtered = this.productsList;

    if (this.currentCategory === 'low_stock') {
      filtered = filtered.filter(p => p.stock <= p.min_stock);
    } else if (this.currentCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.currentCategory);
    }

    if (this.searchTerm) {
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(this.searchTerm)) ||
        (p.brand && p.brand.toLowerCase().includes(this.searchTerm)) ||
        (p.size_volume && p.size_volume.toLowerCase().includes(this.searchTerm))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 50px 20px;">
          <i class="bi bi-box-seam" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: 10px;"></i>
          <h3 style="color: #fff; margin-bottom: 6px;">No se encontraron productos</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">Prueba con otra categoría o agrega un nuevo producto al stock.</p>
          <button class="btn btn-gold" onclick="Inventory.openNewModal()">
            <i class="bi bi-plus-circle"></i> Agregar Producto
          </button>
        </div>
      `;
      return;
    }

    const catLabels = {
      decant: { name: 'Perfume Decant', class: 'category-badge-decant', icon: 'bi-droplet-half' },
      perfume: { name: 'Perfume Entero', class: 'category-badge-perfume', icon: 'bi-gem' },
      alcohol: { name: 'Bebida Alcohólica', class: 'category-badge-alcohol', icon: 'bi-cup-straw' },
      no_alcohol: { name: 'Bebida Sin Alcohol', class: 'category-badge-no_alcohol', icon: 'bi-cup-hot' },
      otro: { name: 'Otro', class: 'badge-secondary', icon: 'bi-box' }
    };

    // 1. Desktop Table View
    let desktopHtml = `
      <div class="card desktop-table-view">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Producto & Marca</th>
                <th>Categoría</th>
                <th>Medida / Vol</th>
                <th>Precio Venta</th>
                <th>Precio Costo</th>
                <th>Stock Actual</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
    `;

    // 2. Mobile Cards View
    let mobileHtml = `<div class="mobile-card-list mobile-card-view">`;

    filtered.forEach(p => {
      const cat = catLabels[p.category] || catLabels.otro;
      const isLowStock = p.stock <= p.min_stock;

      // Row for desktop
      desktopHtml += `
        <tr>
          <td>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${p.name}</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);"><i class="bi bi-tag"></i> ${p.brand || 'Marca no especificada'}</div>
          </td>
          <td>
            <span class="badge ${cat.class}"><i class="bi ${cat.icon}"></i> ${cat.name}</span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-secondary);">${p.size_volume || '-'}</span>
          </td>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--gold-light); font-size: 1rem;">${App.formatMoney(p.sale_price)}</strong>
          </td>
          <td>
            <span style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.85rem;">${App.formatMoney(p.cost_price)}</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${isLowStock ? 'badge-rose' : 'badge-emerald'}" style="font-family: var(--font-mono); font-size: 0.88rem;">
                ${isLowStock ? '<i class="bi bi-exclamation-circle-fill"></i> ' : ''}${p.stock} un.
              </span>
              ${isLowStock ? `<span style="font-size: 0.72rem; color: #ff6b81;">(mín: ${p.min_stock})</span>` : ''}
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-gold btn-sm" title="Agregar al carrito POS" onclick="POS.addProductToCart(${p.id}, '${encodeURIComponent(p.name)}', ${p.sale_price}, ${p.stock})">
                <i class="bi bi-cart-plus"></i>
              </button>
              <button class="btn btn-outline-gold btn-sm" title="Ajustar Stock" onclick="Inventory.openStockModal(${p.id}, '${encodeURIComponent(p.name)}', ${p.stock})">
                <i class="bi bi-boxes"></i> Stock
              </button>
              <button class="btn btn-secondary btn-sm" title="Editar" onclick="Inventory.openEditModal(${p.id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-danger btn-sm" title="Eliminar" onclick="Inventory.deleteProduct(${p.id})">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;

      // Card for mobile
      mobileHtml += `
        <div class="mobile-item-card">
          <div class="mobile-item-card-header">
            <span class="badge ${cat.class}"><i class="bi ${cat.icon}"></i> ${cat.name}</span>
            <span class="badge ${isLowStock ? 'badge-rose' : 'badge-emerald'}" style="font-family: var(--font-mono); font-size: 0.8rem;">
              ${isLowStock ? '⚠️ ' : ''}${p.stock} unidades
            </span>
          </div>
          <div class="mobile-item-card-title">${p.name}</div>
          <div class="mobile-item-card-meta">
            ${p.brand ? `<span><i class="bi bi-tag"></i> ${p.brand}</span>` : ''}
            ${p.size_volume ? `<span><i class="bi bi-droplet"></i> ${p.size_volume}</span>` : ''}
            <span style="font-family: var(--font-mono); color: var(--gold-light); font-weight: 800; font-size: 1.15rem; margin-left: auto;">
              ${App.formatMoney(p.sale_price)}
            </span>
          </div>
          <div class="mobile-item-card-footer">
            <button class="btn btn-gold btn-sm" style="flex: 1;" onclick="POS.addProductToCart(${p.id}, '${encodeURIComponent(p.name)}', ${p.sale_price}, ${p.stock})">
              <i class="bi bi-cart-plus"></i> Cobrar en POS
            </button>
            <button class="btn btn-outline-gold btn-sm" onclick="Inventory.openStockModal(${p.id}, '${encodeURIComponent(p.name)}', ${p.stock})">
              <i class="bi bi-boxes"></i> Stock
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Inventory.openEditModal(${p.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="Inventory.deleteProduct(${p.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });

    desktopHtml += `</tbody></table></div></div>`;
    mobileHtml += `</div>`;

    container.innerHTML = desktopHtml + mobileHtml;
  },

  openNewModal() {
    document.getElementById('product-modal-form').reset();
    document.getElementById('product-modal-id').value = '';
    document.getElementById('product-modal-title').innerHTML = '<i class="bi bi-plus-circle"></i> Nuevo Producto / Extra';
    App.openModal('modal-product');
  },

  openEditModal(id) {
    const p = this.productsList.find(item => item.id == id);
    if (!p) return;

    document.getElementById('product-modal-id').value = p.id;
    document.getElementById('product-modal-name').value = p.name;
    document.getElementById('product-modal-category').value = p.category;
    document.getElementById('product-modal-brand').value = p.brand || '';
    document.getElementById('product-modal-size').value = p.size_volume || '';
    document.getElementById('product-modal-cost').value = p.cost_price;
    document.getElementById('product-modal-price').value = p.sale_price;
    document.getElementById('product-modal-stock').value = p.stock;
    document.getElementById('product-modal-min-stock').value = p.min_stock;
    document.getElementById('product-modal-title').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Producto';

    App.openModal('modal-product');
  },

  openStockModal(id, nameEncoded, currentStock) {
    document.getElementById('stock-modal-product-id').value = id;
    document.getElementById('stock-modal-product-name').textContent = decodeURIComponent(nameEncoded);
    document.getElementById('stock-modal-current').textContent = `${currentStock} unidades`;
    document.getElementById('stock-modal-adjustment').value = 5;
    App.openModal('modal-stock-adjust');
  },

  async saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-modal-id').value;
    const data = {
      id: id,
      name: document.getElementById('product-modal-name').value,
      category: document.getElementById('product-modal-category').value,
      brand: document.getElementById('product-modal-brand').value,
      size_volume: document.getElementById('product-modal-size').value,
      cost_price: document.getElementById('product-modal-cost').value,
      sale_price: document.getElementById('product-modal-price').value,
      stock: document.getElementById('product-modal-stock').value,
      min_stock: document.getElementById('product-modal-min-stock').value
    };

    const action = id ? 'update' : 'create';

    try {
      const res = await fetch(`api/products.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (json.success) {
        App.toast(id ? 'Producto actualizado' : 'Producto agregado al inventario', 'success');
        App.closeModal('modal-product');
        this.fetchProducts();
        if (Dashboard) Dashboard.load();
        if (POS) POS.loadCatalog();
      } else {
        App.toast(json.error || 'Error al guardar el producto', 'error');
      }
    } catch (err) {
      App.toast('Error de conexión', 'error');
    }
  },

  async applyStockAdjustment(e) {
    e.preventDefault();
    const id = document.getElementById('stock-modal-product-id').value;
    const mode = document.getElementById('stock-modal-mode').value; // 'add', 'subtract', 'set'
    const amount = parseInt(document.getElementById('stock-modal-adjustment').value) || 0;

    let payload = { id };
    if (mode === 'set') {
      payload.type = 'absolute';
      payload.new_stock = amount;
    } else {
      payload.type = 'delta';
      payload.adjustment = (mode === 'subtract') ? -amount : amount;
    }

    try {
      const res = await fetch('api/products.php?action=adjust_stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        App.toast('Stock actualizado con éxito', 'success');
        App.closeModal('modal-stock-adjust');
        this.fetchProducts();
        if (Dashboard) Dashboard.load();
      } else {
        App.toast(json.error || 'Error al ajustar stock', 'error');
      }
    } catch (err) {
      App.toast('Error de conexión', 'error');
    }
  },

  async deleteProduct(id) {
    if (!confirm('¿Seguro que deseas eliminar este producto del inventario?')) return;

    try {
      const res = await fetch('api/products.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) {
        App.toast('Producto eliminado', 'success');
        this.fetchProducts();
        if (Dashboard) Dashboard.load();
      }
    } catch (e) {
      App.toast('Error al eliminar', 'error');
    }
  }
};

window.Inventory = Inventory;
