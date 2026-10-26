# Fotografías del catálogo

## persona una: presentación

Las imágenes están guardadas dentro del proyecto, en `public/imagenes/`. Las tarjetas muestran la foto completa sobre un fondo beige. Snoopy dispone de cuatro miniaturas; pulsarlas cambia la foto principal. Se utiliza HTML, CSS y un evento `click`, sin librerías de galería.

Los archivos originales de Snoopy se copiaron sin modificar su contenido:

| Archivo del proyecto | Archivo entregado por el usuario |
| --- | --- |
| `snoopy-frente.png` | `Imagen de ChatGPT 26 oct 2026, 15_13_50-1.png` |
| `snoopy-tres-cuartos.png` | `Imagen de ChatGPT 26 oct 2026, 15_13_51-2.png` |
| `snoopy-espalda.png` | `Imagen de ChatGPT 26 oct 2026, 15_13_53-3.png` |
| `snoopy-perfil.png` | `Imagen de ChatGPT 26 oct 2026, 15_13_54-4.png` |

## persona dos: origen y almacenamiento

- `chocolates.png`: adaptación de [Chocolate box, de Monique Carrati en Unsplash](https://unsplash.com/photos/assorted-chocolates-in-box---uvxmcdMv4).
- `taza.png`: adaptación de [las tazas con mensajes de Mel Poole en Unsplash](https://unsplash.com/photos/two-white-fill-me-up-with-coffee-and-fill-me-up-with-tea-printed-ceramic-mugs-isolated-on-white-background-AO-sgtbu3AE).

Las dos fotografías de internet se descargaron y se adaptaron con la herramienta integrada **imagegen**. Se tomó el fondo beige de Snoopy como referencia. En la imagen de las tazas se dejó únicamente la taza superior. Son imágenes de ejemplo para el catálogo, no fotografías verificadas del inventario. Las fotografías de origen se ofrecen bajo la [licencia de Unsplash](https://unsplash.com/license), que permite utilizarlas y modificarlas.

PostgreSQL guarda una lista de rutas en la columna `imagenes`. Las rutas siguen asociadas al mismo regalo si cambia su nombre, precio, categoría u ocasión. Los métodos GET ya seleccionan todas las columnas, por lo que devuelven esta lista junto con el resto de los datos. POST crea la lista vacía por defecto; PUT y PATCH conservan las fotos existentes.

`sql/04_imagenes.sql` añade la columna a una base existente y asigna las fotos a los tres regalos actuales. Solo completa listas vacías; no reemplaza fotografías ya asignadas ni modifica nombres, precios o descripciones. Los registros de Snoopy existentes se reconocen por los nombres «Snoopy» o «Snoopy de crochet», sin distinguir mayúsculas.

Para asociar más fotos, primero copia los archivos a `public/imagenes/` y después actualiza el regalo por su ID en SQL Editor. Por ejemplo, sustituyendo `ID_DEL_REGALO` por el número real:

```sql
update public.regalos
set imagenes = array['/imagenes/foto-frente.png', '/imagenes/foto-lateral.png']
where id = ID_DEL_REGALO;
```

Los formularios mantienen sus cinco campos originales: no se añadió un sistema de subida de archivos. Los regalos sin fotos muestran un mensaje sencillo. Las rutas deben apuntar a imágenes públicas del proyecto.

## persona cuatro: verificación

Se comprueba que las imágenes respondan por HTTP, que las cuatro vistas de Snoopy carguen y que los datos originales de los productos se conserven. También se revisa la galería en escritorio y celular, y el mensaje mostrado cuando falta una imagen.

## Instrucciones de edición empleadas

Modo: herramienta integrada imagegen, edición de fotografías descargadas. La imagen de Snoopy se utilizó solo como referencia del fondo y la iluminación.


### Chocolates

Use case: precise-object-edit. Asset: square catalog product photo. Image 1 is the edit target: downloaded Unsplash photograph by Monique Carrati of an open rectangular box of assorted chocolates. Image 2 is ONLY the background and lighting reference: a crochet Snoopy on a cream beige studio background. Keep the chocolate box, its compartments and the recognizable assortment of chocolates from image 1. Replace the colorful fabric background with the same warm ivory/cream beige seamless studio background, gentle tonal falloff and soft realistic shadow seen in image 2. Center the entire chocolate box with generous beige margins, approximately 70% frame coverage; preserve the overhead viewpoint and realistic food textures. Output one square image, no collage, no Snoopy, no labels, no added text, no watermark. Do not introduce new products.

### Taza

Use case: precise-object-edit. Asset: square catalog product photo. Image 1 is the edit target: downloaded Unsplash photograph by Mel Poole of two stacked white printed ceramic mugs. Image 2 is ONLY the background and lighting reference: a crochet Snoopy on a cream beige studio background. Isolate the TOP coffee mug from image 1 as a single product and remove the lower tea mug. Preserve the white ceramic shape and the exact original black lettering 'FILL ME UP WITH COFFEE', preserving the handle and reconstructing the small cropped handle edge naturally. Replace the white background with the same warm ivory/cream beige seamless studio surface, gentle tonal falloff and soft realistic shadow seen in image 2. Center the whole single mug, approximately 65% frame coverage, with generous beige margins. Output one square image, no collage, no Snoopy, no added objects, no extra text, no watermark.
