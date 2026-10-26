// persona dos: guarda solamente IDs y cantidades; los precios vienen del catálogo.
const claveCarrito = 'e-regalos-carrito';
const dialogoCarrito = document.querySelector('#dialogo-carrito');
const listaCarrito = document.querySelector('#lista-carrito');
const avisoCarrito = document.querySelector('#aviso-carrito');
const formularioPedido = document.querySelector('#formulario-pedido');
const botonPedido = document.querySelector('#pedir-whatsapp');
let carrito = [];
let revisandoPedido = false;

try {
  const guardado = JSON.parse(localStorage.getItem(claveCarrito) || '[]');
  if (Array.isArray(guardado)) {
    for (const item of guardado) {
      if (item && /^[1-9]\d*$/.test(String(item.id)) && Number.isInteger(item.cantidad) &&
          item.cantidad >= 1 && item.cantidad <= 99 && !carrito.some(otro => otro.id === String(item.id))) {
        carrito.push({ id: String(item.id), cantidad: item.cantidad });
      }
    }
  }
} catch {
  avisoCarrito.textContent = 'No se pudo recuperar el carrito anterior. Puedes crear uno nuevo.';
}

function guardarCarrito() {
  try {
    localStorage.setItem(claveCarrito, JSON.stringify(carrito));
  } catch {
    avisoCarrito.textContent = 'El navegador no permite guardar el carrito. Se conservará mientras esta página esté abierta.';
  }
}

// persona tres: calcula en centavos para evitar errores al sumar precios decimales.
function detalleCarrito() {
  return carrito.map(item => {
    const producto = productos.find(producto => String(producto.id) === item.id);
    if (!producto) return null;
    const precio = Math.round(Number(producto.precio) * 100);
    return { ...item, nombre: producto.nombre, precio, subtotal: precio * item.cantidad };
  }).filter(Boolean);
}

function mostrarCarrito() {
  document.querySelector('#cantidad-carrito').textContent = carrito.reduce((total, item) => total + item.cantidad, 0);
  listaCarrito.replaceChildren();
  const detalle = catalogoDisponible ? detalleCarrito() : [];
  document.querySelector('#carrito-vacio').hidden = detalle.length > 0;
  document.querySelector('#carrito-vacio').textContent = catalogoDisponible
    ? 'Tu carrito está vacío. Agrega un regalo para comenzar.'
    : 'Actualiza el catálogo para consultar los productos de tu carrito.';
  document.querySelector('#resumen-carrito').hidden = !detalle.length;
  formularioPedido.hidden = !detalle.length;
  botonPedido.disabled = !detalle.length || revisandoPedido;
  for (const item of detalle) {
    const fila = document.querySelector('#fila-carrito').content.cloneNode(true);
    fila.querySelector('li').dataset.id = item.id;
    fila.querySelector('.cart-name').textContent = item.nombre;
    fila.querySelector('.cart-price').textContent = `${moneda.format(item.precio / 100)} por unidad`;
    fila.querySelector('.cart-count').textContent = item.cantidad;
    fila.querySelector('.cart-subtotal').textContent = moneda.format(item.subtotal / 100);
    for (const boton of fila.querySelectorAll('[data-cantidad]')) {
      const sumar = boton.dataset.cantidad === '1';
      boton.disabled = revisandoPedido || (sumar ? item.cantidad >= 99 : item.cantidad <= 1);
      boton.setAttribute('aria-label', `${sumar ? 'Aumentar' : 'Disminuir'} cantidad de ${item.nombre}`);
    }
    fila.querySelector('[data-quitar]').setAttribute('aria-label', `Quitar ${item.nombre}`);
    listaCarrito.appendChild(fila);
  }
  const total = detalle.reduce((suma, item) => suma + item.subtotal, 0);
  document.querySelector('#total-carrito').textContent = `${moneda.format(total / 100)} COP`;
}

// persona dos: al actualizar, retira del carrito los regalos que ya no existen.
function actualizarCarrito() {
  const disponibles = carrito.filter(item => productos.some(producto => String(producto.id) === item.id));
  if (disponibles.length !== carrito.length) {
    avisoCarrito.textContent = 'Se retiraron regalos que ya no están disponibles. Revisa tu carrito.';
    carrito = disponibles;
    guardarCarrito();
  }
  mostrarCarrito();
}
document.addEventListener('catalogoActualizado', actualizarCarrito);

