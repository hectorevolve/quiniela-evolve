-- Corrige los nombres de grupo que se importaron en MAYÚSCULAS
-- Ejecutar en Supabase → SQL Editor
-- Afecta profiles Y allowed_phones

-- ── profiles ────────────────────────────────────────────────────
UPDATE public.profiles SET group_name = 'BEPENSA Spirits' WHERE group_name = 'BEPENSA';
UPDATE public.profiles SET group_name = 'Spin Master'     WHERE group_name = 'SPIN MASTER';
UPDATE public.profiles SET group_name = 'Hanes'           WHERE group_name = 'HANES';
UPDATE public.profiles SET group_name = 'Zuru'            WHERE group_name = 'ZURU';
UPDATE public.profiles SET group_name = 'Ruz'             WHERE group_name = 'RUZ';
-- Los de MULTIMARCA y Juguetimax se dejan sin grupo (puedes asignarlos después)
UPDATE public.profiles SET group_name = NULL WHERE group_name IN ('MULTIMARCA', 'Juguetimax');

-- ── allowed_phones (para que nuevos registros hereden el grupo correcto) ──────
UPDATE public.allowed_phones SET group_name = 'BEPENSA Spirits' WHERE group_name = 'BEPENSA';
UPDATE public.allowed_phones SET group_name = 'Spin Master'     WHERE group_name = 'SPIN MASTER';
UPDATE public.allowed_phones SET group_name = 'Hanes'           WHERE group_name = 'HANES';
UPDATE public.allowed_phones SET group_name = 'Zuru'            WHERE group_name = 'ZURU';
UPDATE public.allowed_phones SET group_name = 'Ruz'             WHERE group_name = 'RUZ';
UPDATE public.allowed_phones SET group_name = NULL WHERE group_name IN ('MULTIMARCA', 'Juguetimax');

-- ── Verificación (corre esto después para confirmar) ─────────────────────────
-- SELECT group_name, count(*) FROM public.profiles GROUP BY group_name ORDER BY count(*) DESC;
