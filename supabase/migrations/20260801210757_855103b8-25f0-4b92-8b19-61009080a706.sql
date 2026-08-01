ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id
  ON public.assessment_sessions (created_by_user_id, status, updated_at DESC);

CREATE POLICY "Users can manage their own assessment sessions"
  ON public.assessment_sessions
  FOR ALL TO authenticated
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can read responses for their own sessions"
  ON public.assessment_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = session_id AND s.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can write responses for their own sessions"
  ON public.assessment_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = session_id AND s.created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = session_id AND s.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read stage runs for their own sessions"
  ON public.assessment_stage_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = session_id AND s.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can write stage runs for their own sessions"
  ON public.assessment_stage_runs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = session_id AND s.created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = session_id AND s.created_by_user_id = auth.uid()
    )
  );

GRANT ALL ON public.assessment_sessions TO service_role;
GRANT ALL ON public.assessment_responses TO service_role;
GRANT ALL ON public.assessment_stage_runs TO service_role;