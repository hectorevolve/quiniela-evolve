-- Habilita el poder "Puntos Dobles" (×2) en el cálculo del ranking.
-- Guarda en qué partido cada usuario activó el ×2.
-- Ejecutar una vez en: Supabase → SQL Editor.

alter table public.profiles
  add column if not exists double_match_id text;
