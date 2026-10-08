-- Tareas generadas para cada plan de estudio. Solo el backend con service_role escribe.
BEGIN;

CREATE TABLE IF NOT EXISTS public.tareas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(uid) ON DELETE CASCADE,
  plan_estudio_id bigint NOT NULL REFERENCES public.planes_estudio(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  tarea_key text NOT NULL,
  semana integer NOT NULL CHECK (semana > 0),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  descripcion text NOT NULL CHECK (char_length(descripcion) BETWEEN 1 AND 2000),
  materia text NOT NULL CHECK (char_length(materia) BETWEEN 1 AND 200),
  prioridad text NOT NULL CHECK (prioridad IN ('alta', 'media', 'baja')),
  duracion_minutos integer NOT NULL CHECK (duracion_minutos BETWEEN 15 AND 180),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tareas_plan_tarea_key_unique UNIQUE (plan_estudio_id, tarea_key)
);

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumnos_ven_sus_tareas_estudio" ON public.tareas;
CREATE POLICY "alumnos_ven_sus_tareas_estudio"
  ON public.tareas
  FOR SELECT
  TO authenticated
  USING (
    alumno_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio AS p
      WHERE p.id = public.tareas.plan_estudio_id
        AND p.alumno_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.tareas FROM anon, authenticated;
GRANT SELECT ON TABLE public.tareas TO authenticated;
GRANT ALL ON TABLE public.tareas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.tareas_id_seq TO service_role;

COMMIT;
