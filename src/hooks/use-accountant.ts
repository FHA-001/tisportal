import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { getCustomSession } from '@/lib/auth-utils';

export interface PaymentSubmission {
  id: string;
  student_id: string;
  parent_id: string;
  academic_session_id: string;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
  payment_method: string;
  bank_name: string | null;
  proof_url: string | null;
  status: string;
  accountant_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_admission_number: string;
  parent_name: string;
  parent_email: string;
  academic_session_name: string;
}

export const useAllPaymentSubmissions = (search?: string, statusFilter?: string, sessionFilter?: string, methodFilter?: string) => {
  return useQuery({
    queryKey: ['allPaymentSubmissions', search, statusFilter, sessionFilter, methodFilter],
    queryFn: async () => {
      const session = getCustomSession();

      if (!session || session.role !== 'accountant' || !session.session_token) {
        throw new Error('Invalid or expired accountant session');
      }

      const { data, error } = await supabase.rpc('get_all_payment_submissions', {
        p_session_token: session.session_token
      });

      if (error) {
        console.error('Error fetching payment submissions via RPC:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform the RPC data to match the expected structure
      const transformedData = data.map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        parent_id: item.parent_id,
        academic_session_id: item.academic_session_id,
        amount: item.amount,
        payment_date: item.payment_date,
        payment_reference: item.payment_reference,
        payment_method: item.payment_method,
        bank_name: item.bank_name,
        proof_url: item.proof_url,
        status: item.status,
        accountant_remarks: item.accountant_remarks,
        reviewed_by: item.reviewed_by,
        reviewed_at: item.reviewed_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        student_name: item.student_name,
        student_admission_number: item.student_admission_number,
        parent_name: item.parent_name,
        parent_email: item.parent_email,
        academic_session_name: item.academic_session_name
      }));

      // Apply filters
      let filtered = transformedData;

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((item: PaymentSubmission) =>
          item.student_name.toLowerCase().includes(searchLower) ||
          item.student_admission_number.toLowerCase().includes(searchLower) ||
          item.parent_name.toLowerCase().includes(searchLower)
        );
      }

      if (statusFilter) {
        filtered = filtered.filter((item: PaymentSubmission) => item.status === statusFilter);
      }

      if (sessionFilter) {
        filtered = filtered.filter((item: PaymentSubmission) => item.academic_session_id === sessionFilter);
      }

      if (methodFilter) {
        filtered = filtered.filter((item: PaymentSubmission) => item.payment_method === methodFilter);
      }

      return filtered;
    }
  });
};

export const useGenerateSignedUrl = () => {
  return useQuery({
    queryKey: ['signedUrl'],
    queryFn: async () => null,
    enabled: false
  });
};

export const generateSignedUrl = async (filePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry
  
  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
};

export const useApproveSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, remarks }: { submissionId: string; remarks: string }) => {
      const session = getCustomSession();

      if (!session || session.role !== 'accountant' || !session.session_token) {
        throw new Error('Session expired or invalid. Please log in again.');
      }

      const { data, error } = await supabase.rpc('approve_payment_submission', {
        p_submission_id: submissionId,
        p_remarks: remarks,
        p_session_token: session.session_token
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        if (data?.error === 'invalid_session') {
          throw new Error('Session expired or invalid. Please log in again.');
        }
        throw new Error(data?.error || 'Failed to approve submission');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPaymentSubmissions'] });
      toast.success('Payment submission approved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
};

export const useRejectSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, remarks }: { submissionId: string; remarks: string }) => {
      const session = getCustomSession();

      if (!session || session.role !== 'accountant' || !session.session_token) {
        throw new Error('Session expired or invalid. Please log in again.');
      }

      const { data, error } = await supabase.rpc('reject_payment_submission', {
        p_submission_id: submissionId,
        p_remarks: remarks,
        p_session_token: session.session_token
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        if (data?.error === 'invalid_session') {
          throw new Error('Session expired or invalid. Please log in again.');
        }
        throw new Error(data?.error || 'Failed to reject submission');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPaymentSubmissions'] });
      toast.success('Payment submission rejected successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
};
