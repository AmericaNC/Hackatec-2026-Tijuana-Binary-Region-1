-- Intentos y resultados de evaluaciones para acreditar tareas de estudio.
BEGIN;

ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS intentos_examen smallint NOT NULL DEFAULT 0
    CHECK (intentos_examen BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS ultimo_puntaje smallint
    CHECK (ultimo_puntaje BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS public.evaluaciones_tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id bigint NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(uid) ON DELETE CASCADE,
  intento smallint NOT NULL CHECK (intento BETWEEN 1 AND 2),
  respuestas_correctas jsonb NOT NULL CHECK (jsonb_array_length(respuestas_correctas) = 5),
  puntaje smallint CHECK (puntaje BETWEEN 0 AND 100),
  creado_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  enviado_at timestamptz,
  CONSTRAINT evaluaciones_tarea_intento_unique UNIQUE (tarea_id, intento)
);

ALTER TABLE public.evaluaciones_tareas
  ADD COLUMN IF NOT EXISTS preguntas jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (preguntas = '[]'::jsonb OR jsonb_array_length(preguntas) = 5);

ALTER TABLE public.evaluaciones_tareas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.evaluaciones_tareas FROM anon, authenticated;
GRANT ALL ON TABLE public.evaluaciones_tareas TO service_role;

COMMIT;