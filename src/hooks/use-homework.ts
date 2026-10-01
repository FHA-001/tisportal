import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { getCustomSession } from '@/lib/auth-utils';
import { toast } from 'sonner';

type HomeworkPayload = {
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  due_date: string;
  attachment_url?: string | null;
};

type HomeworkRpcRow = {
  id: string;
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  published_at: string | null;
  due_date: string;
  attachment_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  class_name: string | null;
  class_tier: string | null;
  subject_name: string | null;
  teacher_name: string | null;
};

export type HomeworkAssignmentOption = {
  class_id: string;
  class_name: string;
  class_tier: string | null;
  subject_id: string;
  subject_name: string;
};

function mapHomeworkRow(row: HomeworkRpcRow) {
  return {
    ...row,
    classes: row.class_name ? { name: row.class_name, tier: row.class_tier } : null,
    subjects: row.subject_name ? { name: row.subject_name } : null,
    teachers: row.teacher_name ? { full_name: row.teacher_name } : null,
  };
}

function getStudentSessionToken() {
  const session = getCustomSession();
  if (!session?.session_token || session.role !== 'student') return null;
  return session.session_token;
}

export const useHomework = (_teacherId?: string) => {
  return useQuery({
    queryKey: ['homework', 'teacher'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_homework');

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        class_id: row.class_id,
        subject_id: row.subject_id,
        teacher_id: row.teacher_id,
        published_at: row.published_at,
        due_date: row.due_date,
        attachment_url: row.attachment_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        classes: {
          name: row.class_name,
          tier: row.class_tier,
        },
        subjects: {
          name: row.subject_name,
        },
      }));
    },
  });
};

export const useTeacherHomeworkAssignments = () => {
  return useQuery({
    queryKey: ['homeworkAssignments', 'teacher'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_class_subjects');

      if (error) throw error;

      return (data || []).map((row: any) => ({
        class_id: row.class_id,
        class_name: row.class_name ?? row.classes?.name ?? '',
        class_tier: row.class_tier ?? row.classes?.tier ?? null,
        subject_id: row.subject_id,
        subject_name: row.subject_name ?? row.subjects?.name ?? '',
      })) as HomeworkAssignmentOption[];
    },
  });
};

export const useStudentHomework = (_studentId?: string) => {
  const sessionToken = getStudentSessionToken();

  return useQuery({
    queryKey: ['studentHomework'],
    queryFn: async () => {
      if (!sessionToken) return [];

      const { data, error } = await supabase.rpc('get_student_homework', {
        p_session_token: sessionToken,
      });

      if (error) throw error;

      return ((data || []) as HomeworkRpcRow[]).map(mapHomeworkRow);
    },
    enabled: !!sessionToken,
  });
};

export const useCreateHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (homework: HomeworkPayload) => {
      const { data, error } = await supabase.rpc('create_teacher_homework', {
        p_homework: homework,
      });

      if (error) throw error;

      if (data?.success !== true) {
        throw new Error(data?.error || 'Failed to create homework');
      }

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework created successfully');
    },

    onError: (err: any) => {
      toast.error(err.message || 'Failed to create homework');
    },
  });
};

export const useUpdateHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...homework
    }: HomeworkPayload & {
      id: string;
    }) => {
      const { data, error } = await supabase.rpc('update_teacher_homework', {
        p_homework_id: id,
        p_homework: homework,
      });

      if (error) throw error;

      if (data?.success !== true) {
        throw new Error(data?.error || 'Failed to update homework');
      }

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework updated successfully');
    },

    onError: (err: any) => {
      toast.error(err.message || 'Failed to update homework');
    },
  });
};

export const useDeleteHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('delete_teacher_homework', {
        p_homework_id: id,
      });

      if (error) throw error;

      if (data?.success !== true) {
        throw new Error(data?.error || 'Failed to delete homework');
      }

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework deleted successfully');
    },

    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete homework');
    },
  });
};

export const getHomeworkStatus = (dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { status: 'Overdue', color: 'destructive' };
  if (diffDays === 0) return { status: 'Due Today', color: 'warning' };

  return { status: 'Active', color: 'success' };
};
