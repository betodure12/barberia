/**
 * BarberApp Pro - Sales History & Receipt Controller
 */

const Sales = {
  salesList: [],
  breakdown: {
    Efectivo: { total: 0, count: 0 },
    Tarjeta: { total: 0, count: 0 },
    Transferencia: { total: 0, count: 0 },
    total_all: 0,
    count_all: 0
  },
  currentPeriod: 'all',
  currentMethod: 'all',
  currentClientType: 'all', // 'all', 'registered', 'counter'
  currentReceiptData: null,

  async load() {
    this.setupFilters();
    await this.fetchSales();
  },

  setupFilters() {
    const paySelect = document.getElementById('sales-filter-payment');
    if (paySelect) {
      paySelect.addEventListener('change', (e) => {
        this.currentMethod = e.target.value;
        this.fetchSales();
      });
    }

    const searchInput = document.getElementById('sales-search-input');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => this.fetchSales(), 300);
      });
    }
  },

  setPeriod(period) {
    this.currentPeriod = period;
    document.querySelectorAll('#sales-period-tabs .tab-btn').forEach(btn => {
      if (btn.getAttribute('data-period') === period) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.fetchSales();
  },

  setClientType(type) {
    this.currentClientType = type;
    document.querySelectorAll('#sales-client-type-tabs .tab-btn').forEach(btn => {
      if (btn.getAttribute('data-client-type') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.renderSales();
  },

  setMethod(method) {
    this.currentMethod = method;
    const paySelect = document.getElementById('sales-filter-payment');
    if (paySelect) paySelect.value = method;
    this.fetchSales();
  },

  getDateRange() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const toYMD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (this.currentPeriod === 'today') {
      const todayStr = toYMD(now);
      return { start: todayStr, end: todayStr };
    }
    if (this.currentPeriod === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return { start: toYMD(monday), end: toYMD(now) };
    }
    if (this.currentPeriod === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toYMD(firstDay), end: toYMD(now) };
    }
    return { start: '', end: '' };
  },

  async fetchSales() {
    const container = document.getElementById('sales-list-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin" style="font-size: 2rem; color: var(--gold-primary);"></i></div>`;

    const paySelect = document.getElementById('sales-filter-payment');
    const payMethod = paySelect ? paySelect.value : this.currentMethod;
    this.currentMethod = payMethod;
    const search = document.getElementById('sales-search-input') ? document.getElementById('sales-search-input').value.trim() : '';
    const range = this.getDateRange();

    try {
      let url = 'api/sales.php?action=list';
      if (range.start && range.end) url += `&start_date=${encodeURIComponent(range.start)}&end_date=${encodeURIComponent(range.end)}`;
      if (payMethod && payMethod !== 'all') url += `&payment_method=${encodeURIComponent(payMethod)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        this.salesList = json.data;
        if (json.breakdown) {
          this.breakdown = json.breakdown;
        }
        this.renderBreakdown();
        this.renderSales();
      }
    } catch (e) {
      container.innerHTML = `<p style="color: var(--rose); text-align: center;">Error al cargar ventas.</p>`;
    }
  },

  renderBreakdown() {
    const container = document.getElementById('sales-breakdown-container');
    if (!container) return;

    const b = this.breakdown || {
      Efectivo: { total: 0, count: 0 },
      Tarjeta: { total: 0, count: 0 },
      Transferencia: { total: 0, count: 0 },
      total_all: 0,
      count_all: 0
    };

    const cashTot = (b.Efectivo && b.Efectivo.total) ? b.Efectivo.total : 0;
    const cashCnt = (b.Efectivo && b.Efectivo.count) ? b.Efectivo.count : 0;

    const posTot = (b.Tarjeta && b.Tarjeta.total) ? b.Tarjeta.total : 0;
    const posCnt = (b.Tarjeta && b.Tarjeta.count) ? b.Tarjeta.count : 0;

    const transTot = (b.Transferencia && b.Transferencia.total) ? b.Transferencia.total : 0;
    const transCnt = (b.Transferencia && b.Transferencia.count) ? b.Transferencia.count : 0;

    const allTot = b.total_all || 0;
    const allCnt = b.count_all || 0;

    const calcPct = val => allTot > 0 ? Math.round((val / allTot) * 100) : 0;

    container.innerHTML = `
      <!-- 1. Efectivo -->
      <div class="sales-breakdown-card cash ${this.currentMethod === 'Efectivo' ? 'active' : ''}" onclick="Sales.setMethod('Efectivo')" title="Clic para ver solo ventas en efectivo">
        <div class="sales-breakdown-header">
          <div class="sales-breakdown-icon"><i class="bi bi-cash-stack"></i></div>
          <span class="sales-breakdown-badge">Efectivo</span>
        </div>
        <div class="sales-breakdown-label">Caja en Efectivo</div>
        <div class="sales-breakdown-amount">${App.formatMoney(cashTot)}</div>
        <div class="sales-breakdown-footer">
          <span>${cashCnt} ${cashCnt === 1 ? 'cobro' : 'cobros'}</span>
          <span>${calcPct(cashTot)}% del total</span>
        </div>
      </div>

      <!-- 2. Cobro en POS / Tarjeta -->
      <div class="sales-breakdown-card pos ${this.currentMethod === 'Tarjeta' ? 'active' : ''}" onclick="Sales.setMethod('Tarjeta')" title="Clic para ver solo cobros en POS">
        <div class="sales-breakdown-header">
          <div class="sales-breakdown-icon"><i class="bi bi-credit-card-2-front-fill"></i></div>
          <span class="sales-breakdown-badge">Cobro POS</span>
        </div>
        <div class="sales-breakdown-label">Cobro en POS (Tarjeta)</div>
        <div class="sales-breakdown-amount">${App.formatMoney(posTot)}</div>
        <div class="sales-breakdown-footer">
          <span>${posCnt} ${posCnt === 1 ? 'cobro' : 'cobros'}</span>
          <span>${calcPct(posTot)}% del total</span>
        </div>
      </div>

      <!-- 3. Transferencia Bancaria / QR -->
      <div class="sales-breakdown-card transfer ${this.currentMethod === 'Transferencia' ? 'active' : ''}" onclick="Sales.setMethod('Transferencia')" title="Clic para ver solo transferencias">
        <div class="sales-breakdown-header">
          <div class="sales-breakdown-icon"><i class="bi bi-phone-flip"></i></div>
          <span class="sales-breakdown-badge">Transferencia</span>
        </div>
        <div class="sales-breakdown-label">Bancos / Billeteras / QR</div>
        <div class="sales-breakdown-amount">${App.formatMoney(transTot)}</div>
        <div class="sales-breakdown-footer">
          <span>${transCnt} ${transCnt === 1 ? 'cobro' : 'cobros'}</span>
          <span>${calcPct(transTot)}% del total</span>
        </div>
      </div>

      <!-- 4. Total General Recaudado -->
      <div class="sales-breakdown-card total ${this.currentMethod === 'all' ? 'active' : ''}" onclick="Sales.setMethod('all')" title="Clic para ver todos los medios">
        <div class="sales-breakdown-header">
          <div class="sales-breakdown-icon"><i class="bi bi-wallet2"></i></div>
          <span class="sales-breakdown-badge">Total General</span>
        </div>
        <div class="sales-breakdown-label">Total Recaudado</div>
        <div class="sales-breakdown-amount">${App.formatMoney(allTot)}</div>
        <div class="sales-breakdown-footer">
          <span>${allCnt} ${allCnt === 1 ? 'ticket' : 'tickets'}</span>
          <span>${this.getPeriodLabel()}</span>
        </div>
      </div>
    `;
  },

  getPeriodLabel() {
    if (this.currentPeriod === 'today') return 'Cobrado Hoy';
    if (this.currentPeriod === 'week') return 'Esta Semana';
    if (this.currentPeriod === 'month') return 'Este Mes';
    return 'Total Período';
  },

  renderSales() {
    const container = document.getElementById('sales-list-container');
    if (!container) return;

    // Apply client type filter (Todas / Registrados / Mostrador)
    let filteredList = this.salesList;
    if (this.currentClientType === 'registered') {
      filteredList = filteredList.filter(s => s.client_id && !((s.client_name || '').toLowerCase().includes('ocasional') || (s.client_name || '').toLowerCase().includes('mostrador')));
    } else if (this.currentClientType === 'counter') {
      filteredList = filteredList.filter(s => !s.client_id || (s.client_name || '').toLowerCase().includes('ocasional') || (s.client_name || '').toLowerCase().includes('mostrador'));
    }

    if (filteredList.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 50px 20px;">
          <i class="bi bi-receipt" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: 10px;"></i>
          <h3 style="color: #fff; margin-bottom: 6px;">No hay ventas encontradas</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">No se registraron cobros con los filtros seleccionados (${this.currentMethod === 'all' ? 'Todos los medios' : this.currentMethod} - ${this.currentClientType === 'counter' ? 'Venta Mostrador' : this.currentClientType === 'registered' ? 'Clientes con Ficha' : 'Todos'} - ${this.getPeriodLabel()}).</p>
          <button class="btn btn-gold" onclick="App.navigate('pos')">
            <i class="bi bi-cart-check"></i> Ir a Caja (POS)
          </button>
        </div>
      `;
      return;
    }

    // 1. Desktop Table View
    let desktopHtml = `
      <div class="card desktop-table-view">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>N° Ticket</th>
                <th>Fecha & Hora</th>
                <th>Tipo & Cliente</th>
                <th>Medio de Pago</th>
                <th>Total Cobrado</th>
                <th>Detalle Pago</th>
                <th>Notas</th>
                <th style="text-align: right;">Comprobante</th>
              </tr>
            </thead>
            <tbody>
    `;

    // 2. Mobile Cards View
    let mobileHtml = `<div class="mobile-card-list mobile-card-view">`;

    filteredList.forEach(s => {
      let payBadge = 'badge-emerald';
      let payIcon = '<i class="bi bi-cash"></i>';
      let payLabel = 'Efectivo';

      const methodUpper = (s.payment_method || '').toUpperCase();
      if (methodUpper.includes('TARJETA') || methodUpper.includes('POS')) {
        payBadge = 'badge-sky';
        payIcon = '<i class="bi bi-credit-card-2-front"></i>';
        payLabel = 'Cobro en POS';
      } else if (methodUpper.includes('TRANSFERENCIA')) {
        payBadge = 'badge-purple';
        payIcon = '<i class="bi bi-phone-flip"></i>';
        payLabel = 'Transferencia';
      }

      const isCounter = !s.client_id || (s.client_name || '').toLowerCase().includes('ocasional') || (s.client_name || '').toLowerCase().includes('mostrador');

      // Detalle de vuelto si aplica
      let changeInfo = '';
      if (s.amount_paid && parseFloat(s.change_amount) > 0) {
        changeInfo = `<div style="font-size: 0.74rem; color: var(--emerald); margin-top: 3px;"><i class="bi bi-arrow-return-left"></i> Pagó con ${App.formatMoney(s.amount_paid)} · Vuelto: ${App.formatMoney(s.change_amount)}</div>`;
      }

      // Row for desktop
      desktopHtml += `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--text-gold);">#TK-${String(s.id).padStart(5, '0')}</strong></td>
          <td>
            <div style="font-size: 0.85rem; color: #fff;">${s.created_at}</div>
          </td>
          <td>
            ${isCounter ? `
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge badge-secondary" style="font-size: 0.72rem; padding: 2px 7px;"><i class="bi bi-lightning-fill text-gold"></i> Mostrador</span>
                <span style="font-size: 0.84rem; color: var(--text-secondary);">Sin Cliente</span>
              </div>
            ` : `
              <div style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px;">
                <i class="bi bi-person-check-fill text-gold"></i> ${s.client_name}
              </div>
              ${s.client_phone ? `<div style="font-size: 0.76rem; color: var(--text-muted);"><i class="bi bi-telephone"></i> ${s.client_phone}</div>` : ''}
            `}
          </td>
          <td><span class="badge ${payBadge}">${payIcon} ${payLabel}</span></td>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--gold-light); font-size: 1.05rem;">
              ${App.formatMoney(s.total)}
            </strong>
          </td>
          <td>
            ${changeInfo || `<span style="font-size: 0.78rem; color: var(--text-muted);">Exacto</span>`}
          </td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${s.notes || '-'}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-outline-gold btn-sm" onclick="Sales.viewReceipt(${s.id})">
              <i class="bi bi-file-earmark-text"></i> Ver Ticket
            </button>
          </td>
        </tr>
      `;

      // Card for mobile
      mobileHtml += `
        <div class="mobile-item-card">
          <div class="mobile-item-card-header">
            <span style="font-family: var(--font-mono); font-weight: 800; color: var(--text-gold); font-size: 0.95rem;">
              #TK-${String(s.id).padStart(5, '0')}
            </span>
            <span class="badge ${payBadge}">${payIcon} ${payLabel}</span>
          </div>
          <div class="mobile-item-card-title" style="margin: 6px 0;">
            ${isCounter ? `
              <span class="badge badge-secondary" style="font-size: 0.75rem; padding: 3px 8px;"><i class="bi bi-lightning-fill text-gold"></i> Venta Mostrador (Sin Cliente)</span>
            ` : `
              <span style="color: #fff; font-weight: 700;"><i class="bi bi-person-check-fill text-gold"></i> ${s.client_name}</span>
            `}
          </div>
          <div class="mobile-item-card-meta">
            <span><i class="bi bi-calendar-event"></i> ${s.created_at}</span>
            <span style="font-family: var(--font-mono); color: var(--gold-light); font-weight: 800; font-size: 1.2rem; margin-left: auto;">
              ${App.formatMoney(s.total)}
            </span>
          </div>
          ${changeInfo}
          ${s.notes ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; margin-bottom: 8px;">Nota: ${s.notes}</div>` : ''}
          <div class="mobile-item-card-footer" style="margin-top: 10px;">
            <button class="btn btn-outline-gold btn-sm" style="width: 100%;" onclick="Sales.viewReceipt(${s.id})">
              <i class="bi bi-receipt"></i> Ver Ticket / Imprimir / WhatsApp
            </button>
          </div>
        </div>
      `;
    });

    desktopHtml += `</tbody></table></div></div>`;
    mobileHtml += `</div>`;

    container.innerHTML = desktopHtml + mobileHtml;
  },

  async viewReceipt(saleId) {
    try {
      const res = await fetch(`api/sales.php?action=get&id=${saleId}`);
      const json = await res.json();

      if (json.success) {
        this.currentReceiptData = json.data;
        this.renderReceiptModal(json.data);
        App.openModal('modal-receipt');
      } else {
        App.toast('No se pudo cargar el ticket', 'error');
      }
    } catch (e) {
      App.toast('Error al consultar ticket', 'error');
    }
  },

  renderReceiptModal(data) {
    const container = document.getElementById('receipt-ticket-content');
    if (!container) return;

    const bName = (data.settings && data.settings.business_name) ? data.settings.business_name : 'MF Barber & Lounge';
    const bAddress = (data.settings && data.settings.business_address) ? data.settings.business_address : 'Local Central';
    const bPhone = (data.settings && data.settings.business_phone) ? data.settings.business_phone : '';

    let itemsHtml = '';
    if (data.items) {
      data.items.forEach(it => {
        itemsHtml += `
          <tr>
            <td>${it.quantity}x ${it.item_name}</td>
            <td style="text-align: right; font-family: monospace;">${App.formatMoney(it.subtotal)}</td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="ticket-receipt" id="printable-receipt-area">
        <div class="ticket-header">
          <div class="ticket-title">💈 ${bName.toUpperCase()} 💈</div>
          <div style="font-size: 0.8rem;">${bAddress}</div>
          ${bPhone ? `<div style="font-size: 0.8rem;">Tel: ${bPhone}</div>` : ''}
          <div style="margin-top: 6px; font-weight: bold;">TICKET DE VENTA: #TK-${String(data.id).padStart(5, '0')}</div>
          <div style="font-size: 0.75rem;">Fecha: ${data.created_at}</div>
        </div>

        <div style="margin-bottom: 10px; font-size: 0.85rem; border-bottom: 1px dashed #000; padding-bottom: 6px;">
          <div><strong>Cliente:</strong> ${data.client_name}</div>
          ${data.client_phone ? `<div><strong>Tel:</strong> ${data.client_phone}</div>` : ''}
        </div>

        <table class="ticket-table">
          <thead>
            <tr>
              <th>DETALLE</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="ticket-totals">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
            <span>Subtotal:</span>
            <span>${App.formatMoney(data.subtotal)}</span>
          </div>
          ${data.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #b91c1c;">
              <span>Descuento:</span>
              <span>-${App.formatMoney(data.discount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
            <span>TOTAL:</span>
            <span>${App.formatMoney(data.total)}</span>
          </div>
          <div style="text-align: right; font-size: 0.78rem; color: #555; margin-bottom: 4px;">
            Equiv: ${App.formatDual(data.total)}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-top: 4px;">
            <span>Medio de Pago:</span>
            <span>${data.payment_method}</span>
          </div>
          ${data.payment_method === 'Efectivo' && data.amount_paid ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
              <span>Abonó con:</span>
              <span>${App.formatMoney(data.amount_paid)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: bold;">
              <span>Vuelto:</span>
              <span>${App.formatMoney(data.change_amount)}</span>
            </div>
          ` : ''}
        </div>

        <div class="ticket-footer">
          <div style="font-weight: bold; font-size: 0.88rem; color: #000;">¡Muchas gracias por su preferencia y compra! 💈✂️</div>
          <div style="font-size: 0.72rem; color: #555; margin-top: 3px;">MF Barber &amp; Lounge</div>
        </div>
      </div>
    `;
  },

  printCurrentReceipt() {
    const area = document.getElementById('printable-receipt-area');
    if (!area) return;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    printWin.document.write(`
      <html>
        <head>
          <title>Imprimir Ticket</title>
          <style>
            body { font-family: monospace; padding: 10px; margin: 0; color: #000; }
            .ticket-receipt { width: 100%; max-width: 320px; margin: auto; }
            .ticket-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .ticket-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
            .ticket-table th { border-bottom: 1px solid #000; text-align: left; }
            .ticket-totals { border-top: 1px dashed #000; padding-top: 6px; }
            .ticket-footer { text-align: center; font-size: 11px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${area.innerHTML}
        </body>
      </html>
    `);
    printWin.document.close();
  },

  sendReceiptWhatsApp() {
    if (!this.currentReceiptData) return;
    const d = this.currentReceiptData;
    if (!d.client_phone) {
      App.toast('El cliente no tiene teléfono para enviar por WhatsApp', 'error');
      return;
    }

    let itemsText = '';
    if (d.items) {
      itemsText = d.items.map(it => `• ${it.quantity}x ${it.item_name} (${App.formatMoney(it.subtotal)})`).join('\n');
    }

    const rate = App.exchangeRate || 7500;
    const usdVal = (d.total / rate).toFixed(2);
    const pygVal = Math.round(d.total).toLocaleString('es-PY');

    const msg = `💈 *MF BARBER & LOUNGE* 💈\n` +
      `🧾 *COMPROBANTE DE COMPRA*\n` +
      `Ticket: #TK-${String(d.id).padStart(5, '0')}\n` +
      `Cliente: *${d.client_name}*\n` +
      `Fecha: ${d.created_at}\n\n` +
      `*DETALLE DE COMPRA:*\n${itemsText}\n\n` +
      `💰 *TOTAL PAGADO:* ₲ ${pygVal} (≈ US$ ${usdVal})\n` +
      `💳 *Medio de Pago:* ${d.payment_method}\n` +
      (d.amount_paid && d.payment_method === 'Efectivo' ? `💵 *Abonó:* ${App.formatMoney(d.amount_paid)} | *Vuelto:* ${App.formatMoney(d.change_amount)}\n` : '') +
      `\n🤝 *¡Muchas gracias por su preferencia y compra!* ✨`;

    App.sendWhatsApp(d.client_phone, msg);
  }
};

window.Sales = Sales;
