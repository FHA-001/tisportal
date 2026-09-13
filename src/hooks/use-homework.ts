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

function getRoleSessionToken(role: 'teacher' | 'student') {
  const session = getCustomSession();
  if (!session?.session_token || session.role !== role) return null;
  return session.session_token;
}

export const useHomework = (_teacherId?: string) => {
  const sessionToken = getRoleSessionToken('teacher');
  return useQuery({
    queryKey: ['homework', 'teacher'],
    queryFn: async () => {
      if (!sessionToken) return [];
      const { data, error } = await supabase.rpc('get_teacher_homework', {
        p_session_token: sessionToken,
      });
      if (error) throw error;
      return ((data || []) as HomeworkRpcRow[]).map(mapHomeworkRow);
    },
    enabled: !!sessionToken,
  });
};

export const useTeacherHomeworkAssignments = () => {
  const sessionToken = getRoleSessionToken('teacher');
  return useQuery({
    queryKey: ['homeworkAssignments', 'teacher'],
    queryFn: async () => {
      if (!sessionToken) return [];
      const { data, error } = await supabase.rpc('get_teacher_homework_assignments', {
        p_session_token: sessionToken,
      });
      if (error) throw error;
      return (data || []) as HomeworkAssignmentOption[];
    },
    enabled: !!sessionToken,
  });
};

export const useStudentHomework = (_studentId?: string) => {
  const sessionToken = getRoleSessionToken('student');
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
    mutationFn: async (homework: HomeworkPayload & { teacher_id?: string }) => {
      const sessionToken = getRoleSessionToken('teacher');
      if (!sessionToken) throw new Error('Unauthorized');
      const payload: HomeworkPayload = {
        title: homework.title,
        description: homework.description,
        class_id: homework.class_id,
        subject_id: homework.subject_id,
        due_date: homework.due_date,
        attachment_url: homework.attachment_url ?? null,
      };
      const { data, error } = await supabase.rpc('create_teacher_homework', {
        p_session_token: sessionToken,
        p_homework: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['studentHomework'] });
      toast.success('Homework created successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create homework'),
  });
};

export const useUpdateHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...homework }: { id: string } & HomeworkPayload) => {
      const sessionToken = getRoleSessionToken('teacher');
      if (!sessionToken) throw new Error('Unauthorized');
      const { data, error } = await supabase.rpc('update_teacher_homework', {
        p_session_token: sessionToken,
        p_homework_id: id,
        p_homework: homework,
      });
      if (error) throw error;
      if (data !== true) throw new Error('Homework update was not confirmed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['studentHomework'] });
      toast.success('Homework updated successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update homework'),
  });
};

export const useDeleteHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const sessionToken = getRoleSessionToken('teacher');
      if (!sessionToken) throw new Error('Unauthorized');
      const { data, error } = await supabase.rpc('delete_teacher_homework', {
        p_session_token: sessionToken,
        p_homework_id: id,
      });
      if (error) throw error;
      if (data !== true) throw new Error('Homework delete was not confirmed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['studentHomework'] });
      toast.success('Homework deleted successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete homework'),
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
