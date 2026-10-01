import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface AccountantFeeConfiguration {
  class_id: string;
  class_name: string;
  class_tier: string | null;
  class_level: number | null;
  fee_id: string | null;
  fee_amount: number;
  fee_academic_session_id: string | null;
  academic_session_id: string | null;
  academic_session_name: string | null;
  current_term: string | null;
}

export const useAccountantFeeConfiguration = () => {
  return useQuery({
    queryKey: ['accountantFeeConfiguration'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_accountant_fee_configuration'
      );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        fee_amount: Number(row.fee_amount ?? 0),
      })) as AccountantFeeConfiguration[];
    },
  });
};

export const useUpdateAccountantSchoolFee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classId,
      feeAmount,
    }: {
      classId: string;
      feeAmount: number;
    }) => {
      const { data, error } = await supabase.rpc(
        'update_accountant_school_fee',
        {
          p_class_id: classId,
          p_fee_amount: feeAmount,
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update school fee');
      }

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['accountantFeeConfiguration'],
      });

      queryClient.invalidateQueries({
        queryKey: ['accountantClassesFeeSummary'],
      });

      queryClient.invalidateQueries({
        queryKey: ['accountantClassFeeOverview'],
      });

      toast.success('School fee updated successfully');
    },

    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update school fee');
    },
  });
};