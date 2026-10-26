import pg from 'pg';
import { readFileSync } from 'node:fs';

// persona dos: conserva PostgreSQL en Supabase y cierra cada conexión al terminar.
export async function consultar(sql, parametros = []) {
  const conexion = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!conexion) throw new Error('Falta configurar DIRECT_URL en .env.');

  const cliente = new pg.Client({
    connectionString: conexion,
    ssl: {
      ca: readFileSync(new URL('./certs/supabase-ca.crt', import.meta.url), 'utf8'),
      rejectUnauthorized: true
    },
    connectionTimeoutMillis: 5000,
    query_timeout: 5000
  });
  try {
    await cliente.connect();
    return await cliente.query(sql, parametros);
  } finally {
    await cliente.end();
  }
}

// persona dos: consultas de lectura para el estado, los selectores y el catálogo.
export async function comprobarBase() {
  const { rows } = await consultar(`
    select
      (select count(*)::integer from public.categorias) as categorias,
      (select count(*)::integer from public.ocasiones) as ocasiones,
      (select count(*)::integer from public.regalos) as regalos
  `);
  return rows[0];
}

export async function obtenerCategorias() {
  const { rows } = await consultar(`
    select c.id, c.nombre, count(r.id)::integer as productos
    from public.categorias c
    left join public.regalos r on r.categoria_id = c.id
    group by c.id, c.nombre
    order by c.id
  `);
  return rows;
}

export async function obtenerOcasiones() {
  const { rows } = await consultar('select id, nombre from public.ocasiones order by id');
  return rows;
}

export async function obtenerProductos() {
  const { rows } = await consultar(`
    select r.*, c.nombre as categoria, o.nombre as ocasion
    from public.regalos r
    join public.categorias c on c.id = r.categoria_id
    join public.ocasiones o on o.id = r.ocasion_id
    order by r.id desc
  `);
  return rows;
}

export async function obtenerProducto(id) {
  const { rows } = await consultar(`
    select r.*, c.nombre as categoria, o.nombre as ocasion
    from public.regalos r
    join public.categorias c on c.id = r.categoria_id
    join public.ocasiones o on o.id = r.ocasion_id
    where r.id = $1
  `, [id]);
  return rows[0];
}

// persona tres: $1, $2... separan los datos del SQL para no ejecutar texto del usuario.
export async function guardarProducto(datos) {
  const { nombre, descripcion, precio, categoria_id, ocasion_id } = datos;
  const { rows } = await consultar(`
    insert into public.regalos (nombre, descripcion, precio, categoria_id, ocasion_id)
    values ($1, $2, $3, $4, $5)
    returning *
  `, [nombre, descripcion, precio, categoria_id, ocasion_id]);
  return rows[0];
}

// persona tres: COALESCE conserva el valor anterior cuando PATCH omite un campo.
export async function actualizarProducto(id, datos) {
  const { nombre, descripcion, precio, categoria_id, ocasion_id } = datos;
  const { rows } = await consultar(`
    update public.regalos
    set nombre = coalesce($1, nombre), descripcion = coalesce($2, descripcion),
        precio = coalesce($3, precio), categoria_id = coalesce($4, categoria_id),
        ocasion_id = coalesce($5, ocasion_id)
    where id = $6
    returning *
  `, [nombre, descripcion, precio, categoria_id, ocasion_id, id]);
  return rows[0];
}

// persona cuatro: RETURNING permite saber si DELETE encontró y eliminó el regalo.
export async function eliminarProducto(id) {
  const { rows } = await consultar('delete from public.regalos where id = $1 returning *', [id]);
  return rows[0];
}
