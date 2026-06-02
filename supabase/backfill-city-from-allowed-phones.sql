-- Rellena profiles.city con la ciudad del teléfono autorizado (allowed_phones).
-- Empareja por los ÚLTIMOS 10 DÍGITOS del teléfono (robusto a +52 y formato).
-- Solo toca perfiles SIN ciudad y solo cuando el whitelist sí tiene ciudad.
-- Idempotente y seguro: si no hay datos de ciudad, no cambia nada (0 filas).
-- Ejecutar en: Supabase → SQL Editor.

update public.profiles p
set city = ap.city
from public.allowed_phones ap
where right(regexp_replace(coalesce(p.phone, ''),  '\D', '', 'g'), 10)
    = right(regexp_replace(coalesce(ap.phone, ''), '\D', '', 'g'), 10)
  and coalesce(p.city, '')  = ''
  and coalesce(ap.city, '') <> '';

-- Para ver cuántos quedaron con ciudad después:
-- select count(*) filter (where city is not null) as con_ciudad,
--        count(*) as total
-- from public.profiles;