// persona tres: agregar, cambiar cantidades y quitar productos sin modificar la base.
lista.addEventListener('click', evento => {
  const boton = evento.target.closest('[data-agregar]');
  if (!boton || !catalogoDisponible || revisandoPedido) return;
  const id = boton.closest('.product-card').dataset.id;
  const item = carrito.find(item => item.id === id);
  if (item && item.cantidad >= 99) {
    mostrarAviso('Puedes pedir hasta 99 unidades de cada regalo.', true);
    return;
  }
  if (item) item.cantidad++;
  else carrito.push({ id, cantidad: 1 });
  guardarCarrito();
  mostrarCarrito();
  mostrarAviso('Regalo agregado. Abre el carrito para revisar tu pedido.');
});

listaCarrito.addEventListener('click', evento => {
  const boton = evento.target.closest('button');
  if (!boton || revisandoPedido) return;
  const id = boton.closest('li').dataset.id;
  const item = carrito.find(item => item.id === id);
  if (boton.hasAttribute('data-quitar')) carrito = carrito.filter(item => item.id !== id);
  else item.cantidad = Math.max(1, Math.min(99, item.cantidad + Number(boton.dataset.cantidad)));
  guardarCarrito();
  mostrarCarrito();
  // Conserva el foco al reemplazar las filas para poder usar el teclado.
  const fila = [...listaCarrito.children].find(fila => fila.dataset.id === id);
  const selector = boton.hasAttribute('data-quitar') ? '[data-quitar]' : `[data-cantidad="${boton.dataset.cantidad}"]`;
  const siguiente = fila?.querySelector(selector);
  if (siguiente && !siguiente.disabled) siguiente.focus();
  else dialogoCarrito.querySelector('[data-cerrar-carrito]').focus();
});

document.querySelector('#vaciar-carrito').addEventListener('click', () => {
  if (revisandoPedido) return;
  carrito = [];
  guardarCarrito();
  mostrarCarrito();
  dialogoCarrito.querySelector('[data-cerrar-carrito]').focus();
});
document.querySelector('#abrir-carrito').addEventListener('click', () => {
  mostrarCarrito();
  dialogoCarrito.showModal();
});
for (const boton of document.querySelectorAll('[data-cerrar-carrito]')) {
  boton.addEventListener('click', () => dialogoCarrito.close());
}
dialogoCarrito.addEventListener('cancel', evento => {
  if (revisandoPedido) evento.preventDefault();
});

// persona cuatro: verifica precios actuales y prepara el mensaje; el cliente pulsa Enviar en WhatsApp.
formularioPedido.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (revisandoPedido || !carrito.length) return;
  const nombre = formularioPedido.elements.nombre.value.trim();
  if (!nombre) {
    avisoCarrito.textContent = 'Escribe tu nombre para preparar el pedido.';
    formularioPedido.elements.nombre.focus();
    return;
  }
  const nota = formularioPedido.elements.nota.value.trim();
  const anterior = JSON.stringify(detalleCarrito());
  revisandoPedido = true;
  recargar.disabled = true;
  avisoCarrito.textContent = '';
  botonPedido.textContent = 'Revisando pedido…';
  for (const control of dialogoCarrito.querySelectorAll('button, input, textarea')) control.disabled = true;
  try {
    const [actuales, tienda] = await Promise.all([pedir('/api/productos'), pedir('/api/tienda')]);
    productos = actuales;
    catalogoDisponible = true;
    actualizarCarrito();
    mostrarProductos();
    const detalle = detalleCarrito();
    if (!detalle.length || JSON.stringify(detalle) !== anterior) {
      avisoCarrito.textContent = 'El catálogo cambió. Actualizamos los precios y los regalos disponibles. Revisa el carrito y vuelve a pedir.';
      return;
    }
    const total = detalle.reduce((suma, item) => suma + item.subtotal, 0);
    const mensaje = [
      `Hola, soy ${nombre}. Quiero hacer este pedido en E-regalos:`, '',
      ...detalle.map(item => `${item.cantidad} x ${item.nombre} (${moneda.format(item.precio / 100)} c/u): ${moneda.format(item.subtotal / 100)}`),
      '', `Total de productos: ${moneda.format(total / 100)} COP`,
      ...(nota ? [`Nota: ${nota}`] : []), '',
      'Quedo pendiente de confirmar disponibilidad, envío y forma de pago.'
    ].join('\n');
    // No vaciamos el carrito: abrir el chat todavía no confirma la compra.
    window.location.assign(`https://wa.me/${tienda.whatsapp}?text=${encodeURIComponent(mensaje)}`);
  } catch (error) {
    avisoCarrito.textContent = `${error.message} Tu carrito se conserva; vuelve a intentar.`;
  } finally {
    revisandoPedido = false;
    recargar.disabled = cargando;
    for (const control of dialogoCarrito.querySelectorAll('button, input, textarea')) control.disabled = false;
    botonPedido.textContent = 'Pedir por WhatsApp';
    mostrarCarrito();
  }
});

mostrarCarrito();
