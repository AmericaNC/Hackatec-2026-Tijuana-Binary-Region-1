-- Crea los registros academicos automaticamente cuando se registra un estudiante.
-- Las empresas no generan filas en alumnos ni perfiles.
BEGIN;

CREATE OR REPLACE FUNCTION public.crear_registros_estudiante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  nombre_estudiante text := btrim(metadata ->> 'nombre');
  matricula_estudiante text := btrim(metadata ->> 'matricula');
  carrera_estudiante text := btrim(metadata ->> 'carrera');
  academia_estudiante text := btrim(metadata ->> 'academia');
BEGIN
  IF COALESCE(metadata ->> 'tipo_cuenta', 'estudiante') <> 'estudiante' THEN
    RETURN NEW;
  END IF;

  IF nombre_estudiante = '' OR matricula_estudiante = ''
    OR carrera_estudiante = '' OR academia_estudiante = '' THEN
    RAISE EXCEPTION 'Completa nombre, matrícula, carrera y academia para crear la cuenta de estudiante.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.carreras
    WHERE nombre = carrera_estudiante
      AND permiso_acceso IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'La carrera seleccionada no está habilitada para registro.';
  END IF;

  INSERT INTO public.alumnos (uid, nombre, carrera, matricula, academia, activo)
  VALUES (
    NEW.id,
    nombre_estudiante,
    carrera_estudiante,
    matricula_estudiante,
    academia_estudiante,
    true
  );

  INSERT INTO public.perfiles (id, nombre, carrera, matricula, verificado)
  VALUES (
    NEW.id,
    nombre_estudiante,
    carrera_estudiante,
    matricula_estudiante,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crear_registros_estudiante_al_registrar ON auth.users;
CREATE TRIGGER crear_registros_estudiante_al_registrar
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_registros_estudiante();

COMMIT;