-- Añade una descripción pública editable desde el perfil de empresa.
BEGIN;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS descripcion text;

GRANT UPDATE (descripcion) ON TABLE public.empresas TO authenticated;

CREATE OR REPLACE VIEW public.empresas_publicas
WITH (security_barrier = true)
AS
SELECT id, nombre, direccion, created_at, descripcion
FROM public.empresas;

REVOKE ALL ON TABLE public.empresas_publicas FROM anon, authenticated;
GRANT SELECT ON TABLE public.empresas_publicas TO authenticated;

COMMIT;
