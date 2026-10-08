BEGIN;

CREATE TABLE IF NOT EXISTS public.skills (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(uid) ON DELETE CASCADE,
  skill_key text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  materia_clave text,
  progreso_pct smallint NOT NULL DEFAULT 0 CHECK (progreso_pct BETWEEN 0 AND 100),
  origen text NOT NULL CHECK (origen IN ('curricular', 'personal')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT skills_alumno_skill_key_unique UNIQUE (alumno_id, skill_key)
);

CREATE INDEX IF NOT EXISTS skills_alumno_id_idx ON public.skills(alumno_id);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumnos_ven_sus_skills" ON public.skills;
DROP POLICY IF EXISTS "alumnos_registran_sus_skills" ON public.skills;
DROP POLICY IF EXISTS "alumnos_actualizan_sus_skills" ON public.skills;
DROP POLICY IF EXISTS "alumnos_eliminan_sus_skills" ON public.skills;

CREATE POLICY "alumnos_ven_sus_skills"
  ON public.skills FOR SELECT TO authenticated
  USING (alumno_id = auth.uid());

CREATE POLICY "alumnos_registran_sus_skills"
  ON public.skills FOR INSERT TO authenticated
  WITH CHECK (
    alumno_id = auth.uid()
    AND origen = 'personal'
    AND EXISTS (SELECT 1 FROM public.alumnos WHERE alumnos.uid = auth.uid())
  );

CREATE POLICY "alumnos_actualizan_sus_skills"
  ON public.skills FOR UPDATE TO authenticated
  USING (alumno_id = auth.uid() AND origen = 'personal')
  WITH CHECK (alumno_id = auth.uid() AND origen = 'personal');

CREATE POLICY "alumnos_eliminan_sus_skills"
  ON public.skills FOR DELETE TO authenticated
  USING (alumno_id = auth.uid() AND origen = 'personal');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.skills_id_seq TO authenticated;

COMMIT;