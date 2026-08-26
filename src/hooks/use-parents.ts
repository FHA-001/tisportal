import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { hashPassword } from '@/lib/auth-utils';
import { getCustomSession } from '@/lib/auth-utils';

export interface PaymentHistoryItem {
  id: string;
  type: 'submission' | 'payment';
  student_id: string;
  student_name: string;
  student_admission_number: string;
  parent_id: string;
  parent_name: string;
  parent_email: string;
  academic_session_id: string;
  academic_session_name: string;
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
  receipt_number: string | null;
  fee_payment_id: string | null;
}

export const useParents = () => {
  return useQuery({
    queryKey: ['parents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });
};

export const useParentChildren = (parentId?: string) => {
  return useQuery({
    queryKey: ['parentChildren', parentId],
    queryFn: async () => {
      // Use RPC function to bypass RLS and get children with student data
      const { data, error } = await supabase.rpc('get_parent_children', {
        p_parent_id: parentId
      });
      
      if (error) {
        console.error('Error fetching parent children via RPC:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Transform the RPC data to match the expected structure
      const transformedData = data.map((item: any) => ({
        id: item.id,
        parent_id: item.parent_id,
        student_id: item.student_id,
        relationship: item.relationship,
        is_primary: item.is_primary,
        students: {
          id: item.student_id,
          full_name: item.student_name,
          admission_number: item.student_admission_number,
          username: item.student_username,
          class_id: item.student_class_id,
          tier: item.student_tier,
          classes: {
            name: item.student_class_name
          }
        }
      }));
      
      return transformedData;
    },
    enabled: !!parentId
  });
};

export const useStudentParents = (studentId?: string) => {
  return useQuery({
    queryKey: ['studentParents', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_students')
        .select(`
          *,
          parents (
            id,
            full_name,
            email,
            phone_number,
            is_active
          )
        `)
        .eq('student_id', studentId);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });
};

export const useCreateParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (parent: {
      full_name: string;
      email: string;
      password: string;
      phone_number?: string;
      address?: string;
    }) => {
      const passwordHash = await hashPassword(parent.password);
      const { data, error } = await supabase
        .from('parents')
        .insert({
          full_name: parent.full_name,
          email: parent.email,
          password_hash: passwordHash,
          phone_number: parent.phone_number,
          address: parent.address,
          must_change_password: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast.success('Parent created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...parent }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('parents')
        .update(parent)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast.success('Parent updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast.success('Parent deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useAssignStudentToParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: {
      parent_id: string;
      student_id: string;
      relationship: string;
      is_primary?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('parent_students')
        .insert(assignment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentChildren'] });
      queryClient.invalidateQueries({ queryKey: ['studentParents'] });
      toast.success('Student assigned to parent successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useRemoveStudentFromParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('parent_students')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentChildren'] });
      queryClient.invalidateQueries({ queryKey: ['studentParents'] });
      toast.success('Student removed from parent successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useFeePayments = (studentId?: string) => {
  return useQuery({
    queryKey: ['feePayments', studentId],
    queryFn: async () => {
      let query = supabase
        .from('fee_payments')
        .select(`
          *,
          students (full_name, admission_number)
        `)
        .order('date_paid', { ascending: false });
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true
  });
};

export const useStudentFeeSummary = (studentId?: string, termId?: string, className?: string) => {
  return useQuery({
    queryKey: ['studentFeeSummary', studentId, termId, className],
    queryFn: async () => {
      if (!studentId || !termId) return null;
      
      // Normalize class name by removing spaces for matching
      const normalizedClassName = className?.replace(/\s+/g, '');
      
      // Get fee amount from school_fees based on class name and academic session
      let schoolFee = null;
      let feeError = null;
      
      // First try with academic session
      const { data: feeWithSession, error: errorWithSession } = await supabase
        .from('school_fees')
        .select('fee_amount')
        .eq('class_name', normalizedClassName)
        .eq('academic_session_id', termId)
        .maybeSingle();
      
      if (feeWithSession) {
        schoolFee = feeWithSession;
      } else {
        // Fallback: try without academic session filter
        const { data: feeWithoutSession, error: errorWithoutSession } = await supabase
          .from('school_fees')
          .select('fee_amount')
          .eq('class_name', normalizedClassName)
          .maybeSingle();
        
        schoolFee = feeWithoutSession;
        feeError = errorWithoutSession;
      }
      
      if (feeError && feeError.code !== 'PGRST116') throw feeError;
      
      // Get total payments for the term
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('amount')
        .eq('student_id', studentId)
        .eq('term_id', termId);
      
      if (paymentsError) throw paymentsError;
      
      const totalFees = schoolFee?.fee_amount || 0;
      const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const outstanding = totalFees - totalPaid;
      
      return {
        total_fees: totalFees,
        total_paid: totalPaid,
        outstanding: outstanding
      };
    },
    enabled: !!studentId && !!termId && !!className
  });
};

export const useCreateFeePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      student_id: string;
      term_id: string;
      amount: number;
      reference_note?: string;
      payment_method?: string;
    }) => {
      const { data, error } = await supabase
        .from('fee_payments')
        .insert(payment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feePayments'] });
      queryClient.invalidateQueries({ queryKey: ['studentFeeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFeePayments'] });
      toast.success('Fee payment recorded successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteFeePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feePayments'] });
      queryClient.invalidateQueries({ queryKey: ['studentFeeSummary'] });
      toast.success('Fee payment deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useSchoolAccountDetails = () => {
  return useQuery({
    queryKey: ['schoolAccountDetails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_account_details')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });
};

export const useUpdateSchoolAccountDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (details: {
      bank_name: string;
      account_number: string;
      account_name: string;
    }) => {
      const { data, error } = await supabase
        .from('school_account_details')
        .upsert(details)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolAccountDetails'] });
      toast.success('School account details updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- PAYMENT SUBMISSIONS ---
export const usePaymentSubmissions = (parentId?: string) => {
  return useQuery({
    queryKey: ['paymentSubmissions', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase.rpc('get_parent_payment_submissions', {
        p_parent_id: parentId
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
        students: {
          full_name: item.student_name,
          admission_number: item.student_admission_number
        },
        academic_sessions: {
          name: item.academic_session_name
        }
      }));
      
      return transformedData;
    },
    enabled: !!parentId
  });
};

export const useCreatePaymentSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submission: {
      student_id: string;
      academic_session_id: string;
      amount: number;
      payment_date: string;
      payment_method: string;
      payment_reference?: string;
      bank_name?: string;
      file?: File;
    }) => {
      const session = getCustomSession();

      if (!session || session.role !== 'parent' || !session.session_token) {
        throw new Error('Session expired or invalid. Please log in again.');
      }

      const { file, ...submissionData } = submission;
      let proofUrl: string | null = null;
      let uploadedFilePath: string | null = null;

      try {
        // Step 1: Upload file if provided
        if (file) {
          // Validate file type
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF files are allowed.');
          }

          // Validate file size (10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB in bytes
          if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit.');
          }

          // Generate unique filename: studentId_timestamp_uuid.extension
          const fileExt = file.name.split('.').pop();
          const fileName = `${submissionData.student_id}_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${session.id}/${fileName}`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          uploadedFilePath = filePath;
          proofUrl = uploadData.path;
        }

        // Step 2: Insert payment submission record using secure RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_payment_submission', {
          p_student_id: submissionData.student_id,
          p_academic_session_id: submissionData.academic_session_id,
          p_amount: submissionData.amount,
          p_payment_date: submissionData.payment_date,
          p_payment_method: submissionData.payment_method,
          p_payment_reference: submissionData.payment_reference || null,
          p_bank_name: submissionData.bank_name || null,
          p_proof_url: proofUrl || null,
          p_session_token: session.session_token
        });

        if (rpcError) {
          // If insert fails, delete the uploaded file to prevent orphaned files
          if (uploadedFilePath) {
            await supabase.storage.from('payment-proofs').remove([uploadedFilePath]);
          }
          throw new Error(`Failed to create submission: ${rpcError.message}`);
        }

        if (!rpcData?.success) {
          // If insert fails, delete the uploaded file to prevent orphaned files
          if (uploadedFilePath) {
            await supabase.storage.from('payment-proofs').remove([uploadedFilePath]);
          }

          if (rpcData?.error === 'invalid_session') {
            throw new Error('Session expired or invalid. Please log in again.');
          }

          if (rpcData?.error === 'unauthorized_student') {
            throw new Error('You are not authorized to submit a payment for this student.');
          }

          throw new Error(rpcData?.error || 'Failed to create submission');
        }

        return rpcData;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentSubmissions'] });
      toast.success('Payment submission created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useParentPaymentHistory = (parentId?: string, statusFilter?: string, sessionFilter?: string, studentFilter?: string) => {
  return useQuery({
    queryKey: ['parentPaymentHistory', parentId, statusFilter, sessionFilter, studentFilter],
    queryFn: async () => {
      if (!parentId) return [];

      // Fetch payment submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          students!inner(full_name, admission_number),
          parents!inner(full_name, email),
          academic_sessions!inner(name)
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Transform submissions to payment history items
      const submissionItems: PaymentHistoryItem[] = (submissions || []).map((item: any) => ({
        id: item.id,
        type: 'submission' as const,
        student_id: item.student_id,
        student_name: item.students.full_name,
        student_admission_number: item.students.admission_number,
        parent_id: item.parent_id,
        parent_name: item.parents.full_name,
        parent_email: item.parents.email,
        academic_session_id: item.academic_session_id,
        academic_session_name: item.academic_sessions.name,
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
        receipt_number: null,
        fee_payment_id: null
      }));

      // Fetch fee payments for this parent's children
      const { data: children } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', parentId);

      const studentIds = children?.map((c: any) => c.student_id) || [];

      const { data: feePayments, error: feePaymentsError } = await supabase
        .from('fee_payments')
        .select(`
          *,
          students!inner(full_name, admission_number),
          academic_sessions!inner(name),
          payment_submissions!inner(
            parent_id,
            parents!inner(full_name, email),
            proof_url
          )
        `)
        .in('student_id', studentIds)
        .order('date_paid', { ascending: false });

      if (feePaymentsError) throw feePaymentsError;

      // Transform fee payments to payment history items
      const paymentItems: PaymentHistoryItem[] = (feePayments || [])
        .filter((fp: any) => fp.payment_submissions?.parent_id === parentId)
        .map((item: any) => ({
          id: item.id,
          type: 'payment' as const,
          student_id: item.student_id,
          student_name: item.students.full_name,
          student_admission_number: item.students.admission_number,
          parent_id: item.payment_submissions.parent_id,
          parent_name: item.payment_submissions.parents.full_name,
          parent_email: item.payment_submissions.parents.email,
          academic_session_id: item.term_id,
          academic_session_name: item.academic_sessions.name,
          amount: item.amount,
          payment_date: item.date_paid,
          payment_reference: item.reference_note,
          payment_method: item.payment_method,
          bank_name: null,
          proof_url: item.payment_submissions.proof_url,
          status: 'approved',
          accountant_remarks: null,
          reviewed_by: item.recorded_by,
          reviewed_at: item.date_paid,
          created_at: item.created_at,
          updated_at: item.updated_at,
          receipt_number: item.receipt_number,
          fee_payment_id: item.id
        }));

      // Combine and sort by date
      const combined = [...submissionItems, ...paymentItems].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply filters
      let filtered = combined;

      if (statusFilter) {
        filtered = filtered.filter(item => item.status === statusFilter);
      }

      if (sessionFilter) {
        filtered = filtered.filter(item => item.academic_session_id === sessionFilter);
      }

      if (studentFilter) {
        filtered = filtered.filter(item => item.student_id === studentFilter);
      }

      return filtered;
    }
  });
};
