-- Permite a cada alumno actualizar solo la fila que ya está vinculada a su UID.
-- La creación de filas continúa a cargo del trigger de registro institucional.
BEGIN;

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON TABLE public.alumnos TO authenticated;

DROP POLICY IF EXISTS "alumnos_actualizan_su_registro" ON public.alumnos;
CREATE POLICY "alumnos_actualizan_su_registro"
  ON public.alumnos
  FOR UPDATE
  TO authenticated
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

COMMIT;
