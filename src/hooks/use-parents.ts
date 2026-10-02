import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabaseClient';

import { toast } from 'sonner';

import { usePortalIdentity } from '@/hooks/use-portal-identity';

async function getEdgeFunctionErrorMessage(
  error: any,
  fallback: string,
): Promise<string> {
  try {
    const response = error?.context;

    if (response && typeof response.clone === 'function') {
      const body = await response.clone().json();

      const friendlyErrors: Record<string, string> = {
        email_already_used_by_portal_profile:
          'That email is already used by another portal account.',
        email_already_exists_in_auth:
          'That email is already registered to another authentication account.',
        auth_profile_email_mismatch:
          'This account has an email synchronization mismatch. Please resolve it before changing the email.',
        profile_not_linked_to_auth:
          'This profile is not linked to a Supabase Auth account.',
        role_mismatch:
          'The portal role does not match the linked authentication account.',
        auth_email_duplicate_check_failed:
          'Unable to verify whether that email is already in use. Please try again.',
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
    // Fall through to the normal message below.
  }

  return error?.message || fallback;
}



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



export const useParentChildren = () => {

  return useQuery({

    queryKey: ['parentChildren'],

    queryFn: async () => {

      // Use Supabase Auth RPC function (no session token required)
      const { data, error } = await supabase.rpc('get_parent_children');



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

    }

  });

};



// Admin-only hook to view any parent's children (uses secure admin RPC)

export const useParentChildrenByAdmin = (parentId?: string) => {

  return useQuery({

    queryKey: ['parentChildrenByAdmin', parentId],

    queryFn: async () => {

      if (!parentId) return [];



      // Use secure admin RPC function with parent ID

      const { data, error } = await supabase.rpc('get_parent_children_by_admin', {

        p_parent_id: parentId

      });



      if (error) {

        console.error('Error fetching parent children via admin RPC:', error);

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

      const { data, error } = await supabase.functions.invoke(

        'provision-portal-user',

        {

          body: {

            role: 'parent',

            full_name: parent.full_name,

            email: parent.email,

            password: parent.password,

            phone_number: parent.phone_number || null,

            address: parent.address || null,

          },

        },

      );



      if (error) {

        throw new Error(error.message || 'Failed to create parent account');

      }



      if (!data?.success) {

        throw new Error(data?.error || 'Failed to create parent account');

      }



      return data.profile;

    },



    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['parents'] });

      toast.success('Parent account created successfully');

    },



    onError: (err: any) => {

      toast.error(err.message);

    },

  });

};



export const useUpdateParent = () => {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: async ({ id, ...parent }: { id: string } & any) => {

      // Merge with the current profile so the Edge Function receives all
      // required identity fields even if this mutation is ever called partially.
      const { data: existing, error: existingError } = await supabase
        .from('parents')
        .select('*')
        .eq('id', id)
        .single();

      if (existingError) throw existingError;
      if (!existing) throw new Error('Parent profile not found');

      const updateData = { ...existing, ...parent };

      delete updateData.password;
      delete updateData.password_hash;
      delete updateData.auth_user_id;
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.updated_at;

      const { data: result, error } = await supabase.functions.invoke(
        'update-portal-user',
        {
          body: {
            role: 'parent',
            profile_id: id,
            full_name: updateData.full_name,
            email: updateData.email,
            phone_number: updateData.phone_number ?? null,
            address: updateData.address ?? null,
            is_active:
              typeof updateData.is_active === 'boolean'
                ? updateData.is_active
                : true,
          },
        },
      );

      if (error) {
        throw new Error(
          await getEdgeFunctionErrorMessage(
            error,
            'Failed to update parent account',
          ),
        );
      }

      if (!result?.success) {
        const friendlyErrors: Record<string, string> = {
          email_already_used_by_portal_profile:
            'That email is already used by another portal account.',
          email_already_exists_in_auth:
            'That email is already registered in authentication.',
          auth_profile_email_mismatch:
            'This parent account has an email synchronization mismatch. Please resolve it before changing the email.',
          profile_not_linked_to_auth:
            'This parent profile is not linked to a Supabase Auth account.',
        };

        throw new Error(
          friendlyErrors[result?.error] ||
            result?.detail ||
            result?.error ||
            'Failed to update parent account',
        );
      }

      return result.profile;

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

      queryClient.invalidateQueries({ queryKey: ['parentChildrenByAdmin'] });

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

      queryClient.invalidateQueries({ queryKey: ['parentChildrenByAdmin'] });

      toast.success('Student removed from parent successfully');

    },

    onError: (err: any) => toast.error(err.message)

  });

};



