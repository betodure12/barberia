/**
 * BarberApp Pro - Dashboard Controller
 */

const Dashboard = {
  async load() {
    try {
      const res = await fetch('api/dashboard.php');
      const json = await res.json();
      if (json.success) {
        this.renderStats(json.data);
        this.renderAppointments(json.data.today_appointments);
        this.renderLowStock(json.data.low_stock_products);
        this.renderCategoryBreakdown(json.data.sales_by_category);
        this.renderTrend(json.data.revenue_trend);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      App.toast('Error al conectar con el servidor', 'error');
    }
  },

  renderStats(data) {
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('dash-revenue-today', App.formatMoney(data.revenue_today));
    setTxt('dash-sales-count-today', `${data.sales_count_today} ventas hoy`);
    setTxt('dash-appointments-today', data.appointments_today_count);
    setTxt('dash-clients-count', data.total_clients);
    setTxt('dash-revenue-month', App.formatMoney(data.revenue_month));
    setTxt('dash-sales-month-count', `${data.sales_count_month} ventas mes`);

    // Welcome Landing stats
    setTxt('welcome-revenue-today', App.formatMoney(data.revenue_today));
    setTxt('welcome-sales-count-today', `${data.sales_count_today} ventas hoy`);
    setTxt('welcome-appointments-today', data.appointments_today_count);
    setTxt('welcome-clients-count', data.total_clients);
    setTxt('welcome-revenue-month', App.formatMoney(data.revenue_month));
    setTxt('welcome-sales-month-count', `${data.sales_count_month} ventas mes`);

    // Low stock count badge in sidebar
    const lowStockCount = data.low_stock_products ? data.low_stock_products.length : 0;
    const badgeEl = document.getElementById('badge-low-stock');
    if (badgeEl) {
      if (lowStockCount > 0) {
        badgeEl.textContent = lowStockCount;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  },

  renderAppointments(appointments) {
    const container = document.getElementById('dash-today-appointments-list');
    const wContainer = document.getElementById('welcome-today-appointments-list');
    if (!container && !wContainer) return;

    if (!appointments || appointments.length === 0) {
      const emptyHtml = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <i class="bi bi-calendar-check" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
          No hay reservas programadas para hoy
        </div>
      `;
      if (container) container.innerHTML = emptyHtml;
      if (wContainer) wContainer.innerHTML = emptyHtml;
      return;
    }

    // 1. Desktop Table
    let desktopHtml = `
      <div class="table-responsive desktop-table-view">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Barbero</th>
              <th>Estado</th>
              <th style="text-align: right;">Acción</th>
            </tr>
          </thead>
          <tbody>
    `;

    // 2. Mobile Cards
    let mobileHtml = `<div class="mobile-card-list mobile-card-view">`;

    appointments.forEach(a => {
      let badgeClass = 'badge-gold';
      if (a.status === 'Confirmada') badgeClass = 'badge-emerald';
      if (a.status === 'En Proceso') badgeClass = 'badge-sky';
      if (a.status === 'Completada') badgeClass = 'badge-purple';
      if (a.status === 'Cancelada') badgeClass = 'badge-rose';

      desktopHtml += `
        <tr>
          <td><strong style="font-family: var(--font-mono); font-size: 0.95rem; color: var(--gold-light);">${a.appointment_time} hs</strong></td>
          <td>
            <div style="font-weight: 700; color: #fff;">${a.client_name}</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);"><i class="bi bi-telephone"></i> ${a.client_phone}</div>
          </td>
          <td>
            <div>${a.service_name}</div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-gold);">${App.formatMoney(a.service_price)}</div>
          </td>
          <td><span style="font-size: 0.82rem; color: var(--text-secondary);">${a.barber_name}</span></td>
          <td><span class="badge ${badgeClass}">${a.status}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-whatsapp btn-sm" title="Enviar recordatorio WhatsApp" onclick="Appointments.sendWhatsAppReminder(${a.id}, '${encodeURIComponent(a.client_name)}', '${a.client_phone}', '${encodeURIComponent(a.service_name)}', '${a.appointment_time}', '${a.appointment_date}', '${encodeURIComponent(a.barber_name || '')}')">
              <i class="bi bi-whatsapp"></i>
            </button>
            ${a.status !== 'Completada' ? `
              <button class="btn btn-gold btn-sm" title="Cobrar en caja" onclick="POS.startSaleFromAppointment(${a.id}, ${a.client_id}, ${a.service_id})">
                <i class="bi bi-cash-coin"></i> Cobrar
              </button>
            ` : `
              <span class="badge badge-emerald"><i class="bi bi-check2"></i> Cobrado</span>
            `}
          </td>
        </tr>
      `;

      mobileHtml += `
        <div class="mobile-item-card">
          <div class="mobile-item-card-header">
            <span style="font-family: var(--font-mono); font-weight: 800; color: var(--gold-light); font-size: 1.1rem;">
              ${a.appointment_time} hs
            </span>
            <span class="badge ${badgeClass}">${a.status}</span>
          </div>
          <div class="mobile-item-card-title">${a.client_name}</div>
          <div class="mobile-item-card-meta">
            <span style="color: var(--text-gold);"><i class="bi bi-telephone"></i> ${a.client_phone}</span>
            <span><i class="bi bi-scissors"></i> ${a.service_name}</span>
            <span style="font-family: var(--font-mono); color: var(--emerald); font-weight: 700; margin-left: auto;">${App.formatMoney(a.service_price)}</span>
          </div>
          <div class="mobile-item-card-footer">
            <button class="btn btn-whatsapp btn-sm" onclick="Appointments.sendWhatsAppReminder(${a.id}, '${encodeURIComponent(a.client_name)}', '${a.client_phone}', '${encodeURIComponent(a.service_name)}', '${a.appointment_time}', '${a.appointment_date}', '${encodeURIComponent(a.barber_name || '')}')">
              <i class="bi bi-whatsapp"></i> Recordar
            </button>
            ${a.status !== 'Completada' ? `
              <button class="btn btn-gold btn-sm" style="flex: 1;" onclick="POS.startSaleFromAppointment(${a.id}, ${a.client_id}, ${a.service_id})">
                <i class="bi bi-cash-coin"></i> Cobrar en POS
              </button>
            ` : `
              <span class="badge badge-emerald" style="padding: 6px 12px;"><i class="bi bi-check2"></i> Cobrado</span>
            `}
          </div>
        </div>
      `;
    });

    desktopHtml += `</tbody></table></div>`;
    mobileHtml += `</div>`;
    if (container) container.innerHTML = desktopHtml + mobileHtml;
    if (wContainer) wContainer.innerHTML = desktopHtml + mobileHtml;
  },

  renderLowStock(lowStock) {
    const container = document.getElementById('dash-low-stock-list');
    if (!container) return;

    if (!lowStock || lowStock.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--emerald); font-size: 0.9rem;">
          <i class="bi bi-shield-check" style="font-size: 1.8rem; display: block; margin-bottom: 6px;"></i>
          ¡Todos los productos tienen stock saludable!
        </div>
      `;
      return;
    }

    let html = `<div class="table-responsive"><table class="custom-table"><tbody>`;
    lowStock.forEach(p => {
      let catClass = 'category-badge-' + p.category;
      let catLabels = { decant: 'Decant', perfume: 'Perfume', alcohol: 'Alcohol', no_alcohol: 'Sin Alcohol', otro: 'Otro' };
      html += `
        <tr>
          <td>
            <div style="font-weight: 700;">${p.name}</div>
            <span class="badge ${catClass}">${catLabels[p.category] || p.category}</span>
          </td>
          <td>
            <span class="badge badge-rose" style="font-size: 0.82rem;">
              <i class="bi bi-exclamation-triangle"></i> Quedan: <strong>${p.stock}</strong> (mín: ${p.min_stock})
            </span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-outline-gold btn-sm" onclick="Inventory.openStockModal(${p.id}, '${encodeURIComponent(p.name)}', ${p.stock})">
              <i class="bi bi-plus-circle"></i> Reponer
            </button>
          </td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
  },

  renderCategoryBreakdown(categories) {
    const container = document.getElementById('dash-category-breakdown');
    if (!container) return;

    if (!categories || categories.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Sin ventas registradas aún</p>`;
      return;
    }

    let totalAll = categories.reduce((sum, c) => sum + parseFloat(c.total_amount), 0) || 1;

    let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;
    categories.forEach(c => {
      let percent = Math.round((c.total_amount / totalAll) * 100);
      html += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span style="font-weight: 600; color: #fff;">${c.category_label}</span>
            <span style="font-family: var(--font-mono); color: var(--gold-light);">${App.formatMoney(c.total_amount)} (${percent}%)</span>
          </div>
          <div style="background: rgba(255,255,255,0.06); height: 8px; border-radius: var(--radius-full); overflow: hidden;">
            <div style="background: var(--gold-gradient); width: ${percent}%; height: 100%; border-radius: var(--radius-full);"></div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  },

  renderTrend(trend) {
    const container = document.getElementById('dash-revenue-trend-chart');
    if (!container) return;

    if (!trend || trend.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">Sin datos de tendencia</p>`;
      return;
    }

    let max = Math.max(...trend.map(t => t.total), 1);

    let html = `<div style="display: flex; align-items: flex-end; justify-content: space-between; height: 160px; gap: 12px; padding: 10px 0;">`;
    trend.forEach(item => {
      let heightPercent = Math.max(12, Math.round((item.total / max) * 100));
      html += `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;">
          <div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-gold); margin-bottom: 4px;">
            ${item.total > 0 ? App.formatMoney(item.total) : '$0'}
          </div>
          <div style="width: 100%; max-width: 38px; height: ${heightPercent}%; background: var(--gold-gradient); border-radius: 6px 6px 0 0; opacity: ${item.total > 0 ? 1 : 0.25}; transition: height 0.4s ease;"></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; font-weight: 600;">${item.day_label}</div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }
};

window.Dashboard = Dashboard;
