import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export type PortalAccountRole = 'teacher' | 'accountant' | 'parent';
export type PortalAccountAction = 'deactivate' | 'reactivate' | 'delete';

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
        deactivate_before_delete:
          'Deactivate this account before permanently deleting it.',
        account_has_dependencies:
          'This account cannot be permanently deleted because important school records are still linked to it.',
        dependency_check_failed:
          'The system could not safely verify whether this account has linked records.',
        profile_delete_failed:
          'The portal profile could not be permanently deleted.',
        auth_cleanup_required:
          'The portal profile was deleted, but the authentication account still requires administrator cleanup.',
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
              : action === 'reactivate'
                ? 'Failed to reactivate account'
                : 'Failed to permanently delete account',
          ),
        );
      }

      if (!data?.success) {
        if (data?.error === 'account_has_dependencies' && data?.dependencies) {
          const labels: Record<string, string> = {
            class_subjects: 'class/subject assignments',
            classes: 'assigned classes',
            homework: 'homework records',
            payment_reviews: 'payment review records',
            student_links: 'student associations',
            payment_submissions: 'payment submissions',
          };

          const dependencyText = Object.entries(data.dependencies)
            .map(([key, count]) => `${labels[key] || key}: ${count}`)
            .join(', ');

          throw new Error(
            `This account cannot be permanently deleted because linked records still exist (${dependencyText}). Deactivate it instead to preserve school history.`,
          );
        }

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
              : action === 'reactivate'
                ? 'Failed to reactivate account'
                : 'Failed to permanently delete account'),
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
      } else if (variables.action === 'reactivate') {
        toast.success(`${target} reactivated successfully`);
      } else {
        toast.success(`${target} permanently deleted`);
      }
    },

    onError: (err: any) => {
      toast.error(err.message);
    },
  });
};
