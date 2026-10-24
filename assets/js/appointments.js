/**
 * BarberApp Pro - Appointments & Agenda Controller
 */

const Appointments = {
  currentDate: new Date().toISOString().split('T')[0],
  currentStatus: 'all',
  cachedServices: [],
  cachedClients: [],

  async load() {
    this.setupDateFilter();
    await this.fetchOptions();
    await this.fetchAppointments();
  },

  setupDateFilter() {
    const dateInput = document.getElementById('appointment-filter-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = this.currentDate;
      dateInput.addEventListener('change', (e) => {
        this.currentDate = e.target.value;
        this.fetchAppointments();
      });
    }

    // Status filter buttons
    document.querySelectorAll('.app-status-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.app-status-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentStatus = btn.getAttribute('data-status');
        this.fetchAppointments();
      });
    });
  },

  setFilterDate(type) {
    const today = new Date();
    if (type === 'today') {
      this.currentDate = today.toISOString().split('T')[0];
    } else if (type === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.currentDate = tomorrow.toISOString().split('T')[0];
    } else if (type === 'all') {
      this.currentDate = '';
    }
    const dateInput = document.getElementById('appointment-filter-date');
    if (dateInput) dateInput.value = this.currentDate;
    this.fetchAppointments();
  },

  async fetchOptions() {
    try {
      const [resClients, resServices] = await Promise.all([
        fetch('api/clients.php?action=list'),
        fetch('api/services.php?action=list&active=1')
      ]);
      const jsonClients = await resClients.json();
      const jsonServices = await resServices.json();

      if (jsonClients.success) this.cachedClients = jsonClients.data;
      if (jsonServices.success) this.cachedServices = jsonServices.data;

      this.populateSelects();
    } catch (e) {
      console.error('Error fetching appointment options:', e);
    }
  },

  populateSelects() {
    const clientSelect = document.getElementById('app-modal-client');
    const serviceSelect = document.getElementById('app-modal-service');

    if (clientSelect) {
      clientSelect.innerHTML = '<option value="">-- Seleccione Cliente --</option>' +
        this.cachedClients.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
    }

    if (serviceSelect) {
      serviceSelect.innerHTML = '<option value="">-- Seleccione Servicio / Corte --</option>' +
        this.cachedServices.map(s => `<option value="${s.id}">${s.name} - ${App.formatMoney(s.price)} (${s.duration} min)</option>`).join('');
    }
  },

  async fetchAppointments() {
    const container = document.getElementById('appointments-list-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin" style="font-size: 2rem; color: var(--gold-primary);"></i></div>`;

    try {
      let url = 'api/appointments.php?action=list';
      if (this.currentDate) url += `&date=${this.currentDate}`;
      if (this.currentStatus && this.currentStatus !== 'all') url += `&status=${encodeURIComponent(this.currentStatus)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        this.renderAppointments(json.data);
      }
    } catch (e) {
      console.error(e);
      container.innerHTML = `<p style="color: var(--rose); text-align: center;">Error al cargar las reservas.</p>`;
    }
  },

  renderAppointments(appointments) {
    const container = document.getElementById('appointments-list-container');
    if (!container) return;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 20px;">
          <i class="bi bi-calendar-x" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: 12px;"></i>
          <h3 style="color: #fff; margin-bottom: 6px;">No hay turnos para la fecha seleccionada</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">Puedes agendar una nueva reserva con el botón superior.</p>
          <button class="btn btn-gold" onclick="Appointments.openNewModal()">
            <i class="bi bi-calendar-plus"></i> Agendar Turno
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
                <th>Fecha / Hora</th>
                <th>Cliente & Contacto</th>
                <th>Servicio Solicitado</th>
                <th>Barbero</th>
                <th>Estado</th>
                <th>Notas</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
    `;

    // 2. Mobile Cards View
    let mobileHtml = `<div class="mobile-card-list mobile-card-view">`;

    appointments.forEach(a => {
      let badgeClass = 'badge-gold';
      if (a.status === 'Confirmada') badgeClass = 'badge-emerald';
      if (a.status === 'En Proceso') badgeClass = 'badge-sky';
      if (a.status === 'Completada') badgeClass = 'badge-purple';
      if (a.status === 'Cancelada') badgeClass = 'badge-rose';

      // Row for desktop
      desktopHtml += `
        <tr>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; color: var(--gold-light); font-size: 1rem;">${a.appointment_time} hs</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">${App.formatDate(a.appointment_date)}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${a.client_name}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
              <i class="bi bi-telephone text-gold"></i> ${a.client_phone}
            </div>
          </td>
          <td>
            <div style="font-weight: 600;">${a.service_name}</div>
            <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--gold-light);">
              ${App.formatMoney(a.service_price)} <span style="color: var(--text-muted); font-size: 0.74rem;">(${a.service_duration} min)</span>
            </div>
          </td>
          <td>
            <span style="font-size: 0.86rem; color: var(--text-primary);"><i class="bi bi-person-badge"></i> ${a.barber_name}</span>
          </td>
          <td>
            <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: auto; font-weight: 600;" onchange="Appointments.updateStatus(${a.id}, this.value)">
              <option value="Confirmada" ${a.status === 'Confirmada' ? 'selected' : ''}>✅ Confirmada</option>
              <option value="Cancelada" ${a.status === 'Cancelada' ? 'selected' : ''}>❌ Cancelada</option>
            </select>
          </td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${a.notes || '-'}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-whatsapp btn-sm" title="WhatsApp comprobante" onclick="Appointments.sendWhatsAppReminder(${a.id}, '${encodeURIComponent(a.client_name)}', '${a.client_phone}', '${encodeURIComponent(a.service_name)}', '${a.appointment_time}', '${a.appointment_date}', '${encodeURIComponent(a.barber_name)}')">
                <i class="bi bi-whatsapp"></i>
              </button>
              <button class="btn btn-secondary btn-sm" title="Ver Comprobante" onclick="Appointments.viewAppointmentTicketById(${a.id})">
                <i class="bi bi-receipt"></i>
              </button>
              ${a.status !== 'Completada' ? `
                <button class="btn btn-gold btn-sm" title="Cobrar en caja" onclick="POS.startSaleFromAppointment(${a.id}, ${a.client_id}, ${a.service_id})">
                  <i class="bi bi-cash-coin"></i> Cobrar
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.6;"><i class="bi bi-check2"></i> Cobrado</button>
              `}
              <button class="btn btn-danger btn-sm" title="Eliminar turno" onclick="Appointments.deleteAppointment(${a.id})">
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
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-family: var(--font-mono); font-weight: 800; color: var(--gold-light); font-size: 1.15rem;">
                ${a.appointment_time} hs
              </span>
              <span style="font-size: 0.74rem; color: var(--text-muted);">${App.formatDate(a.appointment_date)}</span>
            </div>
            <select class="form-control" style="padding: 3px 6px; font-size: 0.76rem; width: auto; font-weight: 600;" onchange="Appointments.updateStatus(${a.id}, this.value)">
              <option value="Confirmada" ${a.status === 'Confirmada' ? 'selected' : ''}>✅ Confirmada</option>
              <option value="Cancelada" ${a.status === 'Cancelada' ? 'selected' : ''}>❌ Cancelada</option>
            </select>
          </div>
          <div class="mobile-item-card-title">${a.client_name}</div>
          <div class="mobile-item-card-meta">
            <span style="color: var(--text-gold);"><i class="bi bi-telephone"></i> ${a.client_phone}</span>
            <span><i class="bi bi-scissors"></i> ${a.service_name}</span>
            <span style="color: var(--text-muted);"><i class="bi bi-person-badge"></i> ${a.barber_name}</span>
            <span style="font-family: var(--font-mono); color: var(--emerald); font-weight: 700; margin-left: auto;">
              ${App.formatMoney(a.service_price)}
            </span>
          </div>
          <div class="mobile-item-card-footer">
            <button class="btn btn-whatsapp btn-sm" onclick="Appointments.sendWhatsAppReminder(${a.id}, '${encodeURIComponent(a.client_name)}', '${a.client_phone}', '${encodeURIComponent(a.service_name)}', '${a.appointment_time}', '${a.appointment_date}', '${encodeURIComponent(a.barber_name)}')">
              <i class="bi bi-whatsapp"></i> WhatsApp
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Appointments.viewAppointmentTicketById(${a.id})">
              <i class="bi bi-receipt"></i> Comprobante
            </button>
            ${a.status !== 'Completada' ? `
              <button class="btn btn-gold btn-sm" style="flex: 1;" onclick="POS.startSaleFromAppointment(${a.id}, ${a.client_id}, ${a.service_id})">
                <i class="bi bi-cash-coin"></i> Cobrar
              </button>
            ` : `
              <span class="badge badge-emerald" style="padding: 6px 10px;"><i class="bi bi-check2"></i> Cobrado</span>
            `}
            <button class="btn btn-danger btn-sm btn-icon" onclick="Appointments.deleteAppointment(${a.id})">
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

  setModalDate(type) {
    const today = new Date();
    let d = today;
    if (type === 'tomorrow') {
      d = new Date(today);
      d.setDate(d.getDate() + 1);
    }
    const dateInput = document.getElementById('app-modal-date');
    if (dateInput) dateInput.value = d.toISOString().split('T')[0];
  },

  toggleNewClientInput() {
    const wrapSelect = document.getElementById('app-modal-client-select-wrap');
    const wrapNew = document.getElementById('app-modal-new-client-wrap');
    const btn = document.getElementById('btn-toggle-app-new-client');
    if (!wrapSelect || !wrapNew) return;

    const isNew = wrapNew.style.display !== 'none';
    if (isNew) {
      wrapNew.style.display = 'none';
      wrapSelect.style.display = 'block';
      if (btn) btn.innerHTML = '<i class="bi bi-person-plus-fill"></i> + Nuevo Cliente';
    } else {
      wrapNew.style.display = 'block';
      wrapSelect.style.display = 'none';
      if (btn) btn.innerHTML = '<i class="bi bi-list-ul"></i> Elegir de la Lista';
      const inputName = document.getElementById('app-modal-quick-name');
      if (inputName) inputName.focus();
    }
  },

  openNewModal() {
    this.populateSelects();
    document.getElementById('app-modal-form').reset();
    
    // Reset client toggle view
    const wrapSelect = document.getElementById('app-modal-client-select-wrap');
    const wrapNew = document.getElementById('app-modal-new-client-wrap');
    const btn = document.getElementById('btn-toggle-app-new-client');
    if (wrapSelect) wrapSelect.style.display = 'block';
    if (wrapNew) wrapNew.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="bi bi-person-plus-fill"></i> + Nuevo Cliente';

    document.getElementById('app-modal-date').value = this.currentDate || new Date().toISOString().split('T')[0];
    document.getElementById('app-modal-time').value = '14:00';
    App.openModal('modal-new-appointment');
  },

  async saveAppointment(e) {
    e.preventDefault();
    const wrapNew = document.getElementById('app-modal-new-client-wrap');
    const isNewClientMode = wrapNew && wrapNew.style.display !== 'none';

    let clientId = document.getElementById('app-modal-client') ? document.getElementById('app-modal-client').value : '';
    let clientName = '';
    let clientPhone = '';

    // Handle instant inline new client creation
    if (isNewClientMode) {
      const quickName = document.getElementById('app-modal-quick-name').value.trim();
      const quickPhone = document.getElementById('app-modal-quick-phone').value.trim();

      if (!quickName || !quickPhone) {
        App.toast('Ingresa el nombre y teléfono del cliente', 'error');
        return;
      }

      try {
        const resClient = await fetch('api/clients.php?action=create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: quickName, phone: quickPhone })
        });
        const jsonClient = await resClient.json();
        if (jsonClient.success && jsonClient.id) {
          clientId = jsonClient.id;
          clientName = quickName;
          clientPhone = quickPhone;
          await this.fetchOptions();
        } else {
          App.toast(jsonClient.error || 'Error al registrar cliente', 'error');
          return;
        }
      } catch (err) {
        App.toast('Error al crear cliente', 'error');
        return;
      }
    } else {
      if (!clientId) {
        App.toast('Por favor selecciona un cliente de la lista o presiona + Nuevo Cliente', 'error');
        return;
      }
      const existing = this.cachedClients.find(c => c.id == clientId);
      if (existing) {
        clientName = existing.name;
        clientPhone = existing.phone;
      }
    }

    // Default service fallback (service is specified at checkout)
    const defaultService = (this.cachedServices && this.cachedServices.length > 0) ? this.cachedServices[0] : { id: 1, name: 'Corte / Turno General', price: 35000, duration: 30 };
    const serviceId = defaultService.id || 1;
    const date = document.getElementById('app-modal-date').value;
    const time = document.getElementById('app-modal-time').value;
    const barberName = 'Gastón (Master Barber)';
    const status = 'Confirmada';
    const notes = '';

    if (!date || !time) {
      App.toast('Selecciona fecha y hora del turno', 'error');
      return;
    }

    const data = {
      client_id: clientId,
      service_id: serviceId,
      barber_name: barberName,
      appointment_date: date,
      appointment_time: time,
      status: status,
      notes: notes
    };

    try {
      const res = await fetch('api/appointments.php?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (json.success) {
        App.toast(`¡Turno agendado para ${clientName}!`, 'success');
        App.closeModal('modal-new-appointment');
        this.fetchAppointments();
        if (typeof Dashboard !== 'undefined') Dashboard.load();

        // Show confirmation ticket
        this.viewAppointmentTicket({
          id: json.appointment_id || json.id || '',
          client_name: clientName || 'Cliente',
          client_phone: clientPhone || '',
          service_name: defaultService.name || 'Corte & Barbería',
          service_price: defaultService.price || 0,
          service_duration: defaultService.duration || 30,
          barber_name: barberName,
          appointment_date: date,
          appointment_time: time
        });
      } else {
        App.toast(json.error || 'Error al agendar el turno', 'error');
      }
    } catch (err) {
      App.toast('Error de conexión', 'error');
    }
  },

  viewAppointmentTicketById(id) {
    // Find in current appointments
    fetch(`api/appointments.php?action=list`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const app = json.data.find(a => a.id == id);
          if (app) {
            this.viewAppointmentTicket(app);
          } else {
            App.toast('Turno no encontrado', 'error');
          }
        }
      })
      .catch(() => App.toast('Error al consultar turno', 'error'));
  },

  viewAppointmentTicket(appData) {
    this.currentTicketData = appData;
    const container = document.getElementById('appointment-ticket-content');
    if (!container) return;

    container.innerHTML = `
      <div class="ticket-receipt" id="printable-app-receipt-area">
        <div class="ticket-header">
          <div class="ticket-title">💈 MF BARBER & LOUNGE 💈</div>
          <div style="font-size: 0.8rem; color: #555;">Avda. Principal · Asunción</div>
          <div style="margin-top: 6px; font-weight: bold; font-size: 0.95rem; color: #000;">
            COMPROBANTE DE TURNO AGENDADO
          </div>
          ${appData.id ? `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">Reserva: #TR-${String(appData.id).padStart(5, '0')}</div>` : ''}
        </div>

        <div style="margin-bottom: 12px; font-size: 0.88rem; border-bottom: 1px dashed #000; padding-bottom: 10px;">
          <div style="margin-bottom: 5px;"><strong>Cliente:</strong> ${appData.client_name}</div>
          ${appData.client_phone ? `<div style="margin-bottom: 5px;"><strong>Teléfono:</strong> ${appData.client_phone}</div>` : ''}
          <div style="margin-bottom: 5px;"><strong>Fecha:</strong> ${App.formatDate(appData.appointment_date)}</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #000; margin-top: 8px;">
            <strong>Hora del Turno:</strong> ${appData.appointment_time} hs
          </div>
        </div>

        <!-- Box de Puntualidad & 5 Min Tolerancia -->
        <div style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.82rem; text-align: center; color: #0f172a;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 3px; font-size: 0.9rem;">
            ⏱️ PUNTUALIDAD
          </div>
          <div>Rogamos puntualidad para garantizar la mejor experiencia de atención.</div>
          <div style="font-weight: 800; color: #b91c1c; margin-top: 5px; font-size: 0.86rem;">
            El tiempo de espera después del turno es de 5 minutos de tolerancia.
          </div>
        </div>

        <div class="ticket-footer">
          <div style="font-weight: bold; font-size: 0.9rem; color: #000;">¡Muchas gracias por su preferencia! 💈✂️</div>
          <div style="font-size: 0.72rem; color: #555; margin-top: 3px;">MF Barber &amp; Lounge</div>
        </div>
      </div>
    `;

    App.openModal('modal-appointment-ticket');
  },

  shareCurrentTicketWhatsApp() {
    if (!this.currentTicketData) return;
    const a = this.currentTicketData;
    this.sendWhatsAppReminder(
      a.id,
      encodeURIComponent(a.client_name),
      a.client_phone,
      encodeURIComponent(a.service_name || 'Corte & Barbería'),
      a.appointment_time,
      a.appointment_date,
      encodeURIComponent(a.barber_name || '')
    );
  },

  printCurrentAppointmentTicket() {
    const area = document.getElementById('printable-app-receipt-area');
    if (!area) return;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Comprobante de Turno</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 0; padding: 16px; background: #fff; color: #000; }
            .ticket-receipt { width: 100%; max-width: 320px; margin: auto; }
            .ticket-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .ticket-footer { text-align: center; font-size: 11px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${area.innerHTML}
        </body>
        </html>
      `);
      printWin.document.close();
    }
  },

  async updateStatus(id, newStatus) {
    try {
      const res = await fetch('api/appointments.php?action=update_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        App.toast('Estado actualizado', 'success');
      }
    } catch (e) {
      App.toast('Error al actualizar estado', 'error');
    }
  },

  async deleteAppointment(id) {
    if (!confirm('¿Seguro que deseas eliminar este turno?')) return;
    try {
      const res = await fetch('api/appointments.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) {
        App.toast('Turno eliminado', 'success');
        this.fetchAppointments();
      }
    } catch (e) {
      App.toast('Error al eliminar', 'error');
    }
  },

  sendWhatsAppReminder(id, clientNameEncoded, phone, serviceNameEncoded, time, date = null, barber = null) {
    const clientName = decodeURIComponent(clientNameEncoded);
    const formattedDate = date ? App.formatDate(date) : 'la fecha seleccionada';

    const message = 
      `💈 *MF BARBER & LOUNGE* 💈\n\n` +
      `¡Hola *${clientName}*! 👋\n` +
      `Te confirmamos los datos de tu reserva de turno:\n\n` +
      `📅 *Fecha:* ${formattedDate}\n` +
      `⏰ *Hora del Turno:* ${time} hs\n\n` +
      `⏱️ *PUNTUALIDAD:*\n` +
      `Rogamos puntualidad para garantizar la mejor experiencia de atención. El tiempo de espera después del turno es de *5 minutos de tolerancia*.\n\n` +
      `🤝 *¡Muchas gracias por su preferencia!* ✨\n` +
      `_MF Barber & Lounge_`;

    App.sendWhatsApp(phone, message);
  }
};

window.Appointments = Appointments;
