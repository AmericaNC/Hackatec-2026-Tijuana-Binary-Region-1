-- Migracion aditiva para proyectos donde migracion_materia.sql ya fue aplicada.
-- No actualiza ni elimina filas. Si hay un problema, la transaccion completa se revierte.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.materias') IS NULL
     OR to_regclass('public.calificaciones') IS NULL
     OR to_regclass('public.carreras') IS NULL
     OR to_regclass('public.perfiles') IS NULL
     OR to_regclass('public.alumnos') IS NULL THEN
    RAISE EXCEPTION
      'Falta una tabla requerida. Ejecuta primero la migracion inicial de materias y calificaciones.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.calificaciones
    WHERE periodo IS NOT NULL
    GROUP BY alumno_id, materia_id, periodo
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Hay calificaciones duplicadas para alumno, materia y periodo. No se modifico el esquema.';
  END IF;
END
$$;

-- Mantiene los periodos NULL antiguos sin modificarlos. La aplicacion exige periodo
-- para todas las calificaciones nuevas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.calificaciones'::regclass
      AND conname = 'calificaciones_alumno_materia_periodo_unique'
  ) THEN
    ALTER TABLE public.calificaciones
      ADD CONSTRAINT calificaciones_alumno_materia_periodo_unique
      UNIQUE (alumno_id, materia_id, periodo);
  END IF;
END
$$;

-- Esta restriccion anterior impide guardar mas de un periodo por materia.
-- Se reemplaza sin borrar ni modificar las calificaciones existentes.
ALTER TABLE public.calificaciones
  DROP CONSTRAINT IF EXISTS calificaciones_alumno_materia_unique;

-- Los usuarios autenticados solo pueden consultar/modificar materias de su carrera.
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumnos_ven_materias_de_su_carrera" ON public.materias;
CREATE POLICY "alumnos_ven_materias_de_su_carrera"
  ON public.materias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.carreras AS c
      JOIN public.perfiles AS p ON p.carrera = c.nombre
      WHERE c.id = public.materias.carrera_id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumnos_registran_materias_de_su_carrera" ON public.materias;
CREATE POLICY "alumnos_registran_materias_de_su_carrera"
  ON public.materias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.carreras AS c
      JOIN public.perfiles AS p ON p.carrera = c.nombre
      WHERE c.id = public.materias.carrera_id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumnos_actualizan_materias_de_su_carrera" ON public.materias;
CREATE POLICY "alumnos_actualizan_materias_de_su_carrera"
  ON public.materias
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.carreras AS c
      JOIN public.perfiles AS p ON p.carrera = c.nombre
      WHERE c.id = public.materias.carrera_id
        AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.carreras AS c
      JOIN public.perfiles AS p ON p.carrera = c.nombre
      WHERE c.id = public.materias.carrera_id
        AND p.id = auth.uid()
    )
  );

-- El UID del alumno se vincula al UID autenticado al completar el registro.
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumnos_ven_sus_calificaciones" ON public.calificaciones;
CREATE POLICY "alumnos_ven_sus_calificaciones"
  ON public.calificaciones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alumnos AS a
      WHERE a.uid = public.calificaciones.alumno_id
        AND a.uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumnos_registran_sus_calificaciones" ON public.calificaciones;
CREATE POLICY "alumnos_registran_sus_calificaciones"
  ON public.calificaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alumnos AS a
      WHERE a.uid = public.calificaciones.alumno_id
        AND a.uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumnos_actualizan_sus_calificaciones" ON public.calificaciones;
CREATE POLICY "alumnos_actualizan_sus_calificaciones"
  ON public.calificaciones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alumnos AS a
      WHERE a.uid = public.calificaciones.alumno_id
        AND a.uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alumnos AS a
      WHERE a.uid = public.calificaciones.alumno_id
        AND a.uid = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.materias TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.calificaciones TO authenticated;

COMMIT;
