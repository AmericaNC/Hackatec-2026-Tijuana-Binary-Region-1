-- Guarda un plan por alumno y periodo. La regeneracion actualiza ese mismo plan.
BEGIN;

CREATE TABLE IF NOT EXISTS public.planes_estudio (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(uid) ON DELETE CASCADE,
  periodo text NOT NULL,
  prompt text NOT NULL,
  plan jsonb NOT NULL,
  calificaciones jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT planes_estudio_alumno_periodo_unique UNIQUE (alumno_id, periodo)
);

ALTER TABLE public.planes_estudio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumnos_ven_sus_planes_estudio" ON public.planes_estudio;
CREATE POLICY "alumnos_ven_sus_planes_estudio"
  ON public.planes_estudio
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alumnos AS a
      WHERE a.uid = public.planes_estudio.alumno_id
        AND a.uid = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.planes_estudio FROM anon, authenticated;
GRANT SELECT ON TABLE public.planes_estudio TO authenticated;
GRANT ALL ON TABLE public.planes_estudio TO service_role;

COMMIT;
