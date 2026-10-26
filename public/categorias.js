// persona dos: datos del catálogo y referencias a los elementos de la página.
let productos = [];
let categorias = [];
let ocasiones = [];
let categoriaActiva = '';
let cargando = false;
let catalogoDisponible = false;
const esAdmin = document.body.dataset.admin === 'true';
const lista = document.querySelector('#productos');
const estado = document.querySelector('#estado');
const aviso = document.querySelector('#aviso');
const buscar = document.querySelector('#buscar');
const filtroOcasion = document.querySelector('#filtro-ocasion');
const orden = document.querySelector('#orden');
const nuevo = document.querySelector('#nuevo-regalo');
const recargar = document.querySelector('#recargar');
const formulario = document.querySelector('#formulario-regalo');
const formularioPrecio = document.querySelector('#formulario-precio');
const formularioEliminar = document.querySelector('#formulario-eliminar');
const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

// persona cuatro: centraliza fetch y muestra los mensajes HTTP enviados por Express.
async function pedir(ruta, metodo = 'GET', datos) {
  const opciones = { method: metodo, signal: AbortSignal.timeout(15000) };
  if (datos !== undefined) {
    opciones.headers = { 'Content-Type': 'application/json' };
    opciones.body = JSON.stringify(datos);
  }
  let respuesta;
  try {
    respuesta = await fetch(ruta, opciones);
  } catch {
    throw new Error(metodo === 'GET'
      ? 'No se pudo conectar. Revisa tu conexión y vuelve a intentar.'
      : 'No se recibió la respuesta. Actualiza el catálogo para comprobar si el cambio se guardó antes de repetirlo.');
  }
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.mensaje || 'No se pudo completar la petición.');
  return resultado;
}

function mostrarAviso(mensaje, error = false) {
  aviso.textContent = mensaje;
  aviso.classList.toggle('error', error);
  aviso.hidden = !mensaje;
}

// persona dos: rellena los selectores con los IDs reales, sin escribirlos a mano.
function llenarSelector(selector, filas, primeraOpcion) {
  selector.replaceChildren(new Option(primeraOpcion, ''));
  for (const fila of filas) selector.add(new Option(fila.nombre, fila.id));
}

function mostrarCategorias() {
  const contenedor = document.querySelector('#categorias');
  contenedor.replaceChildren();
  const todas = [{ id: '', nombre: 'Todos los regalos', productos: productos.length }, ...categorias];
  for (const categoria of todas) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'category-button';
    boton.dataset.id = categoria.id;
    boton.textContent = `${categoria.nombre} · ${categoria.productos}`;
    boton.setAttribute('aria-pressed', String(String(categoria.id) === categoriaActiva));
    contenedor.appendChild(boton);
  }
}

// persona dos: muestra las rutas guardadas en PostgreSQL; las fotos no dependen del nombre.
function mostrarFotos(tarjeta, producto) {
  const fotos = producto.imagenes || [];
  const principal = tarjeta.querySelector('.product-photo');
  const sinFoto = tarjeta.querySelector('.photo-empty');
  const miniaturas = tarjeta.querySelector('.photo-thumbnails');
  if (!fotos.length) return;

  // persona cuatro: si un archivo no existe, se muestra texto en lugar de una imagen rota.
  principal.addEventListener('error', () => {
    principal.hidden = true;
    sinFoto.hidden = false;
    sinFoto.textContent = 'No se pudo cargar esta foto.';
  });
  principal.alt = `${producto.nombre}, foto 1 de ${fotos.length}`;
  principal.src = fotos[0];
  principal.hidden = false;
  sinFoto.hidden = true;
  miniaturas.hidden = fotos.length < 2;

  // persona una: cada botón cambia la foto visible, sin carrusel ni librerías adicionales.
  fotos.forEach((ruta, indice) => {
    if (fotos.length < 2) return;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.setAttribute('aria-label', `Ver foto ${indice + 1} de ${producto.nombre}`);
    boton.setAttribute('aria-pressed', String(indice === 0));
    const imagen = document.createElement('img');
    imagen.src = ruta;
    imagen.alt = '';
    imagen.loading = 'lazy';
    boton.appendChild(imagen);
    boton.addEventListener('click', () => {
      principal.src = ruta;
      principal.alt = `${producto.nombre}, foto ${indice + 1} de ${fotos.length}`;
      principal.hidden = false;
      sinFoto.hidden = true;
      for (const otro of miniaturas.children) otro.setAttribute('aria-pressed', String(otro === boton));
    });
    miniaturas.appendChild(boton);
  });
}

