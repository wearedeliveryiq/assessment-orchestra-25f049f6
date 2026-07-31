CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  theme text NOT NULL DEFAULT 'system',
  language text NOT NULL DEFAULT 'en-GB',
  timezone text NOT NULL DEFAULT 'Europe/London',
  date_format text NOT NULL DEFAULT 'dd MMM yyyy',
  number_format text NOT NULL DEFAULT 'en-GB',
  density text NOT NULL DEFAULT 'comfortable',
  reduced_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  sidebar_collapsed boolean NOT NULL DEFAULT false,
  favourite_modules text[] NOT NULL DEFAULT '{}',
  default_workspace_id uuid,
  landing_page text NOT NULL DEFAULT '/home',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own preferences"
  ON public.user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users dismiss their own notifications"
  ON public.platform_notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);