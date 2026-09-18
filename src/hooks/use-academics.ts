import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { getCustomSession } from '@/lib/auth-utils';

// --- CLASSES ---
export const useClasses = () => {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, students(count)').order('name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });
};

// Public class selection for signup (no count aggregation for anon compatibility)
export const usePublicClasses = () => {
  return useQuery({
    queryKey: ['publicClasses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, tier, level, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('classes').insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: res, error } = await supabase.from('classes').update(data).eq('id', id).select().single();
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- SUBJECTS ---
export const useSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('subjects').insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: res, error } = await supabase.from('subjects').update(data).eq('id', id).select().single();
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- CLASS SUBJECTS ---
export const useClassSubjects = (classId?: string, teacherId?: string) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['class_subjects', classId, teacherId, session?.role, session?.id],
    queryFn: async () => {
      // Teacher custom-auth path:
      // class_subjects remains readable to custom-auth users, but the
      // protected teachers table must not be joined here. Query the real
      // assignment rows directly so grading receives the true class_subject id.
      if (session?.role === 'teacher') {
        if (!session.id) {
          throw new Error('Teacher session is missing an id. Please log in again.');
        }

        let query = supabase
          .from('class_subjects')
          .select(`
            *,
            classes (name, tier, level),
            subjects (name, code)
          `)
          .eq('teacher_id', session.id);

        if (classId) query = query.eq('class_id', classId);

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
      }

      // Student custom-auth path: teacher PII is not required here.
      if (session?.role === 'student') {
        let query = supabase.from('class_subjects').select(`
          *,
          classes (name, tier, level),
          subjects (name, code)
        `);

        if (classId) query = query.eq('class_id', classId);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }

      // Trusted Admin path retains the teacher name relationship.
      let query = supabase.from('class_subjects').select(`
        *,
        classes (name, tier, level),
        subjects (name, code),
        teachers (full_name)
      `);

      if (classId) query = query.eq('class_id', classId);
      if (teacherId) query = query.eq('teacher_id', teacherId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
};

export const useAssignClassSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('class_subjects').insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects'] });
      toast.success('Subject assigned successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useRemoveClassSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects'] });
      toast.success('Assignment removed successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- ACADEMIC SESSIONS ---
export const useAcademicSessions = () => {
  return useQuery({
    queryKey: ['academic_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.is_active) {
        await supabase.from('academic_sessions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const { data, error } = await supabase.from('academic_sessions').insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_sessions'] });
      toast.success('Session created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (data.is_active) {
        await supabase.from('academic_sessions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const { data: res, error } = await supabase.from('academic_sessions').update(data).eq('id', id).select().single();
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_sessions'] });
      toast.success('Session updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};
