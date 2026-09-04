import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { getCustomSession } from '@/lib/auth-utils';

// --- STUDENTS ---
export const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes (name, tier)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
};

// --- GRADES ---
export const useGrades = (filters?: { class_subject_id?: string; term?: string; student_id?: string; session?: string }) => {
  return useQuery({
    queryKey: ['grades', filters],
    queryFn: async () => {
      let query = supabase.from('grades').select(`
        *,
        students (full_name, admission_number, tier, class_id, gender, date_of_birth, classes(name, tier)),
        class_subjects (
          subject_id,
          class_id,
          subjects(name, code),
          classes(name, tier)
        )
      `);
      
      if (filters?.class_subject_id) query = query.eq('class_subject_id', filters.class_subject_id);
      if (filters?.term) query = query.eq('term', filters.term);
      if (filters?.student_id) query = query.eq('student_id', filters.student_id);
      if (filters?.session) query = query.eq('session', filters.session);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
};

export const useSaveGrades = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any[]) => {
      // For batch updates
      const { data, error } = await supabase.from('grades').upsert(payload, { onConflict: 'id' }).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Grades saved successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- SECURE STUDENT GRADES ---
export const useStudentGrades = (filters?: { term?: string; session?: string }) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['student-grades', session?.id, filters],
    queryFn: async () => {
      if (!session?.session_token || session?.role !== 'student') {
        return [];
      }

      const { data, error } = await supabase.rpc('get_student_grades', {
        p_session_token: session.session_token,
        p_term: filters?.term || null,
        p_session: filters?.session || null
      });

      if (error) throw error;

      // Map flat RPC response back to nested Supabase relationship shape
      return (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        class_subject_id: row.class_subject_id,
        term: row.term,
        session: row.session,
        test_1: row.test_1,
        test_2: row.test_2,
        project_1: row.project_1,
        assignment_1: row.assignment_1,
        exam: row.exam,
        total: row.total,
        grade_letter: row.grade_letter,
        remark: row.remark,
        created_at: row.created_at,
        updated_at: row.updated_at,
        class_subjects: {
          subject_id: row.class_subject_subject_id,
          class_id: row.class_subject_class_id,
          subjects: {
            name: row.subject_name,
            code: row.subject_code
          },
          classes: row.class_subject_class_name ? {
            name: row.class_subject_class_name,
            tier: row.class_subject_class_tier
          } : null
        }
      }));
    },
    enabled: !!session?.session_token && session?.role === 'student'
  });
};

// --- SECURE PARENT CHILD GRADES ---
export const useParentChildGrades = (studentId?: string, filters?: { term?: string; session?: string }) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['parent-child-grades', session?.id, studentId, filters],
    queryFn: async () => {
      if (!session?.session_token || session?.role !== 'parent' || !studentId) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_parent_child_grades', {
        p_session_token: session.session_token,
        p_student_id: studentId,
        p_term: filters?.term || null,
        p_session: filters?.session || null
      });

      if (error) throw error;

      // Map flat RPC response back to nested Supabase relationship shape
      return (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        class_subject_id: row.class_subject_id,
        term: row.term,
        session: row.session,
        test_1: row.test_1,
        test_2: row.test_2,
        project_1: row.project_1,
        assignment_1: row.assignment_1,
        exam: row.exam,
        total: row.total,
        grade_letter: row.grade_letter,
        remark: row.remark,
        created_at: row.created_at,
        updated_at: row.updated_at,
        class_subjects: {
          subject_id: row.class_subject_subject_id,
          class_id: row.class_subject_class_id,
          subjects: {
            name: row.subject_name,
            code: row.subject_code
          },
          classes: row.class_subject_class_name ? {
            name: row.class_subject_class_name,
            tier: row.class_subject_class_tier
          } : null
        }
      }));
    },
    enabled: !!session?.session_token && session?.role === 'parent' && !!studentId
  });
};

// --- AUDIT LOGS ---
export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });
};

export const useLogAudit = () => {
  return useMutation({
    mutationFn: async (payload: { action: string; entity_type: string; entity_id?: string; performed_by: string; performer_role: string; details?: string }) => {
      const { error } = await supabase.from('audit_logs').insert([{
        ...payload,
        timestamp: new Date().toISOString()
      }]);
      if (error) console.error('Audit log failed', error);
    }
  });
};
