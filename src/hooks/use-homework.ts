import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useHomework = (teacherId?: string) => {
  return useQuery({
    queryKey: ['homework', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          classes (name, tier),
          subjects (name),
          teachers (full_name)
        `)
        .eq('teacher_id', teacherId)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId
  });
};

export const useStudentHomework = (studentId?: string) => {
  return useQuery({
    queryKey: ['studentHomework', studentId],
    queryFn: async () => {
      // Use RPC function to bypass RLS and get student's class_id
      const { data: studentClass, error: studentError } = await supabase.rpc('get_student_class', {
        p_student_id: studentId
      });
      
      if (studentError) throw studentError;
      
      if (!studentClass || studentClass.length === 0) {
        return [];
      }
      
      const classId = studentClass[0].class_id;
      
      // Get homework for student's class
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          classes (name, tier),
          subjects (name),
          teachers (full_name)
        `)
        .eq('class_id', classId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });
};

export const useCreateHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (homework: {
      title: string;
      description: string;
      class_id: string;
      subject_id: string;
      teacher_id: string;
      due_date: string;
      attachment_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('homework')
        .insert(homework)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['studentHomework'] });
      toast.success('Homework created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...homework }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('homework')
        .update(homework)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['studentHomework'] });
      toast.success('Homework updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['studentHomework'] });
      toast.success('Homework deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const getHomeworkStatus = (dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'Overdue', color: 'destructive' };
  if (diffDays === 0) return { status: 'Due Today', color: 'warning' };
  return { status: 'Active', color: 'success' };
};
