/**
 * BarberApp Pro - Services & Haircuts Controller
 */

const Services = {
  servicesList: [],

  async load() {
    await this.fetchServices();
  },

  async fetchServices() {
    const container = document.getElementById('services-list-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin" style="font-size: 2rem; color: var(--gold-primary);"></i></div>`;

    try {
      const res = await fetch('api/services.php?action=list');
      const json = await res.json();

      if (json.success) {
        this.servicesList = json.data;
        this.renderServices();
      }
    } catch (e) {
      container.innerHTML = `<p style="color: var(--rose); text-align: center;">Error al cargar servicios.</p>`;
    }
  },

  renderServices() {
    const container = document.getElementById('services-list-container');
    if (!container) return;

    if (this.servicesList.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 50px 20px;">
          <i class="bi bi-scissors" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: 10px;"></i>
          <h3 style="color: #fff; margin-bottom: 6px;">No hay servicios registrados</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">Crea el catálogo de cortes y precios de la barbería.</p>
          <button class="btn btn-gold" onclick="Services.openNewModal()">
            <i class="bi bi-plus-circle"></i> Nuevo Servicio
          </button>
        </div>
      `;
      return;
    }

    let html = `<div class="grid-3">`;

    this.servicesList.forEach(s => {
      let icon = 'bi-scissors';
      if (s.category === 'Barba') icon = 'bi-brush';
      if (s.category === 'Combo') icon = 'bi-stars';
      if (s.category === 'Tratamiento') icon = 'bi-droplet';

      html += `
        <div class="card card-gold-accent" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <span class="badge badge-gold"><i class="bi ${icon}"></i> ${s.category}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                <i class="bi bi-clock"></i> ${s.duration} min
              </span>
            </div>
            <h3 style="color: #fff; font-size: 1.15rem; margin-bottom: 6px;">${s.name}</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 16px; min-height: 40px;">
              ${s.description || 'Sin descripción adicional'}
            </p>
          </div>
          <div>
            <div style="font-family: var(--font-mono); font-size: 1.45rem; font-weight: 800; color: var(--gold-light); margin-bottom: 14px;">
              ${App.formatMoney(s.price)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
              <button class="btn btn-gold btn-sm" onclick="POS.addServiceToCart(${s.id}, '${encodeURIComponent(s.name)}', ${s.price})">
                <i class="bi bi-plus-lg"></i> Agregar al POS
              </button>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" title="Editar" onclick="Services.openEditModal(${s.id})">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm" title="Eliminar" onclick="Services.deleteService(${s.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  openNewModal() {
    document.getElementById('service-modal-form').reset();
    document.getElementById('service-modal-id').value = '';
    document.getElementById('service-modal-title').innerHTML = '<i class="bi bi-plus-circle"></i> Nuevo Servicio / Corte';
    App.openModal('modal-service');
  },

  openEditModal(id) {
    const s = this.servicesList.find(item => item.id == id);
    if (!s) return;

    document.getElementById('service-modal-id').value = s.id;
    document.getElementById('service-modal-name').value = s.name;
    document.getElementById('service-modal-category').value = s.category;
    document.getElementById('service-modal-price').value = s.price;
    document.getElementById('service-modal-duration').value = s.duration;
    document.getElementById('service-modal-description').value = s.description || '';
    document.getElementById('service-modal-title').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Servicio';

    App.openModal('modal-service');
  },

  async saveService(e) {
    e.preventDefault();
    const id = document.getElementById('service-modal-id').value;
    const data = {
      id: id,
      name: document.getElementById('service-modal-name').value,
      category: document.getElementById('service-modal-category').value,
      price: document.getElementById('service-modal-price').value,
      duration: document.getElementById('service-modal-duration').value,
      description: document.getElementById('service-modal-description').value
    };

    const action = id ? 'update' : 'create';

    try {
      const res = await fetch(`api/services.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (json.success) {
        App.toast(id ? 'Servicio actualizado' : 'Servicio creado con éxito', 'success');
        App.closeModal('modal-service');
        this.fetchServices();
        if (Appointments) Appointments.fetchOptions();
        if (POS) POS.loadCatalog();
      } else {
        App.toast(json.error || 'Error al guardar el servicio', 'error');
      }
    } catch (err) {
      App.toast('Error de conexión', 'error');
    }
  },

  async deleteService(id) {
    if (!confirm('¿Seguro que deseas eliminar este servicio?')) return;

    try {
      const res = await fetch('api/services.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) {
        App.toast(json.message || 'Servicio eliminado', 'success');
        this.fetchServices();
      }
    } catch (e) {
      App.toast('Error al eliminar servicio', 'error');
    }
  }
};

window.Services = Services;
