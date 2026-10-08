CREATE TABLE IF NOT EXISTS public.empleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre_empleo TEXT NOT NULL,
  puesto_trabajo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prestaciones TEXT NOT NULL,
  areas_oportunidad TEXT NOT NULL,
  carreras_dirigidas TEXT[] NOT NULL CHECK (cardinality(carreras_dirigidas) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.empleos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver empleos" ON public.empleos;
DROP POLICY IF EXISTS "Empresas pueden publicar sus empleos" ON public.empleos;
DROP POLICY IF EXISTS "Empresas pueden actualizar sus empleos" ON public.empleos;
DROP POLICY IF EXISTS "Empresas pueden eliminar sus empleos" ON public.empleos;

CREATE POLICY "Usuarios autenticados pueden ver empleos"
  ON public.empleos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Empresas pueden publicar sus empleos"
  ON public.empleos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = empresa_id
    AND EXISTS (SELECT 1 FROM public.empresas WHERE empresas.id = auth.uid())
  );

CREATE POLICY "Empresas pueden actualizar sus empleos"
  ON public.empleos FOR UPDATE
  TO authenticated
  USING (auth.uid() = empresa_id)
  WITH CHECK (
    auth.uid() = empresa_id
    AND EXISTS (SELECT 1 FROM public.empresas WHERE empresas.id = auth.uid())
  );

CREATE POLICY "Empresas pueden eliminar sus empleos"
  ON public.empleos FOR DELETE
  TO authenticated
  USING (
    auth.uid() = empresa_id
    AND EXISTS (SELECT 1 FROM public.empresas WHERE empresas.id = auth.uid())
  );