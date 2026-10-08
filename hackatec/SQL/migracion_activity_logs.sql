BEGIN;

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name text NOT NULL,
  affected_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_name text NOT NULL,
  audience_careers text[] NOT NULL DEFAULT ARRAY[]::text[],
  event_type text NOT NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
  ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_actor_id_idx
  ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS activity_logs_affected_user_id_idx
  ON public.activity_logs(affected_user_id);
CREATE INDEX IF NOT EXISTS activity_logs_audience_careers_idx
  ON public.activity_logs USING gin(audience_careers);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_consultan_actividad_relacionada" ON public.activity_logs;
DROP POLICY IF EXISTS "usuarios_registran_su_actividad" ON public.activity_logs;

CREATE POLICY "usuarios_consultan_actividad_relacionada"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR affected_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.perfiles AS perfil
      WHERE perfil.id = auth.uid()
        AND perfil.carrera = ANY(public.activity_logs.audience_careers)
    )
  );

CREATE POLICY "usuarios_registran_su_actividad"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      (affected_user_id = auth.uid() AND cardinality(audience_careers) = 0)
      OR (
        affected_user_id IS NULL
        AND cardinality(audience_careers) > 0
        AND EXISTS (SELECT 1 FROM public.empresas WHERE empresas.id = auth.uid())
      )
    )
  );

REVOKE ALL ON TABLE public.activity_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.activity_logs TO authenticated;

COMMIT;