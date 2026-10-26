import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

process.env.ADMIN_PASSWORD = 'clave-solo-para-pruebas';
const cliente = request.agent(app).auth('admin', process.env.ADMIN_PASSWORD);


// persona cuatro: pruebas HTTP locales. Los datos inválidos no llegan a PostgreSQL.
const producto = { nombre: 'Regalo de prueba', descripcion: '', precio: 10000, categoria_id: 1, ocasion_id: 1 };

test('GET comprueba el servidor y sirve los archivos de la página', async () => {
  const salud = await cliente.get('/api/salud');
  assert.equal(salud.status, 200);
  assert.equal(salud.body.ok, true);
  for (const ruta of ['/', '/style.css', '/categorias.js', '/carrito.js', '/admin.js', '/admin']) {
    const respuesta = await cliente.get(ruta);
    assert.equal(respuesta.status, 200);
  }
});

// persona cuatro: ocultar botones no basta; el servidor también debe exigir la clave.
test('la tienda es pública y la administración exige credenciales correctas', async () => {
  const tienda = await request(app).get('/');
  assert.equal(tienda.status, 200);
  assert.ok(tienda.text.includes('id="abrir-carrito"'));
  assert.ok(!tienda.text.includes('id="formulario-regalo"'));
  for (const ruta of ['/admin', '/admin.html']) {
    const privado = await request(app).get(ruta);
    assert.equal(privado.status, 401);
    assert.ok(privado.headers['www-authenticate'].startsWith('Basic '));
    assert.equal((await request(app).get(ruta).auth('admin', 'incorrecta')).status, 401);
    const autorizado = await cliente.get(ruta);
    assert.equal(autorizado.status, 200);
    assert.ok(autorizado.text.includes('id="formulario-regalo"'));
  }
  for (const metodo of ['post', 'put', 'patch', 'delete']) {
    const ruta = metodo === 'post' ? '/api/productos' : '/api/productos/1';
    assert.equal((await request(app)[metodo](ruta).send(producto)).status, 401);
    assert.equal((await request(app)[metodo](ruta).auth('otro', 'clave-solo-para-pruebas').send(producto)).status, 401);
  }
  for (const ruta of ['/.env', '/database.js']) assert.equal((await request(app).get(ruta)).status, 404);
});

test('sin clave configurada la administración permanece cerrada', async () => {
  const anterior = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;
  try {
    assert.equal((await request(app).get('/admin')).status, 503);
    assert.equal((await request(app).delete('/api/productos/1')).status, 503);
    assert.equal((await request(app).get('/')).status, 200);
  } finally {
    process.env.ADMIN_PASSWORD = anterior;
  }
});

test('la configuración pública devuelve solo el WhatsApp y rechaza un número inválido', async () => {
  const anterior = process.env.WHATSAPP_NUMERO;
  try {
    process.env.WHATSAPP_NUMERO = '573022379960';
    const respuesta = await request(app).get('/api/tienda');
    assert.equal(respuesta.status, 200);
    assert.deepEqual(respuesta.body, { whatsapp: '573022379960' });
    for (const numero of ['', '302', '+573022379960', 'https://otro.example']) {
      process.env.WHATSAPP_NUMERO = numero;
      assert.equal((await request(app).get('/api/tienda')).status, 503);
    }
  } finally {
    if (anterior === undefined) delete process.env.WHATSAPP_NUMERO;
    else process.env.WHATSAPP_NUMERO = anterior;
  }
});

