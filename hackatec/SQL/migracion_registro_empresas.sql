-- Crea el registro de empresa al crear una cuenta empresarial en Supabase Auth.
-- Esto permite que las politicas RLS de empleos reconozcan al propietario.
BEGIN;

CREATE OR REPLACE FUNCTION public.crear_registro_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  nombre_empresa text := btrim(COALESCE(metadata ->> 'empresa_nombre', ''));
  razon_social text := btrim(COALESCE(metadata ->> 'razon_social_rfc', ''));
  direccion_empresa text := btrim(COALESCE(metadata ->> 'direccion', ''));
BEGIN
  IF metadata ->> 'tipo_cuenta' IS DISTINCT FROM 'empresa' THEN
    RETURN NEW;
  END IF;

  IF nombre_empresa = '' OR razon_social = '' OR direccion_empresa = '' THEN
    RAISE EXCEPTION 'Completa nombre, razón social o RFC y dirección para crear la cuenta de empresa.';
  END IF;

  INSERT INTO public.empresas (id, nombre, razon_social_rfc, direccion)
  VALUES (NEW.id, nombre_empresa, razon_social, direccion_empresa)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crear_registro_empresa_al_registrar ON auth.users;
CREATE TRIGGER crear_registro_empresa_al_registrar
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_registro_empresa();

-- Repara cuentas registradas previamente que ya tengan sus datos de empresa
-- en los metadatos de Auth pero no tengan una fila en public.empresas.
INSERT INTO public.empresas (id, nombre, razon_social_rfc, direccion)
SELECT
  id,
  btrim(raw_user_meta_data ->> 'empresa_nombre'),
  btrim(raw_user_meta_data ->> 'razon_social_rfc'),
  btrim(raw_user_meta_data ->> 'direccion')
FROM auth.users
WHERE raw_user_meta_data ->> 'tipo_cuenta' = 'empresa'
  AND NULLIF(btrim(raw_user_meta_data ->> 'empresa_nombre'), '') IS NOT NULL
  AND NULLIF(btrim(raw_user_meta_data ->> 'razon_social_rfc'), '') IS NOT NULL
  AND NULLIF(btrim(raw_user_meta_data ->> 'direccion'), '') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;
