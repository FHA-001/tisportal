import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useSchoolFees = () => {
  return useQuery({
    queryKey: ['schoolFees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_fees')
        .select('*')
        .order('class_name');
      if (error) throw error;
      return data;
    }
  });
};

export const useUpdateSchoolFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feeAmount }: { id: string; feeAmount: number }) => {
      const { data, error } = await supabase
        .from('school_fees')
        .update({ fee_amount: feeAmount, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolFees'] });
      toast.success('School fee updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const usePaymentAccounts = () => {
  return useQuery({
    queryKey: ['paymentAccounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    }
  });
};

export const useCreatePaymentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: { bankName: string; accountNumber: string; accountName: string }) => {
      const { data, error } = await supabase
        .from('payment_accounts')
        .insert({
          bank_name: account.bankName,
          account_number: account.accountNumber,
          account_name: account.accountName,
          sort_order: 0
        })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentAccounts'] });
      toast.success('Payment account added successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdatePaymentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bankName, accountNumber, accountName, sortOrder }: { 
      id: string; 
      bankName: string; 
      accountNumber: string; 
      accountName: string;
      sortOrder: number;
    }) => {
      const { data, error } = await supabase
        .from('payment_accounts')
        .update({ 
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          sort_order: sortOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentAccounts'] });
      toast.success('Payment account updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeletePaymentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentAccounts'] });
      toast.success('Payment account deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};
