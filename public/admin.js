// persona tres: abrir el formulario vacío o recuperar un regalo con GET antes de editar.
nuevo.addEventListener('click', () => {
  formulario.reset();
  formulario.dataset.id = '';
  document.querySelector('#titulo-formulario').textContent = 'Nuevo regalo';
  document.querySelector('#error-formulario').textContent = '';
  document.querySelector('#dialogo-regalo').showModal();
  formulario.elements.nombre.focus();
});

lista.addEventListener('click', async evento => {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton) return;
  const id = boton.closest('.product-card').dataset.id;
  boton.disabled = true;
  try {
    const producto = await pedir(`/api/productos/${id}`);
    if (boton.dataset.accion === 'editar') {
      formulario.dataset.id = id;
      for (const campo of ['nombre', 'descripcion', 'precio', 'categoria_id', 'ocasion_id']) {
        formulario.elements[campo].value = producto[campo];
      }
      document.querySelector('#titulo-formulario').textContent = 'Editar regalo';
      document.querySelector('#error-formulario').textContent = '';
      document.querySelector('#dialogo-regalo').showModal();
      formulario.elements.nombre.focus();
    } else if (boton.dataset.accion === 'precio') {
      formularioPrecio.dataset.id = id;
      document.querySelector('#nombre-precio').textContent = producto.nombre;
      document.querySelector('#precio-rapido').value = producto.precio;
      document.querySelector('#error-precio').textContent = '';
      document.querySelector('#dialogo-precio').showModal();
      document.querySelector('#precio-rapido').focus();
    } else {
      // persona cuatro: muestra el nombre exacto antes de confirmar la eliminación.
      formularioEliminar.dataset.id = id;
      document.querySelector('#nombre-eliminar').textContent = producto.nombre;
      document.querySelector('#error-eliminar').textContent = '';
      document.querySelector('#dialogo-eliminar').showModal();
    }
  } catch (error) {
    mostrarAviso(error.message, true);
  } finally {
    boton.disabled = false;
  }
});

// persona tres: envía el formulario, evita envíos dobles y conserva los datos si falla.
async function enviarFormulario(form, metodo, datos, errorId) {
  if (form.dataset.enviando === 'si') return;
  const mensajeError = document.querySelector(errorId);
  const boton = form.querySelector('[type="submit"]');
  const textoAnterior = boton.textContent;
  const ruta = '/api/productos' + (form.dataset.id ? `/${form.dataset.id}` : '');
  mensajeError.textContent = '';
  form.dataset.enviando = 'si';
  for (const control of form.elements) control.disabled = true;
  boton.textContent = 'Guardando…';
  try {
    const resultado = await pedir(ruta, metodo, datos);
    form.closest('dialog').close();
    if (metodo === 'POST') {
      document.querySelector('#filtros').reset();
      categoriaActiva = '';
    }
    const actualizado = await cargarCatalogo();
    mostrarAviso(actualizado ? resultado.mensaje : `${resultado.mensaje} No se pudo refrescar la lista; pulsa «Actualizar catálogo».`, !actualizado);
    estado.focus();
  } catch (error) {
    mensajeError.textContent = error.message;
  } finally {
    form.dataset.enviando = 'no';
    for (const control of form.elements) control.disabled = false;
    boton.textContent = textoAnterior;
  }
}

formulario.addEventListener('submit', evento => {
  evento.preventDefault();
  const campos = formulario.elements;
  const datos = {
    nombre: campos.nombre.value.trim(), descripcion: campos.descripcion.value.trim(),
    precio: Number(campos.precio.value), categoria_id: Number(campos.categoria_id.value),
    ocasion_id: Number(campos.ocasion_id.value)
  };
  enviarFormulario(formulario, formulario.dataset.id ? 'PUT' : 'POST', datos, '#error-formulario');
});

formularioPrecio.addEventListener('submit', evento => {
  evento.preventDefault();
  enviarFormulario(formularioPrecio, 'PATCH', { precio: Number(document.querySelector('#precio-rapido').value) }, '#error-precio');
});

// persona cuatro: DELETE solo se envía al confirmar. Cerrar un diálogo no cambia datos.
formularioEliminar.addEventListener('submit', evento => {
  evento.preventDefault();
  enviarFormulario(formularioEliminar, 'DELETE', undefined, '#error-eliminar');
});
for (const boton of document.querySelectorAll('[data-cerrar]')) {
  boton.addEventListener('click', () => boton.closest('dialog').close());
}
for (const dialogo of document.querySelectorAll('dialog')) {
  dialogo.addEventListener('cancel', evento => {
    if (dialogo.querySelector('form').dataset.enviando === 'si') evento.preventDefault();
  });
}

// persona cuatro: comprueba las tres tablas con una petición real, sin salir del sitio.
document.querySelector('#comprobar-conexion').addEventListener('click', async evento => {
  const boton = evento.currentTarget;
  const mensaje = document.querySelector('#estado-conexion');
  boton.disabled = true;
  mensaje.textContent = 'Comprobando conexión…';
  try {
    const resultado = await pedir('/api/base-datos');
    mensaje.textContent = `Conexión lista · ${resultado.tablas.regalos} regalos en el catálogo.`;
  } catch (error) {
    mensaje.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});
