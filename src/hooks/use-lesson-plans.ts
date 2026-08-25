import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useLessonPlans = (teacherId?: string) => {
  return useQuery({
    queryKey: ['lessonPlans', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data, error } = await supabase
        .from('lesson_plans')
        .select(`
          *,
          classes (id, name, tier),
          subjects (id, name, code)
        `)
        .eq('teacher_id', teacherId)
        .order('lesson_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId
  });
};

export const useLessonPlansByClass = (classId?: string) => {
  return useQuery({
    queryKey: ['lessonPlansByClass', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('lesson_plans')
        .select(`
          *,
          classes (id, name, tier),
          subjects (id, name, code),
          teachers (full_name)
        `)
        .eq('class_id', classId)
        .order('lesson_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!classId
  });
};

export const useLessonPlan = (id?: string) => {
  return useQuery({
    queryKey: ['lessonPlan', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('lesson_plans')
        .select(`
          *,
          classes (id, name, tier),
          subjects (id, name, code),
          teachers (full_name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useCreateLessonPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonPlan: {
      title: string;
      description?: string;
      class_id: string;
      subject_id: string;
      teacher_id: string;
      lesson_date: string;
      start_time?: string;
      end_time?: string;
      objectives?: string[];
      materials?: string[];
      activities?: string;
      homework?: string;
      notes?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('lesson_plans')
        .insert(lessonPlan)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonPlans'] });
      queryClient.invalidateQueries({ queryKey: ['lessonPlansByClass'] });
      toast.success('Lesson plan created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateLessonPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...lessonPlan }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('lesson_plans')
        .update(lessonPlan)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonPlans'] });
      queryClient.invalidateQueries({ queryKey: ['lessonPlansByClass'] });
      queryClient.invalidateQueries({ queryKey: ['lessonPlan'] });
      toast.success('Lesson plan updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteLessonPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonPlans'] });
      queryClient.invalidateQueries({ queryKey: ['lessonPlansByClass'] });
      toast.success('Lesson plan deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};