test('POST y PUT rechazan datos incompletos, campos extra y valores inválidos', async () => {
  const casos = [
    {}, [], { ...producto, nombre: '   ' }, { ...producto, nombre: 'a'.repeat(101) },
    { ...producto, descripcion: {} }, { ...producto, descripcion: 'a'.repeat(501) },
    { ...producto, precio: -500 }, { ...producto, precio: 0 }, { ...producto, precio: 0.001 },
    { ...producto, precio: '10000' }, { ...producto, precio: 100000000 },
    { ...producto, categoria_id: 0 }, { ...producto, ocasion_id: 1.5 },
    { ...producto, categoria_id: null }, { ...producto, extra: 'no permitido' }
  ];
  for (const metodo of ['post', 'put']) {
    for (const datos of casos) {
      const ruta = metodo === 'post' ? '/api/productos' : '/api/productos/1';
      const respuesta = await cliente[metodo](ruta).send(datos);
      assert.equal(respuesta.status, 400, `${metodo}: ${JSON.stringify(datos)}`);
      assert.equal(respuesta.body.ok, false);
    }
  }
});

test('PUT exige todos los campos, incluso la descripción (puede estar vacía)', async () => {
  for (const campo of Object.keys(producto)) {
    const datos = { ...producto };
    delete datos[campo];
    const respuesta = await cliente.put('/api/productos/1').send(datos);
    assert.equal(respuesta.status, 400, `Falta ${campo}`);
  }
});

test('PATCH rechaza cambios vacíos, desconocidos o inválidos', async () => {
  for (const datos of [{}, [], { id: 2 }, { precio: null }, { precio: -1 },
    { nombre: '' }, { descripcion: false }, { ocasion_id: '1' }, { categoria_id: 0 }]) {
    const respuesta = await cliente.patch('/api/productos/1').send(datos);
    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.ok, false);
  }
});

test('GET, PUT, PATCH y DELETE rechazan IDs inválidos', async () => {
  for (const metodo of ['get', 'put', 'patch', 'delete']) {
    for (const id of ['-1', '0', '1.5', 'texto', '1e3', '9007199254740992']) {
      const respuesta = await cliente[metodo](`/api/productos/${id}`).send(producto);
      assert.equal(respuesta.status, 400, `${metodo} ${id}`);
      assert.equal(respuesta.body.ok, false);
    }
  }
});

test('POST, PUT y PATCH exigen JSON válido y limitan el tamaño del cuerpo', async () => {
  for (const metodo of ['post', 'put', 'patch']) {
    const ruta = metodo === 'post' ? '/api/productos' : '/api/productos/1';
    const sinJson = await cliente[metodo](ruta).type('text').send('hola');
    assert.equal(sinJson.status, 415);
    const roto = await cliente[metodo](ruta).type('json').send('{');
    assert.equal(roto.status, 400);
    assert.equal(roto.body.ok, false);
    const grande = await cliente[metodo](ruta).send({ descripcion: 'x'.repeat(11000) });
    assert.equal(grande.status, 413);
    assert.equal(grande.body.ok, false);
  }
});

test('una ruta API desconocida devuelve 404 en JSON', async () => {
  const respuesta = await cliente.get('/api/no-existe');
  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.ok, false);
});

// persona cuatro: simula una conexión sin configurar, sin exponer ni cambiar el archivo .env.
test('si falta la conexión, todas las operaciones devuelven 503 sin anunciar éxito', async () => {
  const anterior = { DIRECT_URL: process.env.DIRECT_URL, DATABASE_URL: process.env.DATABASE_URL };
  delete process.env.DIRECT_URL;
  delete process.env.DATABASE_URL;
  try {
    const peticiones = [
      ['get', '/api/base-datos'], ['get', '/api/categorias'], ['get', '/api/ocasiones'],
      ['get', '/api/productos'], ['get', '/api/productos/1'], ['post', '/api/productos'],
      ['put', '/api/productos/1'], ['patch', '/api/productos/1'], ['delete', '/api/productos/1']
    ];
    for (const [metodo, ruta] of peticiones) {
      const respuesta = await cliente[metodo](ruta).send(producto);
      assert.equal(respuesta.status, 503, `${metodo} ${ruta}`);
      assert.equal(respuesta.body.ok, false);
      assert.equal(respuesta.body.producto, undefined);
    }
  } finally {
    for (const [clave, valor] of Object.entries(anterior)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  }
});
