/**
 * BarberApp Pro - Clients CRM Controller
 */

const Clients = {
  clientsList: [],
  searchTerm: '',

  async load() {
    this.setupSearch();
    await this.fetchClients();
  },

  setupSearch() {
    const input = document.getElementById('client-search-input');
    if (input) {
      let debounce;
      input.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.searchTerm = e.target.value.toLowerCase();
          this.renderClients();
        }, 200);
      });
    }
  },

  async fetchClients() {
    const container = document.getElementById('clients-list-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin" style="font-size: 2rem; color: var(--gold-primary);"></i></div>`;

    try {
      const res = await fetch('api/clients.php?action=list');
      const json = await res.json();

      if (json.success) {
        this.clientsList = json.data;
        this.renderClients();
      }
    } catch (e) {
      container.innerHTML = `<p style="color: var(--rose); text-align: center;">Error al cargar los clientes.</p>`;
    }
  },

  renderClients() {
    const container = document.getElementById('clients-list-container');
    if (!container) return;

    let filtered = this.clientsList;
    if (this.searchTerm) {
      filtered = filtered.filter(c => 
        (c.name && c.name.toLowerCase().includes(this.searchTerm)) ||
        (c.phone && c.phone.toLowerCase().includes(this.searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(this.searchTerm)) ||
        (c.notes && c.notes.toLowerCase().includes(this.searchTerm))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 50px 20px;">
          <i class="bi bi-people" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: 10px;"></i>
          <h3 style="color: #fff; margin-bottom: 6px;">No se encontraron clientes</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">Prueba con otra búsqueda o registra un nuevo cliente.</p>
          <button class="btn btn-gold" onclick="Clients.openNewModal()">
            <i class="bi bi-person-plus"></i> Registrar Cliente
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
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Notas & Estilo</th>
                <th>Turnos Totales</th>
                <th>Total Invertido</th>
                <th>Última Visita</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
    `;

    // 2. Mobile Cards View
    let mobileHtml = `<div class="mobile-card-list mobile-card-view">`;

    filtered.forEach(c => {
      // Row for desktop
      desktopHtml += `
        <tr>
          <td>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${c.name}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">Registrado: ${App.formatDate(c.created_at ? c.created_at.split(' ')[0] : '')}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-gold);"><i class="bi bi-telephone"></i> ${c.phone}</div>
            ${c.email ? `<div style="font-size: 0.76rem; color: var(--text-muted);">${c.email}</div>` : ''}
          </td>
          <td>
            <span style="font-size: 0.82rem; color: var(--text-secondary);">${c.notes || '<em style="color: var(--text-muted);">Sin notas</em>'}</span>
          </td>
          <td>
            <span class="badge badge-sky" style="font-family: var(--font-mono); font-size: 0.85rem;">
              <i class="bi bi-calendar-event"></i> ${c.total_appointments || 0}
            </span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--emerald); font-size: 0.95rem;">
              ${App.formatMoney(c.total_spent)}
            </span>
          </td>
          <td>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${c.last_visit ? App.formatDate(c.last_visit) : 'Nunca'}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-gold btn-sm" title="Cobrar / Registrar Atención" onclick="POS.startSaleForClient(${c.id}, '${encodeURIComponent(c.name)}')">
                <i class="bi bi-cash-coin"></i> Cobrar
              </button>
              <button class="btn btn-whatsapp btn-sm" title="Enviar WhatsApp" onclick="Clients.openWhatsAppModal('${c.phone}', '${encodeURIComponent(c.name)}')">
                <i class="bi bi-whatsapp"></i>
              </button>
              <button class="btn btn-outline btn-sm" title="Ver historial" onclick="Clients.viewHistory(${c.id})">
                <i class="bi bi-clock-history"></i>
              </button>
              <button class="btn btn-secondary btn-sm" title="Editar" onclick="Clients.openEditModal(${c.id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-danger btn-sm" title="Eliminar" onclick="Clients.deleteClient(${c.id})">
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
            <div class="mobile-item-card-title">${c.name}</div>
            <button class="btn btn-whatsapp btn-sm" onclick="Clients.openWhatsAppModal('${c.phone}', '${encodeURIComponent(c.name)}')">
              <i class="bi bi-whatsapp"></i> WhatsApp
            </button>
          </div>
          <div class="mobile-item-card-meta">
            <span style="color: var(--text-gold); font-weight: 600;"><i class="bi bi-telephone"></i> ${c.phone}</span>
            <span class="badge badge-sky" style="font-family: var(--font-mono);">${c.total_appointments || 0} turnos</span>
            <span style="font-family: var(--font-mono); color: var(--emerald); font-weight: 700; margin-left: auto;">${App.formatMoney(c.total_spent)}</span>
          </div>
          ${c.notes ? `<div style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-input); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px;"><strong>Estilo:</strong> ${c.notes}</div>` : ''}
          <div class="mobile-item-card-footer">
            <button class="btn btn-gold btn-sm" style="flex: 1;" onclick="POS.startSaleForClient(${c.id}, '${encodeURIComponent(c.name)}')">
              <i class="bi bi-cash-coin"></i> Cobrar / Vender
            </button>
            <button class="btn btn-outline-gold btn-sm" onclick="Clients.viewHistory(${c.id})">
              <i class="bi bi-clock-history"></i> Ficha
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Clients.openEditModal(${c.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="Clients.deleteClient(${c.id})">
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
    document.getElementById('client-modal-form').reset();
    document.getElementById('client-modal-id').value = '';
    document.getElementById('client-modal-title').innerHTML = '<i class="bi bi-person-plus"></i> Nuevo Cliente';
    App.openModal('modal-client');
  },

  openEditModal(id) {
    const c = this.clientsList.find(item => item.id == id);
    if (!c) return;

    document.getElementById('client-modal-id').value = c.id;
    document.getElementById('client-modal-name').value = c.name;
    document.getElementById('client-modal-phone').value = c.phone;
    document.getElementById('client-modal-email').value = c.email || '';
    document.getElementById('client-modal-notes').value = c.notes || '';
    document.getElementById('client-modal-title').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Cliente';

    App.openModal('modal-client');
  },

  async saveClient(e) {
    e.preventDefault();
    const id = document.getElementById('client-modal-id').value;
    const data = {
      id: id,
      name: document.getElementById('client-modal-name').value,
      phone: document.getElementById('client-modal-phone').value,
      email: document.getElementById('client-modal-email').value,
      notes: document.getElementById('client-modal-notes').value
    };

    const action = id ? 'update' : 'create';

    try {
      const res = await fetch(`api/clients.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (json.success) {
        App.toast(id ? 'Cliente actualizado' : 'Cliente registrado exitosamente', 'success');
        App.closeModal('modal-client');
        this.fetchClients();
        if (typeof Appointments !== 'undefined') Appointments.fetchOptions();
        if (typeof POS !== 'undefined') {
          const newClientId = (!id && json.id) ? json.id : null;
          POS.loadClients(newClientId);
          if (POS.pendingSelectNewClient && newClientId) {
            App.toast('Cliente asignado automáticamente al ticket', 'info');
            POS.pendingSelectNewClient = false;
          }
        }
      } else {
        App.toast(json.error || 'Error al guardar cliente', 'error');
      }
    } catch (err) {
      App.toast('Error de conexión', 'error');
    }
  },

  async deleteClient(id) {
    if (!confirm('¿Seguro que deseas eliminar este cliente? Se borrarán sus turnos asociados.')) return;

    try {
      const res = await fetch('api/clients.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) {
        App.toast('Cliente eliminado', 'success');
        this.fetchClients();
      }
    } catch (e) {
      App.toast('Error al eliminar cliente', 'error');
    }
  },

  openWhatsAppModal(phone, nameEncoded) {
    const name = decodeURIComponent(nameEncoded);
    const msg = prompt(`Escribe el mensaje para enviar por WhatsApp a ${name}:`, `¡Hola ${name}! Te saludamos desde la Barbería 💈. `);
    if (msg) {
      App.sendWhatsApp(phone, msg);
    }
  },

  async viewHistory(id) {
    try {
      const res = await fetch(`api/clients.php?action=get&id=${id}`);
      const json = await res.json();

      if (json.success) {
        const client = json.data;
        document.getElementById('history-client-name').textContent = client.name;
        document.getElementById('history-client-phone').textContent = client.phone;
        document.getElementById('history-client-notes').textContent = client.notes || 'Sin preferencias registradas.';

        // Appointments history
        const appList = document.getElementById('history-appointments-list');
        if (client.appointments && client.appointments.length > 0) {
          appList.innerHTML = client.appointments.map(a => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #fff;">${a.service_name}</strong>
                <div style="font-size: 0.76rem; color: var(--text-muted);">${App.formatDate(a.appointment_date)} a las ${a.appointment_time} hs</div>
              </div>
              <span class="badge ${a.status === 'Completada' ? 'badge-purple' : 'badge-gold'}">${a.status}</span>
            </div>
          `).join('');
        } else {
          appList.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">Sin turnos registrados.</p>';
        }

        // Purchases history
        const salesList = document.getElementById('history-sales-list');
        if (client.sales && client.sales.length > 0) {
          salesList.innerHTML = client.sales.map(s => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: var(--gold-light); font-family: var(--font-mono);">${App.formatMoney(s.total)}</strong>
                <div style="font-size: 0.76rem; color: var(--text-muted);">${s.created_at} (${s.payment_method})</div>
              </div>
              <button class="btn btn-outline-gold btn-sm" onclick="Sales.viewReceipt(${s.id})">Ver Ticket</button>
            </div>
          `).join('');
        } else {
          salesList.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">Sin compras registradas.</p>';
        }

        // Charge button hook
        const btnCharge = document.getElementById('history-btn-charge');
        if (btnCharge) {
          btnCharge.onclick = () => {
            App.closeModal('modal-client-history');
            POS.startSaleForClient(client.id, encodeURIComponent(client.name));
          };
        }

        App.openModal('modal-client-history');
      }
    } catch (e) {
      App.toast('Error al obtener historial', 'error');
    }
  }
};

window.Clients = Clients;
