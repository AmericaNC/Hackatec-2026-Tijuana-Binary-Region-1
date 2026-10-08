-- Expone solo la informacion de empresa necesaria para mostrar ofertas.
-- La razon social/RFC permanece accesible unicamente mediante la tabla empresas
-- y sus politicas existentes.
BEGIN;

CREATE OR REPLACE VIEW public.empresas_publicas
WITH (security_barrier = true)
AS
SELECT id, nombre, direccion, created_at
FROM public.empresas;

REVOKE ALL ON TABLE public.empresas_publicas FROM anon, authenticated;
GRANT SELECT ON TABLE public.empresas_publicas TO authenticated;

COMMIT;
