-- Persiste en qué partido se usó el poder "Cambio Tardío" (late).
-- Sin esto, al recargar la página el usuario pierde la capacidad de editar
-- su predicción de ese partido aunque el poder esté marcado como usado.
alter table public.profiles
  add column if not exists late_match_id text;
