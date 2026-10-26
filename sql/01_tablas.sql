-- persona dos: estructura original y relaciones entre categorías, ocasiones y regalos.
-- Ejecuta este archivo en el SQL Editor de un proyecto nuevo de Supabase.
-- Todo se guarda junto: si algo falla, no queda una creación a medias.
begin;

create table public.categorias (
  id bigint generated always as identity primary key,
  nombre text not null unique check (length(trim(nombre)) > 0)
);

create table public.ocasiones (
  id bigint generated always as identity primary key,
  nombre text not null unique check (length(trim(nombre)) > 0)
);

create table public.regalos (
  id bigint generated always as identity primary key,
  nombre text not null unique check (length(trim(nombre)) > 0),
  descripcion text not null default '',
  precio numeric(10, 2) not null check (precio > 0),
  imagenes text[] not null default '{}',
  categoria_id bigint not null references public.categorias(id),
  ocasion_id bigint not null references public.ocasiones(id)
);

-- Los roles públicos de la Data API solo pueden leer.
-- Express usa su conexión PostgreSQL para insertar productos desde el backend.
alter table public.categorias enable row level security;
alter table public.ocasiones enable row level security;
alter table public.regalos enable row level security;

revoke all on table public.categorias, public.ocasiones, public.regalos from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.categorias, public.ocasiones, public.regalos to anon, authenticated;

create policy "Leer categorias" on public.categorias
  for select to anon, authenticated using (true);

create policy "Leer ocasiones" on public.ocasiones
  for select to anon, authenticated using (true);

create policy "Leer regalos" on public.regalos
  for select to anon, authenticated using (true);

commit;
