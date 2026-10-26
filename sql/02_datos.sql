-- persona dos: ejemplos iniciales para consultar el catálogo y llenar los selectores.
-- Son datos inventados para comprobar las relaciones; los precios están en COP.
-- Puedes repetir este archivo sin duplicar los ejemplos.
begin;

insert into public.categorias (nombre)
values ('Dulces'), ('Detalles personalizados'), ('Peluches de crochet')
on conflict (nombre) do nothing;

insert into public.ocasiones (nombre)
values ('Aniversario'), ('Cumpleaños')
on conflict (nombre) do nothing;

-- persona dos: cada regalo puede guardar una lista de rutas de fotos locales.
insert into public.regalos (nombre, descripcion, precio, categoria_id, ocasion_id, imagenes)
values (
  'Caja de chocolates',
  'Una caja pequeña con chocolates y una nota.',
  35000,
  (select id from public.categorias where nombre = 'Dulces'),
  (select id from public.ocasiones where nombre = 'Aniversario'),
  array['/imagenes/chocolates.png']
), (
  'Taza con mensaje',
  'Una taza con una frase elegida para esa persona.',
  25000,
  (select id from public.categorias where nombre = 'Detalles personalizados'),
  (select id from public.ocasiones where nombre = 'Cumpleaños'),
  array['/imagenes/taza.png']
)
on conflict (nombre) do nothing;

commit;
