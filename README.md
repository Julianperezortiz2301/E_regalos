# E-regalos

Tienda de regalos con carrito y pedidos por WhatsApp, más un panel separado para administrar el catálogo. Conserva **HTML, CSS, JavaScript, Node.js, Express y PostgreSQL en Supabase**. No necesita frameworks de interfaz, ORM ni herramientas de compilación. Los precios están en pesos colombianos (COP).

**Tienda publicada:** https://e-regalos.vercel.app · **Administración:** https://e-regalos.vercel.app/admin

**Repositorio:** https://github.com/Julianperezortiz2301/E_regalos

Vista comprobada en navegador: [escritorio](docs/vista-escritorio.png) · [celular](docs/vista-celular.png) · [carrito](docs/vista-carrito.png) · [carrito en celular](docs/vista-carrito-celular.png).

## Ejecutar

Necesitas Node.js 24 o superior y la conexión de Supabase configurada en `.env`.

```powershell
npm.cmd install
npm.cmd start
```

Abre **http://localhost:3000**. Usa `npm.cmd run dev` si quieres reiniciar automáticamente el servidor al guardar cambios. Si ya tienes un servidor encendido con `npm start`, detenlo con `Ctrl+C` y vuelve a iniciarlo.

La conexión existente se conserva. No hace falta volver a crear tablas ni ejecutar los archivos SQL para utilizar estas mejoras.

## Comprar y administrar

La tienda está en **http://localhost:3000/**. El cliente agrega regalos al carrito, ajusta cantidades (de 1 a 99 por producto), puede quitarlos o vaciar el carrito y ve el total. Al indicar su nombre y una nota opcional, pulsa **Pedir por WhatsApp**.

Antes de abrir el chat, se consultan nuevamente los productos en Supabase. Si cambió un precio o se eliminó un regalo, se actualiza el carrito y se pide revisarlo. Si falla la conexión, el carrito se conserva y se puede reintentar. El mensaje incluye cantidades, precios unitarios, subtotales, total y nota. Los precios se calculan en centavos para evitar errores de redondeo.

