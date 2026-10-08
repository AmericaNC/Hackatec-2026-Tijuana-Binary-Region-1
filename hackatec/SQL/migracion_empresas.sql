CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  razon_social_rfc TEXT NOT NULL,
  direccion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Las empresas pueden ver su propio registro" ON public.empresas;
DROP POLICY IF EXISTS "Las empresas pueden crear su propio registro" ON public.empresas;
DROP POLICY IF EXISTS "Las empresas pueden actualizar su propio registro" ON public.empresas;

CREATE POLICY "Las empresas pueden ver su propio registro"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Las empresas pueden crear su propio registro"
  ON public.empresas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Las empresas pueden actualizar su propio registro"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);