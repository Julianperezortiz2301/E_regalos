import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import {
  comprobarBase, obtenerCategorias, obtenerOcasiones, obtenerProductos,
  obtenerProducto, guardarProducto, actualizarProducto, eliminarProducto
} from './database.js';

// persona una: configuración sencilla para servir el HTML, CSS y JavaScript.
const app = express();
app.use(express.json({ limit: '10kb' }));
// persona una: ruta de inicio explícita para que también funcione en Vercel.
app.get('/', (req, res) => {
  res.sendFile(import.meta.dirname + '/public/index.html');
});
app.use(express.static(import.meta.dirname + '/public'));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// persona cuatro: la clave protege tanto la página admin como las escrituras del CRUD.
function exigirAdmin(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ ok: false, mensaje: 'Configura ADMIN_PASSWORD en .env para activar la administración.' });
  }
  const esperado = Buffer.from('Basic ' + Buffer.from(`admin:${process.env.ADMIN_PASSWORD}`).toString('base64'));
  const recibido = Buffer.from(req.get('Authorization') || '');
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
    res.set('WWW-Authenticate', 'Basic realm="E-regalos admin", charset="UTF-8"');
    return res.status(401).json({ ok: false, mensaje: 'Se necesita acceso de administrador.' });
  }
  next();
}

app.get(['/admin', '/admin.html'], exigirAdmin, (req, res) => {
  res.sendFile(import.meta.dirname + '/admin.html');
});
app.use('/api/productos', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return exigirAdmin(req, res, next);
  next();
});

// persona dos: solo el número público llega al cliente; las claves siguen en el servidor.
app.get('/api/tienda', (req, res) => {
  const whatsapp = process.env.WHATSAPP_NUMERO || '';
  if (!/^[1-9]\d{7,14}$/.test(whatsapp)) {
    return res.status(503).json({ ok: false, mensaje: 'Los pedidos por WhatsApp no están disponibles en este momento.' });
  }
  res.json({ whatsapp });
});

// persona dos: GET consulta el servidor, la conexión y los datos del catálogo.
app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'El servidor está funcionando.' });
});

app.get('/api/base-datos', async (req, res) => {
  const tablas = await comprobarBase();
  res.json({ ok: true, mensaje: 'Conexión con Supabase lista.', tablas });
});

app.get('/api/categorias', async (req, res) => {
  res.json(await obtenerCategorias());
});

app.get('/api/ocasiones', async (req, res) => {
  res.json(await obtenerOcasiones());
});

app.get('/api/productos', async (req, res) => {
  res.json(await obtenerProductos());
});

// persona cuatro: ningún método que use un ID acepta números negativos o texto.
app.param('id', (req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({ ok: false, mensaje: 'El ID del regalo no es válido.' });
  }
  next();
});

// persona dos: consultar un solo regalo permite comprobar qué quedó guardado.
app.get('/api/productos/:id', async (req, res) => {
  const producto = await obtenerProducto(req.params.id);
  if (!producto) {
    return res.status(404).json({ ok: false, mensaje: 'El regalo no existe.' });
  }
  res.json(producto);
});

