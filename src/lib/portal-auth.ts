import { supabase } from '@/lib/supabaseClient';
import {
  clearCustomSession,
  getCustomSession,
  setCustomSession,
  type ParentSession,
  type TeacherSession,
} from '@/lib/auth-utils';

export type PortalRole = 'admin' | 'teacher' | 'accountant' | 'parent';

export type PortalIdentity = {
  authenticated?: boolean;
  role?: PortalRole | null;
  profile_id?: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  is_active?: boolean;
  must_change_password?: boolean;
  error?: string | null;
};

type PortalLoginResult = {
  role?: PortalRole;
  full_name?: string;
  email?: string;
  error?: string;
};

const INACTIVE_MESSAGE =
  'This account has been temporarily deactivated. Please contact the school administration.';

function friendlyAuthError(message?: string): string {
  const normalized = (message || '').toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials')
  ) {
    return 'Invalid email or password.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'This email account has not been confirmed.';
  }

  return message || 'Unable to sign in. Please try again.';
}

export async function getPortalIdentity(): Promise<PortalIdentity> {
  const { data, error } = await supabase.rpc('get_portal_identity');

  if (error) {
    throw new Error(error.message);
  }

  return (data || {}) as PortalIdentity;
}

async function bootstrapCompatibilitySession(
  expectedRole?: Exclude<PortalRole, 'admin'>
): Promise<PortalLoginResult> {
  const existing = getCustomSession();

  if (
    existing &&
    existing.role !== 'student' &&
    (!expectedRole || existing.role === expectedRole) &&
    existing.session_token
  ) {
    return {
      role: existing.role,
      full_name: existing.full_name,
      email: existing.email,
    };
  }

  const { data, error } = await supabase.rpc('bootstrap_portal_session');

  if (error) {
    return { error: error.message };
  }

  if (data?.error === 'inactive') {
    return { error: INACTIVE_MESSAGE };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  const role = data?.role as PortalRole | undefined;

  if (!role || !['teacher', 'accountant', 'parent'].includes(role)) {
    return { error: 'This account is not configured for this portal.' };
  }

  if (expectedRole && role !== expectedRole) {
    return { error: 'This account does not have access to this portal section.' };
  }

  if (!data?.id || !data?.session_token) {
    return { error: 'Unable to initialize your portal session.' };
  }

  if (role === 'parent') {
    const session: ParentSession = {
      role: 'parent',
      id: data.id,
      full_name: data.full_name || 'Parent',
      email: data.email || '',
      // Supabase Auth now owns the password. Do not send migrated users
      // through the legacy custom-password change flow.
      must_change_password: false,
      session_token: data.session_token,
    };

    setCustomSession(session);
  } else {
    const session: TeacherSession = {
      role,
      id: data.id,
      full_name: data.full_name || (role === 'accountant' ? 'Accountant' : 'Teacher'),
      email: data.email || '',
      must_change_password: false,
      session_token: data.session_token,
    };

    setCustomSession(session);
  }

  return {
    role,
    full_name: data.full_name || undefined,
    email: data.email || undefined,
  };
}

export async function loginPortalUser(
  email: string,
  password: string,
  allowedRoles: PortalRole[]
): Promise<PortalLoginResult> {
  // Remove a stale Student/legacy custom session before starting a
  // Supabase-authenticated login.
  clearCustomSession();

  // Ensure a previous Supabase user cannot bleed into the new login attempt.
  await supabase.auth.signOut();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (signInError) {
    return { error: friendlyAuthError(signInError.message) };
  }

  try {
    const identity = await getPortalIdentity();

    if (identity.error === 'inactive' || identity.is_active === false) {
      await supabase.auth.signOut();
      return { error: INACTIVE_MESSAGE };
    }

    if (identity.error || !identity.role) {
      await supabase.auth.signOut();
      return {
        error:
          identity.error === 'portal_profile_not_found'
            ? 'This login is valid, but no portal profile is linked to it.'
            : 'This account is not configured for portal access.',
      };
    }

    if (!allowedRoles.includes(identity.role)) {
      await supabase.auth.signOut();
      return { error: 'This account does not have access to this login section.' };
    }

    if (identity.role === 'admin') {
      return {
        role: 'admin',
        email: identity.email || email,
        full_name: identity.full_name || undefined,
      };
    }

    const compatibility = await bootstrapCompatibilitySession(identity.role);

    if (compatibility.error) {
      await supabase.auth.signOut();
      clearCustomSession();
      return compatibility;
    }

    return compatibility;
  } catch (error: any) {
    await supabase.auth.signOut();
    clearCustomSession();
    return { error: error?.message || 'Unable to initialize portal access.' };
  }
}

export async function restorePortalSession(
  expectedRole?: Exclude<PortalRole, 'admin'>
): Promise<PortalLoginResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'No authenticated session.' };
  }

  try {
    const identity = await getPortalIdentity();

    if (identity.error === 'inactive' || identity.is_active === false) {
      return { error: INACTIVE_MESSAGE };
    }

    if (identity.error || !identity.role) {
      return { error: 'Portal profile not found.' };
    }

    if (identity.role === 'admin') {
      if (expectedRole) {
        return { error: 'Role mismatch.' };
      }
      return { role: 'admin', email: session.user.email || undefined };
    }

    if (expectedRole && identity.role !== expectedRole) {
      return { error: 'Role mismatch.' };
    }

    return await bootstrapCompatibilitySession(identity.role);
  } catch (error: any) {
    return { error: error?.message || 'Unable to restore portal session.' };
  }
}

export async function prepareForStudentLogin(): Promise<void> {
  clearCustomSession();

  try {
    await supabase.auth.signOut();
  } catch {
    // Student custom authentication can still proceed even if there is no
    // Supabase session to clear.
  }
}
