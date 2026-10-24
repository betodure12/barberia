/**
 * BarberApp Pro - Authentication & Trial License Management Controller
 * Manages Master & Demo roles, trial countdowns, and administrative license controls.
 */

const Auth = {
  currentUser: null,
  checkTimer: null,

  async init() {
    this.setupEventListeners();
    await this.checkSession();
  },

  setupEventListeners() {
    // Form submission for login
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value.trim();
        this.login(u, p);
      });
    }

    // Modal background click handler for master modal
    const masterModal = document.getElementById('modal-master-control');
    if (masterModal) {
      masterModal.addEventListener('click', (e) => {
        if (e.target === masterModal) {
          this.closeMasterControlModal();
        }
      });
    }
  },

  /**
   * Check session on page load
   */
  async checkSession() {
    try {
      const savedUserStr = localStorage.getItem('barber_current_user');
      let savedUser = null;
      if (savedUserStr) {
        try { savedUser = JSON.parse(savedUserStr); } catch (e) {}
      }

      const headers = {};
      if (savedUser && savedUser.username) {
        headers['X-Auth-User'] = savedUser.username;
      }

      const res = await fetch('api/auth.php?action=check', { headers });
      const data = await res.json();

      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.onLoginSuccess(data.user);
      } else {
        this.currentUser = null;
        if (data.blocked) {
          this.showBlockedModal(data.message, data.reason);
        } else if (savedUser) {
          // Local storage fallback
          if (savedUser.role === 'demo' && savedUser.trial_expires_at) {
            const now = Date.now();
            const exp = new Date(savedUser.trial_expires_at).getTime();
            if (now >= exp || savedUser.is_active === 0) {
              this.showBlockedModal('Tu periodo de prueba ha finalizado.', 'expired');
              return;
            }
          }
          this.currentUser = savedUser;
          this.onLoginSuccess(savedUser);
        } else {
          this.showLoginModal();
        }
      }
    } catch (e) {
      console.warn('Error verificando sesión en servidor, comprobando respaldo local:', e);
      const savedUser = localStorage.getItem('barber_current_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user.role === 'demo' && user.trial_expires_at) {
            const now = Date.now();
            const exp = new Date(user.trial_expires_at).getTime();
            if (now >= exp || user.is_active === 0) {
              this.showBlockedModal('Tu periodo de prueba ha finalizado.', 'expired');
              return;
            }
          }
          this.currentUser = user;
          this.onLoginSuccess(user);
          return;
        } catch (err) {}
      }
      this.showLoginModal();
    }
  },

  /**
   * Login user
   */
  async login(username, password) {
    const errorBox = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('btn-login-submit');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> Verificando...`;
    }

    try {
      const res = await fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success && data.user) {
        this.currentUser = data.user;
        localStorage.setItem('barber_current_user', JSON.stringify(data.user));
        this.hideLoginModal();
        this.onLoginSuccess(data.user);
        App.toast(`¡Bienvenido, ${data.user.role === 'master' ? 'Administrador Maestro' : 'Usuario de Prueba'}!`, 'success');
      } else {
        if (data.blocked) {
          this.hideLoginModal();
          this.showBlockedModal(data.error || data.message, data.reason);
        } else {
          if (errorBox) {
            errorBox.textContent = data.error || 'Usuario o contraseña incorrectos';
            errorBox.style.display = 'block';
          }
        }
      }
    } catch (e) {
      console.error('Error al iniciar sesión:', e);
      if (errorBox) {
        errorBox.textContent = 'Error de conexión con el servidor.';
        errorBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión`;
      }
    }
  },

  /**
   * Quick 1-click Demo Login for prospective clients
   */
  loginAsDemo() {
    this.login('demo', 'demo123');
  },

  /**
   * Post-login setup
   */
  onLoginSuccess(user) {
    this.hideLoginModal();
    this.hideBlockedModal();
    localStorage.setItem('barber_current_user', JSON.stringify(user));

    const masterControls = document.querySelectorAll('.master-only');
    const demoBadge = document.getElementById('topbar-demo-badge');
    const userRoleText = document.getElementById('sidebar-user-role');
    const userNameText = document.getElementById('sidebar-user-name');

    if (user.role === 'master') {
      masterControls.forEach(el => el.style.display = 'flex');
      if (demoBadge) demoBadge.style.display = 'none';
      if (userRoleText) userRoleText.textContent = 'Usuario Maestro / Dueño';
      if (userNameText) userNameText.textContent = 'Administrador Total';
    } else {
      masterControls.forEach(el => el.style.display = 'none');
      if (demoBadge) {
        demoBadge.style.display = 'inline-flex';
        this.updateDemoCountdownBadge(user.remaining_seconds);
      }
      if (userRoleText) userRoleText.textContent = 'Versión de Demostración';
      if (userNameText) userNameText.textContent = 'Usuario de Prueba';
    }

    // Start background check every 60 seconds
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.checkTimer = setInterval(() => {
      this.backgroundCheck();
    }, 60000);
  },

  /**
   * Periodic check to enforce immediate deactivation or expiration
   */
  async backgroundCheck() {
    if (!this.currentUser) return;

    try {
      const headers = {};
      if (this.currentUser && this.currentUser.username) {
        headers['X-Auth-User'] = this.currentUser.username;
      }
      const res = await fetch('api/auth.php?action=check', { headers });
      const data = await res.json();

      if (!data.authenticated) {
        if (data.blocked) {
          this.currentUser = null;
          localStorage.removeItem('barber_current_user');
          this.showBlockedModal(data.message, data.reason);
        } else {
          this.showLoginModal();
        }
      } else if (data.user && data.user.role === 'demo') {
        this.currentUser = data.user;
        this.updateDemoCountdownBadge(data.user.remaining_seconds);
      }
    } catch (e) {
      if (this.currentUser && this.currentUser.role === 'demo' && this.currentUser.trial_expires_at) {
        const remaining = Math.max(0, Math.floor((new Date(this.currentUser.trial_expires_at).getTime() - Date.now()) / 1000));
        if (remaining <= 0) {
          this.showBlockedModal('Tu periodo de prueba ha finalizado.', 'expired');
        } else {
          this.updateDemoCountdownBadge(remaining);
        }
      }
    }
  },

  updateDemoCountdownBadge(seconds) {
    const badge = document.getElementById('topbar-demo-badge');
    const textEl = document.getElementById('demo-remaining-time-text');
    if (!badge || !textEl) return;

    if (seconds <= 0) {
      this.showBlockedModal('Tu periodo de prueba ha finalizado.', 'expired');
      return;
    }

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      textEl.textContent = `Prueba: ${days}d ${hours % 24}h restantes`;
    } else if (hours > 0) {
      textEl.textContent = `Prueba: ${hours}h ${mins}m restantes`;
    } else {
      textEl.textContent = `Prueba: ${mins} min restantes`;
    }
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await fetch('api/auth.php?action=logout');
    } catch (e) {}

    this.currentUser = null;
    localStorage.removeItem('barber_current_user');
    if (this.checkTimer) clearInterval(this.checkTimer);
    App.toast('Sesión cerrada correctamente', 'info');
    this.showLoginModal();
  },

  /* ==========================================================================
     MASTER CONTROL PANEL (Exclusivo para el Administrador Maestro)
     ========================================================================== */
  async openMasterControlModal() {
    const modal = document.getElementById('modal-master-control');
    if (!modal) return;

    modal.classList.remove('active');
    modal.classList.add('open');
    await this.fetchDemoStatus();
  },

  closeMasterControlModal() {
    const modal = document.getElementById('modal-master-control');
    if (modal) {
      modal.classList.remove('open', 'active');
    }
  },

  async fetchDemoStatus() {
    try {
      const headers = {};
      if (this.currentUser && this.currentUser.username) {
        headers['X-Auth-User'] = this.currentUser.username;
      }
      const res = await fetch('api/auth.php?action=get_demo_status', { headers });
      const data = await res.json();

      if (data.success && data.demo) {
        const d = data.demo;
        const statusBadge = document.getElementById('master-demo-status-badge');
        const expiryText = document.getElementById('master-demo-expiry-text');
        const remainingText = document.getElementById('master-demo-remaining-text');
        const toggleBtn = document.getElementById('btn-master-toggle-demo');
        const customDateInput = document.getElementById('master-custom-expiry-input');

        if (d.is_active === 1 && !d.is_expired) {
          if (statusBadge) {
            statusBadge.className = 'badge badge-emerald';
            statusBadge.innerHTML = '<i class="bi bi-check-circle-fill"></i> ACTIVO PARA PRUEBAS';
          }
          if (toggleBtn) {
            toggleBtn.className = 'btn btn-danger btn-sm';
            toggleBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Desactivar Acceso Demo Ya';
            toggleBtn.onclick = () => Auth.toggleDemo(0);
          }
        } else {
          if (statusBadge) {
            statusBadge.className = 'badge badge-rose';
            statusBadge.innerHTML = '<i class="bi bi-x-circle-fill"></i> ' + (d.is_active === 0 ? 'DESACTIVADO / PAUSADO' : 'EXPIRADO');
          }
          if (toggleBtn) {
            toggleBtn.className = 'btn btn-gold btn-sm';
            toggleBtn.innerHTML = '<i class="bi bi-play-fill"></i> Activar Acceso Demo';
            toggleBtn.onclick = () => Auth.toggleDemo(1);
          }
        }

        if (expiryText) {
          if (d.trial_expires_at) {
            const parts = d.trial_expires_at.split(' ');
            const formattedDate = App.formatDate(parts[0]);
            const timePart = parts[1] ? ` (${parts[1]})` : '';
            expiryText.textContent = `${formattedDate}${timePart}`;
          } else {
            expiryText.textContent = 'Permanente / Sin límite';
          }
        }

        if (remainingText) {
          remainingText.textContent = d.remaining_text || (d.is_expired ? 'Expirado' : '-');
        }

        // Set default value for custom datepicker to current expiry
        if (customDateInput && d.trial_expires_at) {
          customDateInput.value = d.trial_expires_at.replace(' ', 'T').substring(0, 16);
        }
      }
    } catch (e) {
      console.error('Error al obtener estado de demo:', e);
      App.toast('Error al consultar estado del demo', 'error');
    }
  },

  async toggleDemo(newStatus) {
    const toggleBtn = document.getElementById('btn-master-toggle-demo');
    let origHtml = '';
    if (toggleBtn) {
      origHtml = toggleBtn.innerHTML;
      toggleBtn.disabled = true;
      toggleBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Actualizando...';
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.currentUser && this.currentUser.username) {
        headers['X-Auth-User'] = this.currentUser.username;
      }

      const res = await fetch('api/auth.php?action=toggle_demo', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ is_active: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        App.toast(data.message || (newStatus === 1 ? '¡Hecho! Acceso de prueba activado' : '¡Hecho! Acceso de prueba desactivado'), newStatus === 1 ? 'success' : 'warning');
        await this.fetchDemoStatus();
      } else {
        App.toast(data.error || 'Error al cambiar estado', 'error');
      }
    } catch (e) {
      App.toast('Error de conexión al alternar demo', 'error');
    } finally {
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.innerHTML = origHtml;
      }
    }
  },

  async extendDemo(days, btnElement) {
    let origHtml = '';
    if (btnElement) {
      origHtml = btnElement.innerHTML;
      btnElement.disabled = true;
      btnElement.innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.currentUser && this.currentUser.username) {
        headers['X-Auth-User'] = this.currentUser.username;
      }

      const res = await fetch('api/auth.php?action=extend_demo', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ days })
      });
      const data = await res.json();
      if (data.success) {
        App.toast(data.message || `¡Hecho! Se añadieron ${days} días`, 'success');
        await this.fetchDemoStatus();
      } else {
        App.toast(data.error || 'Error al extender prueba', 'error');
      }
    } catch (e) {
      App.toast('Error de conexión al extender prueba', 'error');
    } finally {
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = origHtml;
      }
    }
  },

  async setCustomExpiry() {
    const input = document.getElementById('master-custom-expiry-input');
    const saveBtn = document.getElementById('btn-save-master-expiry');
    if (!input || !input.value) {
      App.toast('Por favor, selecciona una fecha y hora válidas', 'warning');
      return;
    }

    let originalBtnHtml = saveBtn ? saveBtn.innerHTML : '<i class="bi bi-check-lg"></i> Guardar Fecha';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Guardando...';
    }

    try {
      let val = input.value.trim().replace('T', ' ');
      if (val.length === 16) {
        val += ':00';
      }

      const headers = { 'Content-Type': 'application/json' };
      if (this.currentUser && this.currentUser.username) {
        headers['X-Auth-User'] = this.currentUser.username;
      }

      const res = await fetch('api/auth.php?action=set_demo_expiry', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ datetime: val })
      });
      const data = await res.json();

      if (data.success) {
        App.toast(data.message || '¡Hecho! Fecha de vencimiento guardada con éxito', 'success');
        if (saveBtn) {
          saveBtn.classList.remove('btn-outline-gold');
          saveBtn.classList.add('btn-emerald');
          saveBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡Hecho!';
          setTimeout(() => {
            saveBtn.classList.remove('btn-emerald');
            saveBtn.classList.add('btn-outline-gold');
            saveBtn.innerHTML = originalBtnHtml;
          }, 3000);
        }
        await this.fetchDemoStatus();
      } else {
        App.toast(data.error || 'Error al establecer fecha', 'error');
        if (saveBtn) saveBtn.innerHTML = originalBtnHtml;
      }
    } catch (e) {
      console.error('Error al guardar fecha:', e);
      App.toast('Error de conexión al guardar la fecha', 'error');
      if (saveBtn) saveBtn.innerHTML = originalBtnHtml;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  },

  async resetDemoData() {
    if (!confirm('¿Seguro que deseas restablecer los datos de prueba a los valores de fábrica? Se limpiarán las citas y ventas de prueba.')) {
      return;
    }

    try {
      const headers = {};
      if (this.currentUser && this.currentUser.username) {
        headers['X-Auth-User'] = this.currentUser.username;
      }

      const res = await fetch('api/auth.php?action=reset_demo_data', { headers });
      const data = await res.json();
      if (data.success) {
        App.toast(data.message || '¡Hecho! Datos de fábrica restablecidos', 'success');
        if (typeof Appointments !== 'undefined') Appointments.fetchAppointments();
        if (typeof POS !== 'undefined') POS.load();
        if (typeof Dashboard !== 'undefined') Dashboard.load();
      } else {
        App.toast(data.error || 'Error al reiniciar datos', 'error');
      }
    } catch (e) {
      App.toast('Error al reiniciar datos', 'error');
    }
  },

  /* ==========================================================================
     UI MODAL TOGGLES
     ========================================================================== */
  showLoginModal() {
    const modal = document.getElementById('modal-auth-login');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('auth-locked');
    }
  },

  hideLoginModal() {
    const modal = document.getElementById('modal-auth-login');
    if (modal) {
      modal.classList.remove('active');
      document.body.classList.remove('auth-locked');
    }
  },

  showBlockedModal(message, reason) {
    const modal = document.getElementById('modal-auth-blocked');
    const msgEl = document.getElementById('auth-blocked-message');
    if (msgEl) {
      msgEl.textContent = message || 'Tu periodo de prueba ha finalizado o ha sido pausado.';
    }
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('auth-locked');
    }
  },

  hideBlockedModal() {
    const modal = document.getElementById('modal-auth-blocked');
    if (modal) {
      modal.classList.remove('active');
      document.body.classList.remove('auth-locked');
    }
  },

  toggleLoginMode(mode) {
    const demoCard = document.getElementById('login-card-demo');
    const adminCard = document.getElementById('login-card-admin');
    const tabDemo = document.getElementById('tab-login-demo');
    const tabAdmin = document.getElementById('tab-login-admin');

    if (mode === 'admin') {
      if (demoCard) demoCard.style.display = 'none';
      if (adminCard) adminCard.style.display = 'block';
      if (tabAdmin) tabAdmin.classList.add('active');
      if (tabDemo) tabDemo.classList.remove('active');
    } else {
      if (demoCard) demoCard.style.display = 'block';
      if (adminCard) adminCard.style.display = 'none';
      if (tabDemo) tabDemo.classList.add('active');
      if (tabAdmin) tabAdmin.classList.remove('active');
    }
  }
};

// Initialize Auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
