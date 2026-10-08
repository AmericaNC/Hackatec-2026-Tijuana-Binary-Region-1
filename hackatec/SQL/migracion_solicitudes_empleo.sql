-- Registra postulaciones sin modificar las tablas de alumnos ni empleos.
BEGIN;

CREATE TABLE IF NOT EXISTS public.solicitudes_empleo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleo_id uuid NOT NULL REFERENCES public.empleos(id) ON DELETE CASCADE,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(uid) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT solicitudes_empleo_unica UNIQUE (empleo_id, alumno_id)
);

ALTER TABLE public.solicitudes_empleo ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.solicitudes_empleo FROM anon, authenticated;
GRANT ALL ON TABLE public.solicitudes_empleo TO service_role;

COMMIT;
