-- persona cuatro: comprobaciones de integridad con registros temporales.
-- Ejecutar después de 01_tablas.sql y 02_datos.sql, desde SQL Editor.
-- ROLLBACK deshace los datos de prueba. Los contadores de ID pueden avanzar.
begin;

do $$
declare
  categoria_prueba bigint;
  ocasion_prueba bigint;
  regalo_prueba bigint;
  nombre_prueba text := 'Prueba ' || gen_random_uuid()::text;
begin
  insert into public.categorias (nombre) values (nombre_prueba)
    returning id into categoria_prueba;
  insert into public.ocasiones (nombre) values (nombre_prueba)
    returning id into ocasion_prueba;

  -- Prueba 1: guardar un regalo y recuperar su categoría y ocasión.
  insert into public.regalos (nombre, precio, categoria_id, ocasion_id)
    values (nombre_prueba, 10000, categoria_prueba, ocasion_prueba)
    returning id into regalo_prueba;

  if not exists (
    select 1 from public.regalos r
    join public.categorias c on c.id = r.categoria_id
    join public.ocasiones o on o.id = r.ocasion_id
    where r.id = regalo_prueba and c.nombre = nombre_prueba and o.nombre = nombre_prueba
  ) then
    raise exception 'Falló la prueba de relaciones';
  end if;

  -- Prueba 2: un precio negativo debe ser rechazado por CHECK.
  begin
    insert into public.regalos (nombre, precio, categoria_id, ocasion_id)
      values (nombre_prueba || ' negativo', -1000, categoria_prueba, ocasion_prueba);
    raise exception 'Falló: se permitió un precio negativo';
  exception when check_violation then
    null; -- Este rechazo es el resultado esperado.
  end;

  -- Prueba 3: un ID que no existe debe ser rechazado por la clave foránea.
  begin
    insert into public.regalos (nombre, precio, categoria_id, ocasion_id)
      values (nombre_prueba || ' sin categoria', 10000, -1, ocasion_prueba);
    raise exception 'Falló: se permitió una categoría inexistente';
  exception when foreign_key_violation then
    null;
  end;
end $$;

-- Prueba 4: el rol público puede leer, pero no escribir en estas tablas.
do $$
declare
  tabla text;
begin
  foreach tabla in array array['categorias', 'ocasiones', 'regalos'] loop
    if not has_table_privilege('anon', 'public.' || tabla, 'SELECT')
      or has_table_privilege('anon', 'public.' || tabla, 'INSERT')
      or has_table_privilege('anon', 'public.' || tabla, 'UPDATE')
      or has_table_privilege('anon', 'public.' || tabla, 'DELETE') then
      raise exception 'Permisos incorrectos para %', tabla;
    end if;
  end loop;
end $$;

rollback;
select 'OK: relaciones, precio, clave foránea y permisos' as resultado;
