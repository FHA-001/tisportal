import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { getCustomSession } from '@/lib/auth-utils';

// --- CLASSES ---
export const useClasses = () => {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, students(count), class_teacher:teachers!classes_class_teacher_id_fkey(id, full_name, is_active)')
        .order('name', { ascending: true });

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
      const { data, error } = await supabase
        .from('classes')
        .insert([payload])
        .select()
        .single();

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
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: any;
    }) => {
      const { data: result, error } = await supabase
        .from('classes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
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
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

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
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('subjects')
        .insert([payload])
        .select()
        .single();

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
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: any;
    }) => {
      const { data: result, error } = await supabase
        .from('subjects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
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
      const { data, error } = await supabase.rpc(
        'delete_subject_if_unused',
        { p_subject_id: id }
      );

      if (error) throw error;

      if (!data?.deleted) {
        const error = new Error(data?.reason || 'Subject cannot be deleted');
        (error as any).dependencyInfo = data;
        throw error;
      }

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deleted successfully');
    },

    onError: (err: any) => {
      toast.error(err.message);
    }
  });
};

export const useDeactivateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deactivated successfully');
    },

    onError: (err: any) => toast.error(err.message)
  });
};

export const useReactivateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject reactivated successfully');
    },

    onError: (err: any) => toast.error(err.message)
  });
};

// --- CLASS SUBJECTS ---
export const useClassSubjects = (
  classId?: string,
  teacherId?: string
) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: [
      'class_subjects',
      classId,
      teacherId,
      session?.role,
      session?.id
    ],

    queryFn: async () => {
      // Legacy Teacher compatibility path.
      // A8 Teacher pages should now use useTeacherClassSubjects() instead.
      if (session?.role === 'teacher') {
        if (!session.id) {
          throw new Error(
            'Teacher session is missing an id. Please log in again.'
          );
        }

        let query = supabase
          .from('class_subjects')
          .select(`
            *,
            classes (name, tier, level),
            subjects (name, code)
          `)
          .eq('teacher_id', session.id);

        if (classId) {
          query = query.eq('class_id', classId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
      }

      // Student custom-auth path.
      if (session?.role === 'student') {
        let query = supabase
          .from('class_subjects')
          .select(`
            *,
            classes (name, tier, level),
            subjects (name, code)
          `);

        if (classId) {
          query = query.eq('class_id', classId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
      }

      // Trusted Admin path.
      let query = supabase
        .from('class_subjects')
        .select(`
          *,
          classes (name, tier, level),
          subjects (name, code),
          teachers (full_name)
        `);

      if (classId) {
        query = query.eq('class_id', classId);
      }

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    }
  });
};

// A8.2B: Auth-native Teacher assignment lookup.
// Teacher identity is derived server-side from auth.uid() via current_teacher_id().
export const useTeacherClassSubjects = () => {
  return useQuery({
    queryKey: ['teacher-class-subjects'],

    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_teacher_class_subjects'
      );

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        class_id: row.class_id,
        subject_id: row.subject_id,
        teacher_id: row.teacher_id,

        classes: {
          id: row.class_id,
          name: row.class_name,
          tier: row.class_tier,
          level: row.class_level
        },

        subjects: {
          id: row.subject_id,
          name: row.subject_name,
          code: row.subject_code
        }
      }));
    }
  });
};

export const useAssignClassSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      class_id: string;
      subject_id: string;
      teacher_id: string;
    }) => {
      const { data: existing, error: existingError } =
        await supabase
          .from('class_subjects')
          .select('id, teacher_id')
          .eq('class_id', payload.class_id)
          .eq('subject_id', payload.subject_id)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        if (existing.teacher_id === payload.teacher_id) {
          return existing;
        }

        const { data, error } = await supabase
          .from('class_subjects')
          .update({
            teacher_id: payload.teacher_id
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        return data;
      }

      const { data, error } = await supabase
        .from('class_subjects')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['class_subjects']
      });

      queryClient.invalidateQueries({
        queryKey: ['teacher-class-subjects']
      });

      queryClient.invalidateQueries({
        queryKey: ['teacherClasses']
      });

      toast.success('Subject assignment saved successfully');
    },

    onError: (err: any) => {
      toast.error(
        err.message || 'Failed to assign teacher to subject'
      );
    }
  });
};

export const useRemoveClassSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc(
        'admin_unassign_class_subject_teacher',
        {
          p_class_subject_id: id
        }
      );

      if (error) throw error;

      if (data?.success !== true) {
        throw new Error(
          data?.error || 'Failed to unassign teacher'
        );
      }

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['class_subjects']
      });

      queryClient.invalidateQueries({
        queryKey: ['teacher-class-subjects']
      });

      queryClient.invalidateQueries({
        queryKey: ['teacherClasses']
      });

      queryClient.invalidateQueries({
        queryKey: ['teacher-grades']
      });

      queryClient.invalidateQueries({
        queryKey: ['grades']
      });

      toast.success('Teacher unassigned successfully');
    },

    onError: (err: any) => {
      toast.error(
        err.message || 'Failed to unassign teacher'
      );
    }
  });
};

// --- ACADEMIC SESSIONS ---
export const useAcademicSessions = () => {
  return useQuery({
    queryKey: ['academic_sessions'],

    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .order('created_at', { ascending: false });

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
        await supabase
          .from('academic_sessions')
          .update({ is_active: false })
          .neq(
            'id',
            '00000000-0000-0000-0000-000000000000'
          );
      }

      const { data, error } = await supabase
        .from('academic_sessions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['academic_sessions']
      });

      toast.success('Session created successfully');
    },

    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: any;
    }) => {
      if (data.is_active) {
        await supabase
          .from('academic_sessions')
          .update({ is_active: false })
          .neq(
            'id',
            '00000000-0000-0000-0000-000000000000'
          );
      }

      const { data: result, error } = await supabase
        .from('academic_sessions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return result;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['academic_sessions']
      });

      toast.success('Session updated successfully');
    },

    onError: (err: any) => toast.error(err.message)
  });
};
