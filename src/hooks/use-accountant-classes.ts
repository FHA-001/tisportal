import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { getCustomSession } from '@/lib/auth-utils';

export interface AccountantClassFeeSummary {
  class_id: string;
  class_name: string;
  class_tier: string | null;
  class_level: number | null;
  fee_amount: number;
  active_student_count: number;
  academic_session_id: string | null;
  academic_session_name: string | null;
  current_term: string | null;
}

export type AccountantFeeStatus =
  | 'paid'
  | 'partially_paid'
  | 'unpaid'
  | 'not_configured';

export interface AccountantStudentFeeOverview {
  student_id: string;
  full_name: string;
  admission_number: string | null;
  student_status: string | null;
  is_active: boolean | null;
  class_id: string;
  class_name: string;
  configured_fee: number;
  amount_paid: number;
  balance: number;
  fee_status: AccountantFeeStatus;
  academic_session_id: string;
  academic_session_name: string;
  current_term: string | null;
}

function getAccountantSessionToken() {
  const session = getCustomSession();

  if (!session || session.role !== 'accountant' || !session.session_token) {
    throw new Error('Session expired or invalid. Please log in again.');
  }

  return session.session_token;
}

export const useAccountantClassesFeeSummary = () => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['accountantClassesFeeSummary', session?.id],
    queryFn: async () => {
      const token = getAccountantSessionToken();

      const { data, error } = await supabase.rpc(
        'get_accountant_classes_fee_summary',
        {
          p_session_token: token,
        }
      );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        fee_amount: Number(row.fee_amount ?? 0),
        active_student_count: Number(row.active_student_count ?? 0),
      })) as AccountantClassFeeSummary[];
    },
    enabled:
      !!session &&
      session.role === 'accountant' &&
      !!session.session_token,
  });
};

export const useAccountantClassFeeOverview = (classId?: string) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['accountantClassFeeOverview', classId, session?.id],
    queryFn: async () => {
      if (!classId) return [];

      const token = getAccountantSessionToken();

      const { data, error } = await supabase.rpc(
        'get_accountant_class_fee_overview',
        {
          p_session_token: token,
          p_class_id: classId,
        }
      );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        configured_fee: Number(row.configured_fee ?? 0),
        amount_paid: Number(row.amount_paid ?? 0),
        balance: Number(row.balance ?? 0),
      })) as AccountantStudentFeeOverview[];
    },
    enabled:
      !!classId &&
      !!session &&
      session.role === 'accountant' &&
      !!session.session_token,
  });
};