El destino configurado es **+57 302 237 9960**. Se cambia en `.env` con `WHATSAPP_NUMERO=573022379960` (código del país y número, sin signos ni espacios). El enlace utiliza el [formato oficial de WhatsApp](https://faq.whatsapp.com/5913398998672934). El cliente todavía debe pulsar **Enviar** dentro de WhatsApp; la entrega, disponibilidad y pago se acuerdan por chat. Abrir el chat no registra un pago ni confirma un pedido en la base de datos.

El navegador guarda únicamente IDs y cantidades en `localStorage`; no guarda allí el nombre ni la nota. El carrito permanece al recargar y después de abrir WhatsApp, porque la web no puede saber si el mensaje se envió. Los productos y precios siguen viniendo de PostgreSQL.

La administración está en **http://localhost:3000/admin**, también enlazada al pie de la tienda. El navegador pide el usuario **admin** y la contraseña de **`ADMIN_PASSWORD` en tu `.env`**. Se generó una clave local; puedes cambiarla y reiniciar el servidor. En otra instalación debes definirla antes de usar el panel. La clave no se entrega al JavaScript del cliente. El navegador puede recordar este acceso hasta cerrar la sesión del navegador.

Desde la administración puedes:

- Ver los regalos guardados, con su categoría, ocasión, descripción y precio.
- Buscar por nombre o descripción y filtrar por categoría y ocasión.
- Ordenar por precio, nombre o fecha de incorporación (ID más reciente).
- Crear un regalo con **Nuevo regalo**.
- Editar todos sus datos con **Editar**.
- Actualizar únicamente su precio con **Cambiar precio**.
- Eliminarlo después de confirmar el nombre del regalo.
- Actualizar el catálogo y comprobar la conexión desde la página.

Los formularios usan las categorías y ocasiones que ya existen en la base. La búsqueda y los filtros se aplican en el navegador sobre los regalos descargados. Si la conexión falla, la página muestra el error y permite reintentar. El diseño usa Arial, colores planos, bordes sencillos y tarjetas con foto. El CSS está organizado por secciones y usa dos ajustes de ancho para tablets y celulares.

Las fotos se guardan en `public/imagenes/` y sus rutas en la columna `imagenes` de cada regalo. Snoopy tiene cuatro vistas originales aportadas por el usuario; la taza y los chocolates usan fotos de ejemplo de Unsplash adaptadas al mismo fondo beige. Las miniaturas cambian la vista con un clic. Un regalo nuevo sin imágenes muestra «Sin foto disponible». Consulta las [fuentes y detalles de las imágenes](docs/imagenes.md).

## Reparto para cuatro personas

Los nombres aparecen **encima de cada bloque principal**, en comentarios del código. Son responsables asignados para organizar la entrega del equipo.

| Persona | Responsabilidad | Dónde explicar su parte |
| --- | --- | --- |
| persona una | Estructura de tienda y administración, diseño del carrito, adaptación a celular y arranque | `public/index.html`, `admin.html`, `public/style.css`, `server.js` |
| persona dos | Supabase, consultas GET, catálogo, filtros y conservación del carrito | Consultas en `database.js`, rutas GET en `app.js`, `public/categorias.js`, inicio de `public/carrito.js`, `sql/01_tablas.sql` y `sql/02_datos.sql` |
| persona tres | Validación, creación POST, edición PUT/PATCH, cantidades y totales del carrito | Escritura en `database.js`, validación en `app.js`, `public/admin.js`, `public/carrito.js` |
| persona cuatro | DELETE, acceso del administrador, revisión del pedido y enlace a WhatsApp, errores y pruebas | `app.js`, `public/admin.js`, final de `public/carrito.js`, `tests/`, este README |

### Explicación sencilla del recorrido

1. El administrador pulsa un botón o envía un formulario en `admin.html`.
2. `admin.js` llama a `pedir()` de `categorias.js`, que usa `fetch()` para enviar una petición HTTP.
3. `app.js` revisa los datos y llama a una consulta de `database.js`.
4. PostgreSQL consulta o cambia la fila de `public.regalos`.
5. Express devuelve JSON con el resultado. La página actualiza el catálogo.

Las consultas usan parámetros `$1`, `$2`, etc., para separar los datos del texto SQL. `async` y `await` permiten esperar la consulta antes de responder. Express 5 lleva los errores de las rutas asíncronas al manejador situado al final de `app.js`.

## Peticiones HTTP

| Método y ruta | Resultado real | Acción en la página |
| --- | --- | --- |
| `GET /api/salud` | Confirma que el servidor responde | Comprobación desde navegador o pruebas |
| `GET /api/tienda` | Devuelve solo el número público de WhatsApp | Destino del pedido |
| `GET /api/base-datos` | Cuenta categorías, ocasiones y regalos en Supabase | Comprobar conexión |
| `GET /api/categorias` | Lista categorías y número de regalos de cada una | Botones de categoría y selector del formulario |
| `GET /api/ocasiones` | Lista las ocasiones existentes | Filtro y selector del formulario |
| `GET /api/productos` | Lista regalos con categoría y ocasión | Carga y actualización del catálogo |
| `GET /api/productos/:id` | Consulta un regalo; 404 si no existe | Recupera los datos antes de abrir una acción |
| `POST /api/productos` | Inserta un regalo; responde 201 y su ubicación | Nuevo regalo |
| `PUT /api/productos/:id` | Reemplaza los cinco campos del regalo | Editar |
| `PATCH /api/productos/:id` | Modifica solo los campos enviados | Cambiar precio |
| `DELETE /api/productos/:id` | Elimina el regalo; responde 200 | Confirmación de eliminación |

`POST`, `PUT`, `PATCH` y `DELETE` exigen autenticación HTTP Basic con el usuario `admin` y `ADMIN_PASSWORD`. Las lecturas del catálogo son públicas. `POST`, `PUT` y `PATCH` reciben `Content-Type: application/json`. Ejemplo de cuerpo (usa IDs que existan en tu base):

```json
{
  "nombre": "Caja especial",
  "descripcion": "Chocolates y una nota personalizada.",
  "precio": 35000,
  "categoria_id": 1,
  "ocasion_id": 1
}
```

`PUT` exige los cinco campos; `descripcion` puede ser `""`. `POST` permite omitir la descripción. `PATCH` acepta uno o más de esos campos: por ejemplo, `{ "precio": 39000 }`. La consulta `COALESCE` conserva cada valor que no se envió en un PATCH.

Los nombres deben tener entre 1 y 100 caracteres; las descripciones, hasta 500. El precio debe ser positivo, menor a 100 millones y tener como máximo dos decimales. Los IDs deben ser enteros positivos y sus referencias deben existir. PostgreSQL evita nombres duplicados.

Las lecturas de listas responden con un arreglo; la consulta por ID, con el objeto del regalo. Las escrituras exitosas responden `{ "ok": true, "mensaje": "...", "producto": { ... } }`. Los errores responden `{ "ok": false, "mensaje": "..." }`.

Códigos usados: **200** consulta o cambio correcto, **201** creado, **400** datos inválidos, **401** acceso de administrador requerido, **404** regalo o ruta inexistente, **409** nombre repetido, **413** cuerpo demasiado grande, **415** formato no admitido y **503** consulta o configuración no disponible.

## Cómo comprobarlo y exponerlo

**persona cuatro:** las pruebas comprueban las respuestas HTTP, las validaciones y la persistencia.

```powershell
npm.cmd test
```

Ejecuta 11 pruebas locales sin internet: tienda pública, protección del panel y de las escrituras, configuración del WhatsApp, archivos, datos inválidos, IDs, JSON, límite del cuerpo, rutas desconocidas y conexión no configurada. Las pruebas usan su propia clave temporal en memoria; no cambian la de `.env`.

```powershell
npm.cmd run test:db
```

Ejecuta 3 pruebas con Supabase real. Comprueba las lecturas, el ciclo **POST → GET → PUT → PATCH → DELETE**, nombres duplicados, claves foráneas y registros inexistentes. Consulta PostgreSQL después de los cambios para verificar que se guardaron. Crea regalos con nombres únicos y elimina solo esos registros temporales al finalizar, incluso si una comprobación falla. Los contadores de ID pueden avanzar.

Para ejecutar ambas pruebas no necesitas tener `npm start` abierto. La segunda necesita internet, `.env`, las tres tablas y al menos una categoría y una ocasión.

También se verificó en Chrome: agregar y quitar regalos, cantidades, totales, persistencia al recargar, datos locales dañados, cambios de precio, productos eliminados, errores de conexión, formularios del administrador y presentación en celular. Se interceptó el enlace a WhatsApp para comprobar el número y el mensaje sin enviar un pedido real.

Para exponer en el navegador, abre **F12 → Red/Network**, filtra por **Fetch/XHR** y realiza las acciones de la página. Puedes ver el método HTTP, los datos enviados, el código de respuesta y el JSON. Recarga después de guardar para demostrar que los datos permanecen en Supabase.

## Archivos principales

- `server.js`: inicia Express.
- `app.js`: rutas HTTP, validación y mensajes de error.
- `database.js`: conexión y consultas SQL sencillas.
- `public/index.html`: tienda, tarjetas y carrito del cliente.
- `admin.html`: panel privado y formularios del CRUD; se sirve después de validar la clave.
- `public/style.css`: diseño y adaptación a pantallas pequeñas.
- `public/categorias.js`: peticiones, catálogo, fotos y filtros compartidos.
- `public/admin.js`: formularios y acciones del CRUD.
- `public/carrito.js`: selección de productos, cantidades, total y pedido por WhatsApp.
- `public/imagenes/`: fotografías locales del catálogo.
- `tests/`: pruebas locales y pruebas reales con Supabase.
- `sql/`: estructura original, ejemplos y comprobaciones SQL.
- `certs/`: certificado público para verificar la conexión cifrada.

## Preparar otra base de datos

1. Crea otro proyecto de Supabase.
2. Ejecuta `sql/01_tablas.sql` una sola vez y después `sql/02_datos.sql` en SQL Editor.
3. Copia `.env.example` como `.env` si no existe.
4. Guarda en `DIRECT_URL` la conexión **Session pooler**, puerto `5432`, que muestre tu proyecto. Codifica los caracteres especiales de la contraseña para URL: por ejemplo, `@` se escribe `%40`.
5. Reinicia Node y pulsa **Comprobar conexión**.

Si `DIRECT_URL` está vacía, el código usa `DATABASE_URL`. `.env` no se sirve al navegador y está excluido de Git y Docker. Las tablas siguen siendo `categorias`, `ocasiones` y `regalos`. Se añadió `imagenes`, una lista de rutas de texto, a la tabla `regalos`. En una base creada con la versión anterior, ejecuta `sql/04_imagenes.sql` una vez antes de volver a usar `sql/02_datos.sql`. La base conectada a este proyecto ya está actualizada.

El servidor escucha en `127.0.0.1` por defecto. La administración utiliza una única clave mediante HTTP Basic, sin cuentas ni librerías adicionales. Si publicas la tienda, sirve el sitio con **HTTPS** para proteger las credenciales del administrador en tránsito.

## Publicar en Vercel

**persona cuatro:** `vercel.json` selecciona Express e incluye la portada, `admin.html` y el certificado de Supabase en la función del servidor. `app.js` exporta la aplicación y tiene una ruta explícita para `/`. Vercel sirve el contenido de `public/` y ejecuta las rutas HTTP con Node.js 24; no se necesita Docker ni cambiar de base de datos. Consulta la [documentación oficial de Express en Vercel](https://vercel.com/docs/frameworks/backend/express).

El archivo `.vercelignore` excluye las claves de `.env`, las pruebas y los archivos locales. Configura estas variables en el proyecto de Vercel, dentro del entorno **Production**, antes de desplegar:

- `DIRECT_URL`: la conexión actual de Supabase (variable sensible).
- `ADMIN_PASSWORD`: la clave actual del administrador (variable sensible).
- `WHATSAPP_NUMERO`: `573022379960`.

Los valores privados se toman de tu `.env`; no deben escribirse en `vercel.json` ni guardarse en el código público. No es necesario configurar `PORT` ni `HOST` en Vercel.

Para publicar o actualizar desde esta carpeta, con una sesión iniciada y el proyecto vinculado:

```powershell
npx vercel login
npx vercel --prod
```

Después de publicar, verifica `/`, `/api/salud`, `/api/productos`, `/api/tienda` y el acceso con clave a `/admin`. El pedido de WhatsApp utiliza el mismo número y los mismos productos de Supabase que la versión local.

La versión publicada se comprobó con peticiones HTTP reales: portada, fotos, catálogo, configuración de WhatsApp y administración. El ciclo POST → GET → PUT → PATCH → DELETE pasó usando un regalo temporal que se eliminó al terminar. Las escrituras sin clave se rechazaron y los archivos privados no se sirven al visitante. Las siguientes ediciones locales se publican ejecutando nuevamente `npx vercel --prod`.

También se comprobó el carrito en Chrome, la conservación al recargar, las cuatro fotos de Snoopy, el enlace de WhatsApp sin enviar mensajes y el panel admin. Capturas del sitio publicado: [escritorio](docs/vercel-escritorio.png) y [carrito en celular](docs/vercel-carrito-celular.png).

## Docker

Con Docker Desktop abierto y el puerto 3000 libre:

```powershell
docker compose up --build
```

Abre http://localhost:3000. Supabase continúa alojado online. Para detenerlo: `docker compose down`.

```powershell
docker compose run --build --rm app npm test
docker compose run --build --rm app npm run test:db
```
