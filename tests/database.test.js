import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import app from '../app.js';

process.env.ADMIN_PASSWORD = 'clave-solo-para-pruebas';
const cliente = request.agent(app).auth('admin', process.env.ADMIN_PASSWORD);

import { consultar } from '../database.js';

// persona cuatro: estas pruebas usan Supabase real; solo modifican sus propios regalos temporales.
test('GET comprueba las tres tablas y carga categorías, ocasiones y regalos', async () => {
  const respuesta = await cliente.get('/api/base-datos');
  assert.equal(respuesta.status, 200, respuesta.body.mensaje);
  assert.equal(respuesta.body.ok, true);
  for (const tabla of ['categorias', 'ocasiones', 'regalos']) {
    assert.ok(Number.isInteger(respuesta.body.tablas[tabla]));
    assert.ok(respuesta.body.tablas[tabla] >= 0);
  }
  for (const ruta of ['/api/categorias', '/api/ocasiones', '/api/productos']) {
    const lista = await cliente.get(ruta);
    assert.equal(lista.status, 200, lista.body.mensaje);
    assert.ok(Array.isArray(lista.body));
  }
});

// persona cuatro: verifica persistencia con SQL además de comprobar las respuestas HTTP.
test('POST → GET → PUT → PATCH → DELETE guarda realmente cada cambio', async (t) => {
  const categorias = await cliente.get('/api/categorias');
  const ocasiones = await cliente.get('/api/ocasiones');
  assert.equal(categorias.status, 200, categorias.body.mensaje);
  assert.equal(ocasiones.status, 200, ocasiones.body.mensaje);
  assert.ok(categorias.body.length > 0, 'Se necesita al menos una categoría');
  assert.ok(ocasiones.body.length > 0, 'Se necesita al menos una ocasión');
  const categoria = categorias.body[0];
  const ocasion = ocasiones.body[0];
  const nombre = `Prueba HTTP ${randomUUID()}`;
  const nombreEditado = `${nombre} editado`;

  // Limpieza limitada a los dos nombres únicos de esta prueba, aunque una aserción falle.
  t.after(async () => {
    await consultar('delete from public.regalos where nombre = any($1::text[])', [[nombre, nombreEditado]]);
  });

  const datos = {
    nombre, descripcion: 'Regalo temporal de la prueba', precio: 12000,
    categoria_id: Number(categoria.id), ocasion_id: Number(ocasion.id)
  };
  const creado = await cliente.post('/api/productos').send(datos);
  assert.equal(creado.status, 201, creado.body.mensaje);
  assert.equal(creado.body.ok, true);
  const id = creado.body.producto.id;
  const ruta = `/api/productos/${id}`;
  assert.equal(creado.headers.location, ruta);

  const guardado = await consultar('select * from public.regalos where id = $1', [id]);
  assert.equal(guardado.rows[0].nombre, nombre);
  assert.equal(Number(guardado.rows[0].precio), datos.precio);
  const detalle = await cliente.get(ruta);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.categoria, categoria.nombre);
  assert.equal(detalle.body.ocasion, ocasion.nombre);
  const listado = await cliente.get('/api/productos');
  assert.ok(listado.body.some(producto => producto.id === id));
  const conteos = await cliente.get('/api/categorias');
  assert.equal(conteos.body.find(fila => fila.id === categoria.id).productos, categoria.productos + 1);

  const repetido = await cliente.post('/api/productos').send(datos);
  assert.equal(repetido.status, 409);

  const reemplazo = {
    ...datos, nombre: nombreEditado, descripcion: '', precio: 15500.25,
    categoria_id: Number(categorias.body.at(-1).id), ocasion_id: Number(ocasiones.body.at(-1).id)
  };
  const editado = await cliente.put(ruta).send(reemplazo);
  assert.equal(editado.status, 200, editado.body.mensaje);
  const filaEditada = (await consultar('select * from public.regalos where id = $1', [id])).rows[0];
  assert.equal(filaEditada.nombre, nombreEditado);
  assert.equal(filaEditada.descripcion, '');
  assert.equal(Number(filaEditada.precio), reemplazo.precio);
  assert.equal(Number(filaEditada.categoria_id), reemplazo.categoria_id);
  assert.equal(Number(filaEditada.ocasion_id), reemplazo.ocasion_id);

  const parcial = await cliente.patch(ruta).send({ precio: 18000.50 });
  assert.equal(parcial.status, 200, parcial.body.mensaje);
  const filaParcial = (await consultar('select * from public.regalos where id = $1', [id])).rows[0];
  assert.deepEqual(filaParcial, { ...filaEditada, precio: '18000.50' });
  const otrosCampos = await cliente.patch(ruta).send({ nombre, descripcion: 'Nueva descripción', categoria_id: datos.categoria_id, ocasion_id: datos.ocasion_id });
  assert.equal(otrosCampos.status, 200);
  assert.equal(otrosCampos.body.producto.nombre, nombre);
  assert.equal(Number(otrosCampos.body.producto.precio), 18000.50);
  const vaciar = await cliente.patch(ruta).send({ descripcion: '' });
  assert.equal(vaciar.status, 200);
  assert.equal(vaciar.body.producto.descripcion, '');

  const borrado = await cliente.delete(ruta);
  assert.equal(borrado.status, 200, borrado.body.mensaje);
  assert.equal(borrado.body.ok, true);
  const despues = await consultar('select id from public.regalos where id = $1', [id]);
  assert.equal(despues.rows.length, 0);
  const categoriasFinales = await cliente.get('/api/categorias');
  assert.equal(categoriasFinales.body.find(fila => fila.id === categoria.id).productos, categoria.productos);
  for (const metodo of ['get', 'put', 'patch', 'delete']) {
    const respuesta = await cliente[metodo](ruta).send(datos);
    assert.equal(respuesta.status, 404, `${metodo} debe reconocer que el regalo ya no existe`);
    assert.equal(respuesta.body.ok, false);
  }
});

