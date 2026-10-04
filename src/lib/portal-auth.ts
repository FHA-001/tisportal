import { supabase } from '@/lib/supabaseClient';
import {
  clearCustomSession,
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
  must_change_password?: boolean;
  error?: string;
};

type PortalPasswordChangeResult = {
  success?: boolean;
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

export async function loginPortalUser(
  email: string,
  password: string,
  allowedRoles: PortalRole[],
): Promise<PortalLoginResult> {
  clearCustomSession();
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

    // Return identity directly for all migrated roles (admin, teacher, accountant, parent)
    // No compatibility custom session is created
    return {
      role: identity.role,
      email: identity.email || email,
      full_name: identity.full_name || undefined,
      must_change_password: identity.must_change_password || false,
    };
  } catch (error: any) {
    await supabase.auth.signOut();
    clearCustomSession();
    return { error: error?.message || 'Unable to initialize portal access.' };
  }
}

export async function restorePortalSession(
  expectedRole?: Exclude<PortalRole, 'admin'>,
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

    if (expectedRole && identity.role !== expectedRole) {
      return { error: 'Role mismatch.' };
    }

    // Return identity directly for all migrated roles
    // No compatibility custom session is created
    return {
      role: identity.role,
      email: identity.email || session.user.email || undefined,
      full_name: identity.full_name || undefined,
      must_change_password: identity.must_change_password || false,
    };
  } catch (error: any) {
    return { error: error?.message || 'Unable to restore portal session.' };
  }
}

export async function changePortalAuthPassword(
  currentPassword: string,
  newPassword: string,
): Promise<PortalPasswordChangeResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { error: 'unauthenticated' };
  }

  let identity: PortalIdentity;

  try {
    identity = await getPortalIdentity();
  } catch (error: any) {
    return { error: error?.message || 'Unable to verify portal account.' };
  }

  if (!identity.role || !['teacher', 'accountant', 'parent'].includes(identity.role)) {
    return { error: 'unsupported_role' };
  }

  const email = session.user.email || identity.email || '';

  if (!email) {
    return { error: 'missing_email' };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (reauthError) {
    const normalized = reauthError.message.toLowerCase();

    if (
      normalized.includes('invalid login credentials') ||
      normalized.includes('invalid credentials')
    ) {
      return { error: 'invalid_password' };
    }

    return { error: reauthError.message };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (passwordError) {
    return { error: passwordError.message };
  }

  // Clear must_change_password flag in the database
  const { data, error: completionError } = await supabase.rpc(
    'complete_portal_password_change',
  );

  if (completionError) {
    return { error: completionError.message };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  // No custom session update needed - flag is now in the database
  // Frontend will get updated must_change_password from getPortalIdentity() on next check

  return { success: true };
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
