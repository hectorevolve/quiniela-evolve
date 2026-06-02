-- Premios configurables por tramos (posiciones sueltas y/o rangos).
-- Formato del JSON: [{ "from": 1, "to": 1, "reward": "$1,000" }, { "from": 4, "to": 10, "reward": "$100" }]
-- Mientras prize_tiers sea null/[], la app usa los 3 campos legacy (prize_1st/2nd/3rd).
-- Ejecutar una vez en: Supabase → SQL Editor.

alter table public.group_settings
  add column if not exists prize_tiers jsonb;