export const useFeePayments = (studentId?: string) => {

  const { data: portalIdentity } = usePortalIdentity();

  const isParent = portalIdentity?.role === 'parent';



  return useQuery({

    queryKey: ['feePayments', studentId, isParent ? portalIdentity?.profile_id : null],

    queryFn: async () => {

      // Parent uses secure RPC (Supabase Auth - no session token)

      if (isParent) {

        const { data, error } = await supabase.rpc('get_parent_fee_payments');



        if (error) throw error;



        // Filter by student_id if provided (client-side filtering for UI convenience)

        if (studentId) {

          return data?.filter((fp: any) => fp.student_id === studentId) || [];

        }



        return data;

      }



      // Admin uses direct table access (to be secured in B5B/B5C)

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

  const { data: portalIdentity } = usePortalIdentity();

  const isParent = portalIdentity?.role === 'parent';



  return useQuery({

    queryKey: ['studentFeeSummary', studentId, termId, className, isParent ? portalIdentity?.profile_id : null],

    queryFn: async () => {

      if (!studentId || !termId || !className) return null;



      // Normalize both the student's class name and the value stored in school_fees.

      // This avoids mismatches such as "Primary 5" vs "Primary5" or case differences.

      const normalizeClassName = (value?: string | null) =>

        (value || '').replace(/\s+/g, '').toLowerCase();



      const normalizedClassName = normalizeClassName(className);



      // Prefer the active/current academic-session fee row. Fetch candidate rows and

      // compare normalized class names client-side instead of relying on an exact DB

      // string match.

      const { data: sessionFees, error: sessionFeesError } = await supabase

        .from('school_fees')

        .select('fee_amount, class_name, academic_session_id')

        .eq('academic_session_id', termId);



      if (sessionFeesError) throw sessionFeesError;



      let schoolFee = sessionFees?.find(

        (fee: any) => normalizeClassName(fee.class_name) === normalizedClassName

      );



      // Backward-compatible fallback for older fee rows that may not have the

      // academic session associated correctly.

      if (!schoolFee) {

        const { data: allFees, error: allFeesError } = await supabase

          .from('school_fees')

          .select('fee_amount, class_name, academic_session_id');



        if (allFeesError) throw allFeesError;



        schoolFee = allFees?.find(

          (fee: any) => normalizeClassName(fee.class_name) === normalizedClassName

        );

      }



      // Get total approved/recorded payments for the academic session.

      let totalPaid = 0;



      if (isParent) {

        // Parent uses tokenless RPC (Supabase Auth)

        const { data: feePayments, error: paymentsError } = await supabase.rpc(

          'get_parent_fee_payments'

        );



        if (paymentsError) throw paymentsError;



        totalPaid =

          feePayments

            ?.filter(

              (fp: any) => fp.student_id === studentId && fp.term_id === termId

            )

            .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) || 0;

      } else {

        const { data: payments, error: paymentsError } = await supabase

          .from('fee_payments')

          .select('amount')

          .eq('student_id', studentId)

          .eq('term_id', termId);



        if (paymentsError) throw paymentsError;



        totalPaid =

          payments?.reduce(

            (sum: number, payment: any) => sum + Number(payment.amount || 0),

            0

          ) || 0;

      }



      const totalFees = Number(schoolFee?.fee_amount || 0);

      const outstanding = Math.max(totalFees - totalPaid, 0);



      return {

        total_fees: totalFees,

        total_paid: totalPaid,

        outstanding,

      };

    },

    enabled: !!studentId && !!termId && !!className,

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

  const { data: portalIdentity } = usePortalIdentity();



  return useQuery({

    queryKey: ['schoolAccountDetails', portalIdentity?.role, portalIdentity?.profile_id],

    queryFn: async () => {

      // Parent uses secure RPC (Supabase Auth - no session token)

      if (portalIdentity?.role === 'parent') {

        const { data, error } = await supabase.rpc('get_parent_school_account_details');



        if (error) throw error;



        return data?.[0] ?? null;

      }



      // Admin remains on direct table access, protected by trusted-admin RLS.

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

export const usePaymentSubmissions = () => {

  return useQuery({

    queryKey: ['paymentSubmissions'],

    queryFn: async () => {

      // Use secure RPC function (Supabase Auth - no session token)

      const { data, error } = await supabase.rpc('get_parent_payment_submissions');



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

    }

  });

};



export const useCreatePaymentSubmission = () => {

  const queryClient = useQueryClient();

  const { data: portalIdentity } = usePortalIdentity();

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

      if (!portalIdentity || portalIdentity.role !== 'parent') {

        throw new Error('Unauthorized. Please log in as a parent.');

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

          const filePath = `${portalIdentity.profile_id}/${fileName}`;



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



        // Step 2: Insert payment submission record using secure RPC (Supabase Auth - no session token)

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_payment_submission', {

          p_student_id: submissionData.student_id,

          p_academic_session_id: submissionData.academic_session_id,

          p_amount: submissionData.amount,

          p_payment_date: submissionData.payment_date,

          p_payment_method: submissionData.payment_method,

          p_payment_reference: submissionData.payment_reference || null,

          p_bank_name: submissionData.bank_name || null,

          p_proof_url: proofUrl || null

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



          if (rpcData?.error === 'unauthorized') {

            throw new Error('Unauthorized. Please log in as a parent.');

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



export const useParentPaymentHistory = (statusFilter?: string, sessionFilter?: string, studentFilter?: string) => {

  return useQuery({

    queryKey: ['parentPaymentHistory', statusFilter, sessionFilter, studentFilter],

    queryFn: async () => {

      // Fetch payment submissions using secure RPC (Supabase Auth - no session token)

      const { data: submissions, error: submissionsError } = await supabase.rpc('get_parent_payment_submissions');



      if (submissionsError) throw submissionsError;



      // Transform submissions to payment history items

      const submissionItems: PaymentHistoryItem[] = (submissions || []).map((item: any) => ({

        id: item.id,

        type: 'submission' as const,

        student_id: item.student_id,

        student_name: item.student_name,

        student_admission_number: item.student_admission_number,

        parent_id: item.parent_id,

        parent_name: item.parent_name,

        parent_email: item.parent_email,

        academic_session_id: item.academic_session_id,

        academic_session_name: item.academic_session_name,

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



      // Fetch fee payments using secure RPC (Supabase Auth - no session token)

      const { data: feePayments, error: feePaymentsError } = await supabase.rpc('get_parent_fee_payments');



      if (feePaymentsError) throw feePaymentsError;



      // Transform fee payments to payment history items

      const paymentItems: PaymentHistoryItem[] = (feePayments || []).map((item: any) => ({

        id: item.id,

        type: 'payment' as const,

        student_id: item.student_id,

        student_name: item.student_name,

        student_admission_number: item.student_admission_number,

        parent_id: item.parent_id,

        parent_name: item.parent_name,

        parent_email: item.parent_email,

        academic_session_id: item.term_id,

        academic_session_name: item.academic_session_name,

        amount: item.amount,

        payment_date: item.date_paid,

        payment_reference: item.reference_note,

        payment_method: item.payment_method,

        bank_name: null,

        proof_url: item.proof_url,

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
