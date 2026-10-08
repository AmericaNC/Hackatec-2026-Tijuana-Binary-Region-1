-- Permite distinguir planes profesionales y asociarlos con su vacante.
-- Conserva la unicidad académica existente por alumno y periodo.
BEGIN;

ALTER TABLE public.planes_estudio
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'academico',
  ADD COLUMN IF NOT EXISTS empleo_id uuid REFERENCES public.empleos(id) ON DELETE SET NULL;

ALTER TABLE public.planes_estudio
  DROP CONSTRAINT IF EXISTS planes_estudio_origen_check;

ALTER TABLE public.planes_estudio
  ADD CONSTRAINT planes_estudio_origen_check
  CHECK (origen IN ('academico', 'laboral'));

CREATE UNIQUE INDEX IF NOT EXISTS planes_estudio_alumno_empleo_unique
  ON public.planes_estudio (alumno_id, empleo_id)
  WHERE origen = 'laboral' AND empleo_id IS NOT NULL;

COMMIT;
