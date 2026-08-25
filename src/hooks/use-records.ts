import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

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
