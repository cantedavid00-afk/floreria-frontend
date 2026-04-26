/**
 * MÓDULO: Catálogo de Productos
 * Carga el catálogo desde el API, renderiza las tarjetas y
 * gestiona el modal de upselling de extras.
 */

'use strict';

// ── Configuración ─────────────────────────────
const API_BASE = window.FLORERIA_API_URL || 'https://tu-api.onrender.com';

// ── Estado del módulo ─────────────────────────
let todosLosProductos = [];    // Catálogo completo
let extrasDisponibles = [];    // Extras cargados
let ramoSeleccionado  = null;  // Ramo que se está agregando
let extrasSeleccionados = new Set(); // IDs de extras elegidos en el modal

// ── Catálogo ──────────────────────────────────

/**
 * Carga el catálogo completo desde el API y lo renderiza.
 */
async function cargarProductos() {
  const grid      = document.getElementById('productosGrid');
  const errorEl   = document.getElementById('errorEstado');

  // Mostrar skeletons mientras carga
  if (grid) {
    grid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
  }
  if (errorEl) errorEl.classList.remove('visible');

  try {
    const res = await fetch(`${API_BASE}/api/productos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { productos } = await res.json();

    todosLosProductos = productos || [];
    extrasDisponibles = todosLosProductos.filter(p => p.esExtra);

    renderizarProductos(todosLosProductos);
    inicializarFiltros();

  } catch (error) {
    console.error('[Catálogo] Error al cargar productos:', error.message);
    if (grid) grid.innerHTML = '';
    if (errorEl) errorEl.classList.add('visible');
  }
}

/**
 * Filtra y renderiza los productos en el grid.
 * @param {Array} productos
 */
function renderizarProductos(productos) {
  const grid = document.getElementById('productosGrid');
  if (!grid) return;

  // Filtrar extras del catálogo principal (solo se muestran en el modal)
  const visibles = productos.filter(p => !p.esExtra);

  if (visibles.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;padding:40px">No hay productos disponibles en esta categoría.</p>';
    return;
  }

  grid.innerHTML = visibles.map(p => crearCardHTML(p)).join('');
}

/**
 * Genera el HTML de una tarjeta de producto.
 * @param {Object} producto
 * @returns {string}
 */
function crearCardHTML(producto) {
  const { _id, nombre, descripcion, precio, categoria, imagenUrl } = producto;
  const { escapeHtml, formatearPrecio, getEmoji } = window.carritoAPI;

  const imagenHTML = imagenUrl
    ? `<img class="producto-card__img" src="${escapeHtml(imagenUrl)}" alt="${escapeHtml(nombre)}" loading="lazy">`
    : `<div class="producto-card__img-placeholder">${getEmoji(categoria)}</div>`;

  return `
    <article class="producto-card" data-id="${escapeHtml(_id)}">
      ${imagenHTML}
      <div class="producto-card__body">
        <div class="producto-card__categoria">${escapeHtml(categoria)}</div>
        <h3 class="producto-card__nombre">${escapeHtml(nombre)}</h3>
        <p class="producto-card__desc">${escapeHtml(descripcion)}</p>
        <div class="producto-card__footer">
          <span class="producto-card__precio">${formatearPrecio(precio)}</span>
          <button
            class="btn-agregar"
            onclick="abrirModalExtras('${escapeHtml(_id)}')"
            aria-label="Agregar ${escapeHtml(nombre)} al carrito"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  `;
}

// ── Filtros de categoría ──────────────────────

function inicializarFiltros() {
  const filtros = document.getElementById('filtros');
  if (!filtros) return;

  filtros.addEventListener('click', (e) => {
    const btn = e.target.closest('.filtro-btn');
    if (!btn) return;

    // Actualizar estado activo
    filtros.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cat = btn.dataset.cat;
    const filtrados = cat === 'todos'
      ? todosLosProductos
      : todosLosProductos.filter(p => p.categoria === cat);

    renderizarProductos(filtrados);
  });
}

// ── Modal de Extras (Upselling) ───────────────

/**
 * Abre el modal de extras para un ramo específico.
 * @param {string} ramoId
 */
function abrirModalExtras(ramoId) {
  ramoSeleccionado = todosLosProductos.find(p => p._id === ramoId);
  if (!ramoSeleccionado) return;

  extrasSeleccionados.clear();

  // Si no hay extras, agregar directamente al carrito
  if (extrasDisponibles.length === 0) {
    agregarRamoConExtras();
    return;
  }

  renderizarExtrasEnModal();
  document.getElementById('modalExtras').hidden = false;
  document.body.style.overflow = 'hidden';
}

/**
 * Renderiza las tarjetas de extras dentro del modal.
 */
function renderizarExtrasEnModal() {
  const grid = document.getElementById('extrasGrid');
  if (!grid) return;

  const { escapeHtml, formatearPrecio, getEmoji } = window.carritoAPI;

  grid.innerHTML = extrasDisponibles.map(extra => `
    <div
      class="extra-card"
      data-id="${escapeHtml(extra._id)}"
      onclick="toggleExtra('${escapeHtml(extra._id)}')"
      role="checkbox"
      aria-checked="false"
      tabindex="0"
      onkeydown="if(event.key==='Enter'||event.key===' ')toggleExtra('${escapeHtml(extra._id)}')"
    >
      <div class="extra-card__icon">${getEmoji(extra.categoria)}</div>
      <div class="extra-card__nombre">${escapeHtml(extra.nombre)}</div>
      <div class="extra-card__precio">+ ${formatearPrecio(extra.precio)}</div>
      <div class="extra-card__check">✓ Seleccionado</div>
    </div>
  `).join('');
}

/**
 * Activa/desactiva la selección de un extra.
 * @param {string} extraId
 */
function toggleExtra(extraId) {
  const card = document.querySelector(`.extra-card[data-id="${extraId}"]`);
  if (!card) return;

  if (extrasSeleccionados.has(extraId)) {
    extrasSeleccionados.delete(extraId);
    card.classList.remove('seleccionado');
    card.setAttribute('aria-checked', 'false');
  } else {
    extrasSeleccionados.add(extraId);
    card.classList.add('seleccionado');
    card.setAttribute('aria-checked', 'true');
  }
}

/**
 * Cierra el modal de extras.
 */
function cerrarModalExtras() {
  document.getElementById('modalExtras').hidden = true;
  document.body.style.overflow = '';
  ramoSeleccionado = null;
  extrasSeleccionados.clear();
}

/**
 * Agrega el ramo seleccionado + extras al carrito.
 */
function agregarRamoConExtras() {
  if (!ramoSeleccionado) return;

  const { agregar, escapeHtml } = window.carritoAPI;

  // Agregar el ramo principal
  agregar({
    id:       ramoSeleccionado._id,
    nombre:   ramoSeleccionado.nombre,
    precio:   ramoSeleccionado.precio,
    imagenUrl: ramoSeleccionado.imagenUrl,
    tipo:     ramoSeleccionado.categoria,
    esExtra:  false,
  });

  // Agregar los extras seleccionados
  extrasSeleccionados.forEach(extraId => {
    const extra = extrasDisponibles.find(e => e._id === extraId);
    if (extra) {
      agregar({
        id:       extra._id,
        nombre:   extra.nombre,
        precio:   extra.precio,
        imagenUrl: extra.imagenUrl || '',
        tipo:     'extra',
        esExtra:  true,
      });
    }
  });

  cerrarModalExtras();
}

// ── Event Listeners del Modal ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cerrarModalExtras')?.addEventListener('click', cerrarModalExtras);

  document.getElementById('btnSaltarExtras')?.addEventListener('click', () => {
    agregarRamoConExtras(); // Sin extras seleccionados
  });

  document.getElementById('btnAgregarAlCarrito')?.addEventListener('click', () => {
    agregarRamoConExtras();
  });

  // Cerrar modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modalExtras').hidden) {
        cerrarModalExtras();
      }
    }
  });

  // Iniciar carga del catálogo
  cargarProductos();
});

// Exponer para uso en el HTML (onclick inline)
window.abrirModalExtras = abrirModalExtras;
window.toggleExtra = toggleExtra;
window.cargarProductos = cargarProductos;