// persona tres: una misma validación para POST, PUT y PATCH evita repetir reglas.
// PUT exige todos los campos; PATCH comprueba únicamente los campos enviados.
function validarProducto(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ ok: false, mensaje: 'Envía los datos como application/json.' });
  }
  const datos = req.body;
  const campos = ['nombre', 'descripcion', 'precio', 'categoria_id', 'ocasion_id'];
  if (!datos || typeof datos !== 'object' || Array.isArray(datos) ||
      Object.keys(datos).length === 0 || Object.keys(datos).some(campo => !campos.includes(campo))) {
    return res.status(400).json({ ok: false, mensaje: 'Envía al menos un campo válido del regalo.' });
  }
  if (req.method === 'POST' && datos.descripcion === undefined) datos.descripcion = '';
  const parcial = req.method === 'PATCH';
  if ((!parcial || 'nombre' in datos) &&
      (typeof datos.nombre !== 'string' || !datos.nombre.trim() || datos.nombre.trim().length > 100)) {
    return res.status(400).json({ ok: false, mensaje: 'Escribe un nombre de 1 a 100 caracteres.' });
  }
  if ((!parcial || 'descripcion' in datos) &&
      (typeof datos.descripcion !== 'string' || datos.descripcion.trim().length > 500)) {
    return res.status(400).json({ ok: false, mensaje: 'La descripción debe ser texto de hasta 500 caracteres.' });
  }
  if ((!parcial || 'precio' in datos) &&
      (typeof datos.precio !== 'number' || !Number.isFinite(datos.precio) ||
       datos.precio <= 0 || datos.precio > 99999999.99 || Math.round(datos.precio * 100) / 100 !== datos.precio)) {
    return res.status(400).json({ ok: false, mensaje: 'El precio debe ser positivo, menor a 100 millones y tener máximo dos decimales.' });
  }
  for (const campo of ['categoria_id', 'ocasion_id']) {
    if ((!parcial || campo in datos) && (!Number.isSafeInteger(datos[campo]) || datos[campo] <= 0)) {
      return res.status(400).json({ ok: false, mensaje: 'Selecciona una categoría y una ocasión válidas.' });
    }
  }
  if ('nombre' in datos) datos.nombre = datos.nombre.trim();
  if ('descripcion' in datos) datos.descripcion = datos.descripcion.trim();
  next();
}

// persona tres: POST crea; PUT reemplaza los datos; PATCH modifica solo una parte.
app.post('/api/productos', validarProducto, async (req, res) => {
  const producto = await guardarProducto(req.body);
  res.status(201).location(`/api/productos/${producto.id}`)
    .json({ ok: true, mensaje: 'Regalo creado correctamente.', producto });
});

app.put('/api/productos/:id', validarProducto, async (req, res) => {
  const producto = await actualizarProducto(req.params.id, req.body);
  if (!producto) {
    return res.status(404).json({ ok: false, mensaje: 'El regalo no existe.' });
  }
  res.json({ ok: true, mensaje: 'Regalo actualizado correctamente.', producto });
});

app.patch('/api/productos/:id', validarProducto, async (req, res) => {
  const producto = await actualizarProducto(req.params.id, req.body);
  if (!producto) {
    return res.status(404).json({ ok: false, mensaje: 'El regalo no existe.' });
  }
  res.json({ ok: true, mensaje: 'Cambios guardados correctamente.', producto });
});

// persona cuatro: DELETE elimina la fila real y avisa si ya no existía.
app.delete('/api/productos/:id', async (req, res) => {
  const producto = await eliminarProducto(req.params.id);
  if (!producto) {
    return res.status(404).json({ ok: false, mensaje: 'El regalo no existe.' });
  }
  res.json({ ok: true, mensaje: 'Regalo eliminado correctamente.', producto });
});

// persona cuatro: los errores siempre se devuelven como JSON, sin credenciales ni SQL.
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, mensaje: 'La ruta solicitada no existe.' });
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, mensaje: 'El cuerpo debe ser un JSON válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, mensaje: 'La petición es demasiado grande.' });
  }
  if (error.status === 415) {
    return res.status(415).json({ ok: false, mensaje: 'El formato del cuerpo no está admitido.' });
  }
  if (error.code === '23505') {
    return res.status(409).json({ ok: false, mensaje: 'Ya existe un regalo con ese nombre.' });
  }
  if (error.code === '23503' || error.code === '23514') {
    return res.status(400).json({ ok: false, mensaje: 'Revisa el precio, la categoría y la ocasión del regalo.' });
  }
  res.status(503).json({ ok: false, mensaje: 'No se pudo completar la consulta. Revisa la conexión con Supabase e inténtalo de nuevo.' });
});

export default app;