test('POST, PUT y PATCH respetan nombres únicos y claves foráneas sin guardar cambios inválidos', async (t) => {
  const categorias = await cliente.get('/api/categorias');
  const ocasiones = await cliente.get('/api/ocasiones');
  assert.equal(categorias.status, 200, categorias.body.mensaje);
  assert.equal(ocasiones.status, 200, ocasiones.body.mensaje);
  assert.ok(categorias.body.length && ocasiones.body.length);
  const nombre = `Prueba reglas ${randomUUID()}`;
  const segundoNombre = `${nombre} segundo`;
  const nombreInvalido = `${nombre} inválido`;
  t.after(async () => {
    await consultar('delete from public.regalos where nombre = any($1::text[])', [[nombre, segundoNombre, nombreInvalido]]);
  });
  const datos = { nombre, precio: 1000, categoria_id: Number(categorias.body[0].id), ocasion_id: Number(ocasiones.body[0].id) };
  const creado = await cliente.post('/api/productos').send(datos);
  assert.equal(creado.status, 201, creado.body.mensaje);
  assert.equal(creado.body.producto.descripcion, '');
  const segundo = await cliente.post('/api/productos').send({ ...datos, nombre: segundoNombre });
  assert.equal(segundo.status, 201, segundo.body.mensaje);
  const ruta = `/api/productos/${creado.body.producto.id}`;
  const maximos = (await consultar(`
    select (select coalesce(max(id), 0) + 1 from public.categorias) as categoria,
           (select coalesce(max(id), 0) + 1 from public.ocasiones) as ocasion
  `)).rows[0];
  for (const metodo of ['post', 'put', 'patch']) {
    const url = metodo === 'post' ? '/api/productos' : ruta;
    const duplicado = await cliente[metodo](url).send({ ...datos, descripcion: '', nombre: segundoNombre });
    assert.equal(duplicado.status, 409);
    for (const cambios of [{ categoria_id: Number(maximos.categoria) }, { ocasion_id: Number(maximos.ocasion) }]) {
      const invalido = await cliente[metodo](url).send({
        ...datos, nombre: metodo === 'post' ? nombreInvalido : nombre, descripcion: '', ...cambios
      });
      assert.equal(invalido.status, 400, `${metodo} debe rechazar referencias inexistentes`);
    }
  }
  const conservado = await cliente.get(ruta);
  assert.equal(conservado.body.nombre, nombre);
  assert.equal(conservado.body.categoria_id, String(datos.categoria_id));
  assert.equal(conservado.body.ocasion_id, String(datos.ocasion_id));
});
