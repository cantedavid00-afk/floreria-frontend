/**
 * MÓDULO: Carrito de Compras
 * Gestiona el estado del carrito con localStorage.
 * Este módulo se carga antes que catalogo.js.
 */

'use strict';

// ── Constantes ────────────────────────────────
const STORAGE_KEY = 'floreria_carrito';

// ── Estado del carrito ────────────────────────
let carrito = cargarCarrritoDesdeStorage();

/**
 * Carga el carrito desde localStorage de forma segura.
 * @returns {Array}
 */
function cargarCarrritoDesdeStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    // Validar que sea un array
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persiste el carrito en localStorage.
 */
function guardarCarrito() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
  } catch (e) {
    console.warn('[Carrito] No se pudo guardar en localStorage:', e.message);
  }
}

/**
 * Estructura de un item del carrito:
 * {
 *   id: string,           // _id de MongoDB
 *   nombre: string,
 *   precio: number,
 *   imagenUrl: string,
 *   tipo: 'ramo'|'extra', // para mostrar en UI
 *   esExtra: boolean,
 * }
 */

// ── API Pública del Carrito ───────────────────

/**
 * Agrega un item al carrito. Si ya existe, no duplica.
 * @param {Object} item
 */
function agregarAlCarrito(item) {
  const yaExiste = carrito.some(c => c.id === item.id);
  if (yaExiste) {
    mostrarToast(`"${item.nombre}" ya está en tu carrito.`);
    return;
  }
  carrito.push(item);
  guardarCarrito();
  actualizarUI();
  mostrarToast(`✅ "${item.nombre}" agregado al carrito`);
}

/**
 * Elimina un item del carrito por su ID.
 * @param {string} id
 */
function eliminarDelCarrito(id) {
  carrito = carrito.filter(c => c.id !== id);
  guardarCarrito();
  actualizarUI();
}

/**
 * Limpia completamente el carrito.
 */
function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarUI();
}

/**
 * Retorna el total del carrito (sin envío).
 * @returns {number}
 */
function obtenerSubtotal() {
  return carrito.reduce((acc, item) => acc + item.precio, 0);
}

/**
 * Retorna una copia del carrito actual.
 * @returns {Array}
 */
function obtenerCarrito() {
  return [...carrito];
}

// ── UI del Carrito ────────────────────────────

/**
 * Actualiza todos los elementos visuales del carrito.
 */
function actualizarUI() {
  actualizarBadge();
  renderizarItemsCarrito();
}

/**
 * Actualiza el badge del botón del carrito.
 */
function actualizarBadge() {
  const badge = document.getElementById('carritoBadge');
  if (!badge) return;
  const total = carrito.length;
  badge.textContent = total;
  badge.hidden = total === 0;
}

/**
 * Renderiza los items del carrito en el drawer lateral.
 */
function renderizarItemsCarrito() {
  const lista    = document.getElementById('carritoItems');
  const footer   = document.getElementById('carritoFooter');
  const vacio    = document.getElementById('carritoVacio');
  const totalEl  = document.getElementById('carritoTotal');

  if (!lista) return;

  if (carrito.length === 0) {
    lista.innerHTML = '';
    if (footer) footer.hidden = true;
    if (vacio) vacio.style.display = 'flex';
    return;
  }

  if (vacio) vacio.style.display = 'none';
  if (footer) footer.hidden = false;

  lista.innerHTML = carrito.map(item => `
    <div class="carrito-item" data-id="${escapeHtml(item.id)}">
      <div class="carrito-item__img">
        ${item.imagenUrl
          ? `<img src="${escapeHtml(item.imagenUrl)}" alt="${escapeHtml(item.nombre)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" loading="lazy">`
          : getEmoji(item.tipo)
        }
      </div>
      <div class="carrito-item__info">
        <div class="carrito-item__nombre">${escapeHtml(item.nombre)}</div>
        <div class="carrito-item__tipo">${item.esExtra ? 'Extra' : 'Ramo'}</div>
        <div class="carrito-item__precio">${formatearPrecio(item.precio)}</div>
      </div>
      <button class="btn-eliminar-item" onclick="eliminarDelCarrito('${escapeHtml(item.id)}')" aria-label="Eliminar ${escapeHtml(item.nombre)}">✕</button>
    </div>
  `).join('');

  if (totalEl) {
    totalEl.textContent = formatearPrecio(obtenerSubtotal());
  }
}

/**
 * Abre el drawer del carrito.
 */
function abrirCarrito() {
  const drawer  = document.getElementById('carritoDrawer');
  const overlay = document.getElementById('overlayOscuro');
  if (drawer)  drawer.classList.add('abierto');
  if (overlay) overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

/**
 * Cierra el drawer del carrito.
 */
function cerrarCarrito() {
  const drawer  = document.getElementById('carritoDrawer');
  const overlay = document.getElementById('overlayOscuro');
  if (drawer)  drawer.classList.remove('abierto');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
}

// ── Helpers ───────────────────────────────────

/**
 * Formatea un número como precio en MXN.
 * @param {number} n
 * @returns {string}
 */
function formatearPrecio(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

/**
 * Escapa HTML para prevenir XSS en innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Emoji según tipo de producto.
 */
function getEmoji(tipo) {
  const mapa = { ramo: '🌹', arreglo: '🌺', planta: '🪴', extra: '🎁' };
  return mapa[tipo] || '🌸';
}

/**
 * Muestra un toast de notificación temporal.
 * @param {string} mensaje
 */
function mostrarToast(mensaje) {
  // Reutilizar o crear el toast
  let toast = document.getElementById('toast-notif');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notif';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #333; color: #fff; padding: 12px 24px; border-radius: 50px;
      font-size: 0.9rem; z-index: 9999; transition: opacity 0.3s;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.style.opacity = '1';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ── Inicialización ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Botón para abrir el carrito
  document.getElementById('btnCarrito')?.addEventListener('click', abrirCarrito);

  // Botón para cerrar el carrito
  document.getElementById('cerrarCarrito')?.addEventListener('click', cerrarCarrito);

  // Overlay cierra el carrito
  document.getElementById('overlayOscuro')?.addEventListener('click', cerrarCarrito);

  // Render inicial
  actualizarUI();
});

// Exponer funciones que usa catalogo.js
window.carritoAPI = {
  agregar: agregarAlCarrito,
  eliminar: eliminarDelCarrito,
  vaciar: vaciarCarrito,
  obtener: obtenerCarrito,
  subtotal: obtenerSubtotal,
  formatearPrecio,
  escapeHtml,
  getEmoji,
  mostrarToast,
};
