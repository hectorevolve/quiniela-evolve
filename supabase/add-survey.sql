-- ============================================================
-- Encuesta de Clima Laboral · Torneo 2026
-- Ejecutar UNA VEZ en Supabase → SQL Editor
-- ============================================================

-- 1. Columnas en profiles para el gate de la quiniela
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS survey_completed     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS survey_completed_at  TIMESTAMPTZ  NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_survey_completed ON public.profiles(survey_completed);

-- 2. Tabla de respuestas ANONIMAS (sin FK a users)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id                BIGSERIAL     PRIMARY KEY,
  submission_token  UUID          NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  survey_id         VARCHAR(64)   NOT NULL,
  survey_version    VARCHAR(16)   NOT NULL,
  started_at        TIMESTAMPTZ   NOT NULL,
  completed_at      TIMESTAMPTZ   NOT NULL,
  duration_seconds  INTEGER       NOT NULL,
  answers           JSONB         NOT NULL,
  client_user_agent TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_completed_at ON public.survey_responses(completed_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id    ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_answers      ON public.survey_responses USING GIN (answers);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
