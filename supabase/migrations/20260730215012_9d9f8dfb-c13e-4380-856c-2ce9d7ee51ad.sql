
-- ============ enums ============
CREATE TYPE public.platform_role AS ENUM ('platform_admin','org_admin','assessment_manager','contributor','reviewer','read_only');
CREATE TYPE public.identity_user_status AS ENUM ('pending_verification','active','locked','suspended','disabled');
CREATE TYPE public.membership_status AS ENUM ('invited','active','removed');
CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked','expired');

-- ============ profiles ============
CREATE TABLE public.identity_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  status public.identity_user_status NOT NULL DEFAULT 'pending_verification',
  email_verified boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  profile_image text,
  preferred_language text NOT NULL DEFAULT 'en-GB',
  timezone text NOT NULL DEFAULT 'Europe/London',
  mfa_enabled boolean NOT NULL DEFAULT false,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.identity_profiles TO authenticated;
GRANT ALL ON public.identity_profiles TO service_role;
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;

-- ============ roles ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_role NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.platform_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ organisations ============
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organisation_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role public.platform_role NOT NULL DEFAULT 'contributor',
  status public.membership_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organisation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_memberships TO authenticated;
GRANT ALL ON public.organisation_memberships TO service_role;
ALTER TABLE public.organisation_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_memberships
    WHERE user_id = _user_id AND organisation_id = _org_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.platform_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_memberships
    WHERE user_id = _user_id AND organisation_id = _org_id AND status = 'active' AND role = _role
  )
$$;

CREATE TABLE public.organisation_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.platform_role NOT NULL DEFAULT 'contributor',
  status public.invitation_status NOT NULL DEFAULT 'pending',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  invited_by uuid,
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_invitations_email ON public.organisation_invitations (lower(email));
GRANT SELECT, INSERT, UPDATE ON public.organisation_invitations TO authenticated;
GRANT ALL ON public.organisation_invitations TO service_role;
ALTER TABLE public.organisation_invitations ENABLE ROW LEVEL SECURITY;

-- ============ sessions ============
CREATE TABLE public.identity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  device text NOT NULL DEFAULT 'Unknown device',
  browser text NOT NULL DEFAULT 'Unknown browser',
  ip_address text NOT NULL DEFAULT '',
  remember_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  UNIQUE (user_id, session_key)
);
CREATE INDEX idx_identity_sessions_user ON public.identity_sessions (user_id, revoked);
GRANT SELECT, INSERT, UPDATE ON public.identity_sessions TO authenticated;
GRANT ALL ON public.identity_sessions TO service_role;
ALTER TABLE public.identity_sessions ENABLE ROW LEVEL SECURITY;

-- ============ password history / login attempts ============
CREATE TABLE public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.password_history TO service_role;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text NOT NULL DEFAULT '',
  successful boolean NOT NULL DEFAULT false,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (lower(email), created_at DESC);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- ============ identity audit ============
CREATE TABLE public.identity_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL DEFAULT '',
  organisation_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  outcome text NOT NULL DEFAULT 'success',
  ip_address text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_identity_audit_user_time ON public.identity_audit_events (user_id, created_at DESC);
GRANT SELECT ON public.identity_audit_events TO authenticated;
GRANT ALL ON public.identity_audit_events TO service_role;
ALTER TABLE public.identity_audit_events ENABLE ROW LEVEL SECURITY;

-- ============ policies ============
CREATE POLICY "profiles_select_own" ON public.identity_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "profiles_update_own" ON public.identity_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "orgs_select_member" ON public.organisations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "memberships_select_own" ON public.organisation_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_role(auth.uid(), organisation_id, 'org_admin') OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "memberships_admin_write" ON public.organisation_memberships FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organisation_id, 'org_admin') OR public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organisation_id, 'org_admin') OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "memberships_admin_delete" ON public.organisation_memberships FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organisation_id, 'org_admin') OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "invitations_admin_select" ON public.organisation_invitations FOR SELECT TO authenticated
  USING (public.has_org_role(auth.uid(), organisation_id, 'org_admin') OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "sessions_select_own" ON public.identity_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "sessions_update_own" ON public.identity_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "identity_audit_select_own" ON public.identity_audit_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));

-- immutability of identity audit
CREATE TRIGGER identity_audit_no_update BEFORE UPDATE OR DELETE ON public.identity_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

-- ============ updated_at triggers ============
CREATE TRIGGER identity_profiles_updated BEFORE UPDATE ON public.identity_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER organisations_updated BEFORE UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER memberships_updated BEFORE UPDATE ON public.organisation_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invitations_updated BEFORE UPDATE ON public.organisation_invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ auto profile creation ============
CREATE OR REPLACE FUNCTION public.handle_new_identity_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.identity_profiles (id, email, first_name, last_name, display_name, status, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
             TRIM(COALESCE(NEW.raw_user_meta_data ->> 'first_name','') || ' ' || COALESCE(NEW.raw_user_meta_data ->> 'last_name','')),
             NEW.email),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active'::public.identity_user_status
         ELSE 'pending_verification'::public.identity_user_status END,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_identity
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_identity_user();

CREATE OR REPLACE FUNCTION public.handle_identity_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.identity_profiles
     SET email_verified = true,
         status = CASE WHEN status = 'pending_verification' THEN 'active'::public.identity_user_status ELSE status END
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed_identity
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_identity_email_confirmed();
