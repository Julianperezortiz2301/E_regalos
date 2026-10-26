-- persona dos: añade fotografías a una base existente sin cambiar precios ni descripciones.
-- Se puede repetir: solo asigna fotos a los regalos que aún no tienen ninguna.
begin;

alter table public.regalos
  add column if not exists imagenes text[] not null default '{}';

update public.regalos
set imagenes = array['/imagenes/chocolates.png']
where lower(trim(nombre)) = 'caja de chocolates' and cardinality(imagenes) = 0;

update public.regalos
set imagenes = array['/imagenes/taza.png']
where lower(trim(nombre)) = 'taza con mensaje' and cardinality(imagenes) = 0;

update public.regalos
set imagenes = array[
  '/imagenes/snoopy-frente.png',
  '/imagenes/snoopy-tres-cuartos.png',
  '/imagenes/snoopy-espalda.png',
  '/imagenes/snoopy-perfil.png'
]
where lower(trim(nombre)) in ('snoopy', 'snoopy de crochet') and cardinality(imagenes) = 0;

commit;
