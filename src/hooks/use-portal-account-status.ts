import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export type PortalAccountRole = 'teacher' | 'accountant' | 'parent';
export type PortalAccountAction = 'deactivate' | 'reactivate';

type ManagePortalAccountPayload = {
  action: PortalAccountAction;
  role: PortalAccountRole;
  profileId: string;
  displayName?: string;
};

async function getEdgeFunctionErrorMessage(
  error: any,
  fallback: string,
): Promise<string> {
  try {
    const response = error?.context;

    if (response && typeof response.clone === 'function') {
      const body = await response.clone().json();

      const friendlyErrors: Record<string, string> = {
        unauthenticated:
          'Your admin session has expired. Please log in again.',
        admin_required:
          'Only an administrator can manage portal account status.',
        profile_not_found:
          'The portal profile could not be found.',
        profile_not_linked_to_auth:
          'This profile is not linked to a Supabase Auth account.',
        auth_user_lookup_failed:
          'The linked authentication account could not be found.',
        role_mismatch:
          'The selected role does not match this portal account.',
        auth_deactivation_failed:
          'The authentication account could not be deactivated.',
        profile_deactivation_failed:
          'The portal profile could not be deactivated.',
        session_revocation_failed:
          'The account could not be safely deactivated because its active portal sessions could not be revoked.',
        profile_reactivation_failed:
          'The portal profile could not be reactivated.',
        auth_reactivation_failed:
          'The authentication account could not be reactivated.',
      };

      if (body?.error && friendlyErrors[body.error]) {
        return friendlyErrors[body.error];
      }

      if (typeof body?.detail === 'string' && body.detail.trim()) {
        return body.detail;
      }

      if (typeof body?.error === 'string' && body.error.trim()) {
        return body.error;
      }
    }
  } catch {
    // Fall through to the normal error message.
  }

  return error?.message || fallback;
}

export const useManagePortalAccountStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      role,
      profileId,
    }: ManagePortalAccountPayload) => {
      const { data, error } = await supabase.functions.invoke(
        'manage-portal-user-status',
        {
          body: {
            action,
            role,
            profile_id: profileId,
          },
        },
      );

      if (error) {
        throw new Error(
          await getEdgeFunctionErrorMessage(
            error,
            action === 'deactivate'
              ? 'Failed to deactivate account'
              : 'Failed to reactivate account',
          ),
        );
      }

      if (!data?.success) {
        const friendlyErrors: Record<string, string> = {
          unauthenticated:
            'Your admin session has expired. Please log in again.',
          admin_required:
            'Only an administrator can manage portal account status.',
          profile_not_found:
            'The portal profile could not be found.',
          profile_not_linked_to_auth:
            'This profile is not linked to a Supabase Auth account.',
          auth_user_lookup_failed:
            'The linked authentication account could not be found.',
          role_mismatch:
            'The selected role does not match this portal account.',
          auth_deactivation_failed:
            'The authentication account could not be deactivated.',
          profile_deactivation_failed:
            'The portal profile could not be deactivated.',
          session_revocation_failed:
            'The account could not be safely deactivated because its active portal sessions could not be revoked.',
          profile_reactivation_failed:
            'The portal profile could not be reactivated.',
          auth_reactivation_failed:
            'The authentication account could not be reactivated.',
        };

        throw new Error(
          friendlyErrors[data?.error] ||
            data?.detail ||
            data?.error ||
            (action === 'deactivate'
              ? 'Failed to deactivate account'
              : 'Failed to reactivate account'),
        );
      }

      return data;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });

      const target =
        variables.displayName?.trim() || 'Account';

      if (variables.action === 'deactivate') {
        toast.success(`${target} deactivated successfully`);
      } else {
        toast.success(`${target} reactivated successfully`);
      }
    },

    onError: (err: any) => {
      toast.error(err.message);
    },
  });
};