// persona dos: filtra y ordena en el navegador; la base conserva todos los regalos.
function mostrarProductos() {
  const texto = buscar.value.trim().toLocaleLowerCase('es');
  const visibles = productos.filter(producto =>
    (!categoriaActiva || String(producto.categoria_id) === categoriaActiva) &&
    (!filtroOcasion.value || String(producto.ocasion_id) === filtroOcasion.value) &&
    `${producto.nombre} ${producto.descripcion}`.toLocaleLowerCase('es').includes(texto)
  );
  if (orden.value === 'menor') visibles.sort((a, b) => Number(a.precio) - Number(b.precio));
  if (orden.value === 'mayor') visibles.sort((a, b) => Number(b.precio) - Number(a.precio));
  if (orden.value === 'nombre') visibles.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  lista.replaceChildren();
  for (const producto of visibles) {
    const tarjeta = document.querySelector('#tarjeta-regalo').content.cloneNode(true);
    tarjeta.querySelector('.product-card').dataset.id = producto.id;
    tarjeta.querySelector('.product-name').textContent = producto.nombre;
    tarjeta.querySelector('.product-description').textContent = producto.descripcion || 'Un detalle para hacer especial el día.';
    tarjeta.querySelector('.product-price').textContent = moneda.format(Number(producto.precio));
    tarjeta.querySelector('.category-tag').textContent = producto.categoria;
    tarjeta.querySelector('.occasion-tag').textContent = producto.ocasion;
    mostrarFotos(tarjeta, producto);
    for (const boton of tarjeta.querySelectorAll('.card-actions button')) {
      boton.setAttribute('aria-label', `${boton.textContent}: ${producto.nombre}`);
    }
    lista.appendChild(tarjeta);
  }
  estado.textContent = `${visibles.length} de ${productos.length} regalos`;
  document.querySelector('#vacio').hidden = visibles.length > 0;
  document.querySelector('#vacio-titulo').textContent = productos.length ? 'No encontramos regalos' : 'Todavía no hay regalos disponibles';
  document.querySelector('#vacio-texto').textContent = productos.length
    ? 'Prueba con otro nombre o limpia los filtros.'
    : esAdmin ? 'Usa «Nuevo regalo» para agregar tu primer detalle.' : 'Vuelve pronto para ver nuestras novedades.';
}

// persona dos: carga los tres recursos. Si falla, permite reintentar sin recargar la página.
async function cargarCatalogo() {
  if (cargando) return false;
  cargando = true;
  catalogoDisponible = false;
  if (nuevo) nuevo.disabled = true;
  recargar.disabled = true;
  lista.replaceChildren();
  lista.setAttribute('aria-busy', 'true');
  document.querySelector('#vacio').hidden = true;
  estado.textContent = 'Cargando regalos…';
  mostrarAviso('');
  try {
    [productos, categorias, ocasiones] = await Promise.all([
      pedir('/api/productos'), pedir('/api/categorias'), pedir('/api/ocasiones')
    ]);
    const ocasionAnterior = filtroOcasion.value;
    llenarSelector(filtroOcasion, ocasiones, 'Todas las ocasiones');
    if (ocasiones.some(ocasion => String(ocasion.id) === ocasionAnterior)) filtroOcasion.value = ocasionAnterior;
    if (formulario) {
      llenarSelector(formulario.elements.categoria_id, categorias, 'Selecciona una categoría');
      llenarSelector(formulario.elements.ocasion_id, ocasiones, 'Selecciona una ocasión');
    }
    if (!categorias.some(categoria => String(categoria.id) === categoriaActiva)) categoriaActiva = '';
    mostrarCategorias();
    mostrarProductos();
    catalogoDisponible = true;
    if (nuevo) {
      nuevo.disabled = !categorias.length || !ocasiones.length;
      if (nuevo.disabled) mostrarAviso('Faltan categorías u ocasiones para poder agregar regalos.', true);
    }
    document.dispatchEvent(new Event('catalogoActualizado'));
    return true;
  } catch (error) {
    productos = [];
    document.querySelector('#categorias').replaceChildren();
    estado.textContent = 'Catálogo no disponible';
    mostrarAviso(`${error.message} Usa «Actualizar catálogo» para volver a intentar.`, true);
    return false;
  } finally {
    cargando = false;
    recargar.disabled = false;
    lista.setAttribute('aria-busy', 'false');
  }
}

// persona dos: eventos de búsqueda, filtros y botón para volver a consultar los datos.
document.querySelector('#filtros').addEventListener('submit', evento => evento.preventDefault());
for (const control of [buscar, filtroOcasion, orden]) {
  control.addEventListener('input', () => { if (catalogoDisponible) mostrarProductos(); });
}
document.querySelector('#categorias').addEventListener('click', evento => {
  const boton = evento.target.closest('button');
  if (!boton || !catalogoDisponible) return;
  categoriaActiva = boton.dataset.id;
  mostrarCategorias();
  mostrarProductos();
});
document.querySelector('#limpiar').addEventListener('click', () => {
  document.querySelector('#filtros').reset();
  categoriaActiva = '';
  if (catalogoDisponible) {
    mostrarCategorias();
    mostrarProductos();
  }
});
recargar.addEventListener('click', cargarCatalogo);


cargarCatalogo();
