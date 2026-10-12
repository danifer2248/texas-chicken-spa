document.addEventListener('DOMContentLoaded', () => {

  // 1. CARGAR Y GUARDAR CARRITO
  let cart = JSON.parse(localStorage.getItem('texasCart')) || [];

  // Elementos DOM
  const cartCounter = document.getElementById('cart-counter');
  const cartBtn = document.getElementById('cart-btn');
  const cartDropdown = document.getElementById('cartDropdown');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartTotal = document.getElementById('cartTotal');
  const addButtons = document.querySelectorAll('.btn-add');
  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');
  const authLinks = document.querySelectorAll('[data-auth-link]');
  const logoutBtn = document.getElementById('logout-btn');

  // Elementos Responsive (P1: Menú Hamburguesa como Botón)
  const mobileMenuBtn = document.getElementById('mobile-menu');
  const navLinks = document.querySelector('.nav-links');

  injectUIComponents();

  // P1: Cierre de Sesión Limpio y Estado de Autenticación
  function isLoggedIn() {
    return localStorage.getItem('texasLoggedIn') === 'true';
  }

  function toggleAuthNav() {
    const logged = isLoggedIn();
    authLinks.forEach(link => {
      const isAuthPage = link.dataset.authLink === 'login' || link.dataset.authLink === 'register';
      if (logged) {
        link.classList.toggle('hidden', isAuthPage);
      } else {
        link.classList.toggle('hidden', !isAuthPage);
      }
    });
    if (logoutBtn) {
      logoutBtn.classList.toggle('hidden', !logged);
    }
  }

  // P1: Menú Hamburguesa accesible
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const expanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', !expanded);
      navLinks.classList.toggle('active');
    });
  }

  // P2: Actualizar Vista del Carrito con Multi-cantidad y Atributos de Accesibilidad
  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCounter) cartCounter.innerText = totalCount;

    if (cartItemsList && cartTotal) {
      cartItemsList.innerHTML = '';
      if (cart.length === 0) {
        cartItemsList.innerHTML = '<li style="padding: 10px 0; color: #888;">El carrito está vacío.</li>';
      } else {
        cart.forEach((item) => {
          const li = document.createElement('li');
          li.className = 'cart-item';
          li.innerHTML = `
            <div class="cart-item-details">
              <strong>${item.name}</strong>
              <span>Bs. ${(item.price * item.qty).toFixed(2)}</span>
            </div>
            <div class="cart-item-controls">
              <button class="btn-qty btn-dec" data-id="${item.id}" aria-label="Disminuir cantidad de ${item.name}">-</button>
              <span>${item.qty}</span>
              <button class="btn-qty btn-inc" data-id="${item.id}" aria-label="Aumentar cantidad de ${item.name}">+</button>
              <button class="btn-remove" data-id="${item.id}" aria-label="Eliminar ${item.name} del carrito">&times;</button>
            </div>
          `;
          cartItemsList.appendChild(li);
        });
      }

      const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      cartTotal.innerText = total.toFixed(2);

      let checkoutBtn = document.getElementById('btn-checkout');
      if (cart.length > 0) {
        if (!checkoutBtn) {
          checkoutBtn = document.createElement('button');
          checkoutBtn.id = 'btn-checkout';
          checkoutBtn.className = 'btn-submit';
          checkoutBtn.style.marginTop = '12px';
          checkoutBtn.innerText = 'Realizar pedido';

          checkoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderNum = Math.floor(Math.random() * 90000) + 10000;
            const finalTotal = cartTotal.innerText;
            const itemsCount = cart.reduce((sum, i) => sum + i.qty, 0);

            document.getElementById('order-number').innerText = `#TX-${orderNum}`;
            document.getElementById('order-summary-content').innerHTML = `
                <p><strong>Productos:</strong> ${itemsCount} items</p>
                <p><strong>Total a pagar:</strong> Bs. ${finalTotal}</p>
            `;

            document.getElementById('checkout-modal').classList.add('active');
            cart = [];
            updateCartUI();
            if (cartDropdown) cartDropdown.classList.remove('active');
          });

          cartDropdown.appendChild(checkoutBtn);
        }
      } else if (checkoutBtn) {
        checkoutBtn.remove();
      }
    }
    localStorage.setItem('texasCart', JSON.stringify(cart));
  }

  // P2: Control de sesión previo a agregar producto
  addButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!isLoggedIn()) {
        sessionStorage.setItem('loginRedirectReason', 'Debes iniciar sesión para agregar productos a tu pedido.');
        window.location.href = 'login.html';
        return;
      }

      const card = button.closest('.card-product');
      let name = card ? card.querySelector('.card-title').innerText : 'Producto';
      let priceText = card ? card.querySelector('.price').innerText : 'Bs. 0';
      let price = parseFloat(priceText.replace('Bs.', '').trim()) || 0;

      const existingIndex = cart.findIndex(item => item.name === name);
      if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
      } else {
        cart.push({ id: Date.now() + Math.random(), name, price, qty: 1 });
      }

      updateCartUI();
      showToast(`<strong>${name}</strong> agregado al pedido · <a href="#" id="open-cart-link" style="color:var(--secondary-yellow);">Ver carrito</a>`);

      setTimeout(() => {
        const openLink = document.getElementById('open-cart-link');
        if (openLink) {
          openLink.addEventListener('click', (e) => {
            e.preventDefault();
            cartDropdown.classList.add('active');
          });
        }
      }, 50);
    });
  });

  // P2: Eventos de incremento, decremento y eliminación accesibles
  if (cartItemsList) {
    cartItemsList.addEventListener('click', (e) => {
      const id = parseFloat(e.target.getAttribute('data-id'));
      if (!id) return;

      if (e.target.classList.contains('btn-remove')) {
        e.stopPropagation();
        cart = cart.filter(item => item.id !== id);
      } else if (e.target.classList.contains('btn-inc')) {
        e.stopPropagation();
        const item = cart.find(i => i.id === id);
        if (item) item.qty += 1;
      } else if (e.target.classList.contains('btn-dec')) {
        e.stopPropagation();
        const item = cart.find(i => i.id === id);
        if (item) {
          item.qty -= 1;
          if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
          }
        }
      }
      updateCartUI();
    });
  }

  // Eventos Carrito
  if (cartBtn && cartDropdown) {
    cartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cartDropdown.classList.toggle('active');
    });
    cartDropdown.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => cartDropdown.classList.remove('active'));
  }

  // P3: Validación de formularios con mensajes textuales claros
  function validateForm(form) {
    let valid = true;
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
      const errorSpan = input.parentNode.querySelector('.error-msg');
      if (!input.value.trim()) {
        valid = false;
        input.style.borderColor = 'var(--primary-red)';
        if (errorSpan) {
          errorSpan.innerText = 'Este campo es obligatorio.';
          errorSpan.classList.add('active');
        }
      } else {
        input.style.borderColor = '#ccc';
        if (errorSpan) errorSpan.classList.remove('active');
      }
    });
    return valid;
  }

  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(formLogin)) return;

      localStorage.setItem('texasLoggedIn', 'true');
      alert('¡Inicio de sesión exitoso!');
      window.location.href = 'menu.html';
    });
  }

  if (formRegistro) {
    formRegistro.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(formRegistro)) return;

      localStorage.setItem('texasLoggedIn', 'true');
      alert('¡Cuenta creada con éxito!');
      window.location.href = 'menu.html';
    });
  }

  // P1: Cierre de Sesión Limpio - Oculta Carrito
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('texasLoggedIn');
      if (cartDropdown) cartDropdown.classList.remove('active');
      toggleAuthNav();
      alert('Has cerrado sesión.');
      window.location.href = 'index.html';
    });
  }

  // P2: Mostrar contraseña en Formularios
  const togglePasswordBtns = document.querySelectorAll('.btn-toggle-password');
  togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentNode.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = 'Ocultar';
      } else {
        input.type = 'password';
        btn.innerText = 'Mostrar';
      }
    });
  });

  // Mensaje de redirección al login sin sesión
  const redirectReason = sessionStorage.getItem('loginRedirectReason');
  if (redirectReason && window.location.pathname.includes('login.html')) {
    const alertBox = document.getElementById('login-alert');
    if (alertBox) {
      alertBox.innerText = redirectReason;
      alertBox.classList.remove('hidden');
    }
    sessionStorage.removeItem('loginRedirectReason');
  }

  // Inicialización
  toggleAuthNav();
  updateCartUI();

  // Helpers UI
  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `✅ <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function injectUIComponents() {
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    if (!document.getElementById('checkout-modal')) {
      const modal = document.createElement('div');
      modal.id = 'checkout-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close" id="modal-close" aria-label="Cerrar modal">&times;</button>
          <h2>¡Pedido Confirmado! 🎉</h2>
          <p>Tu orden <strong id="order-number" style="color:var(--primary-red);"></strong> ha sido registrada.</p>
          <div class="order-summary-box" id="order-summary-content"></div>
          <p class="modal-next-steps">
            <strong>Siguiente paso:</strong><br>
            Estamos preparando tu comida. El tiempo estimado de entrega es de <strong>30 a 45 minutos</strong>.<br><br>
            Nos contactaremos a tu número para coordinar la entrega.
          </p>
          <button class="btn-submit" id="btn-close-modal">Entendido</button>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => modal.classList.remove('active');
      document.getElementById('modal-close').addEventListener('click', closeModal);
      document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    }
  }
});