import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useAttendance = (filters?: { student_id?: string; class_id?: string; date?: string; start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          students (full_name, admission_number),
          classes (name, tier),
          teachers (full_name)
        `)
        .order('date', { ascending: false });
      
      if (filters?.student_id) query = query.eq('student_id', filters.student_id);
      if (filters?.class_id) query = query.eq('class_id', filters.class_id);
      if (filters?.date) query = query.eq('date', filters.date);
      if (filters?.start_date) query = query.gte('date', filters.start_date);
      if (filters?.end_date) query = query.lte('date', filters.end_date);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
};

export const useAttendanceByClass = (classId?: string, date?: string) => {
  return useQuery({
    queryKey: ['attendanceByClass', classId, date],
    queryFn: async () => {
      if (!classId) return [];
      
      let query = supabase
        .from('attendance')
        .select(`
          *,
          students (id, full_name, admission_number)
        `)
        .eq('class_id', classId);
      
      if (date) {
        query = query.eq('date', date);
      } else {
        // Get today's attendance if no date specified
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('date', today);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!classId
  });
};

export const useAttendanceByStudent = (studentId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['attendanceByStudent', studentId, startDate, endDate],
    queryFn: async () => {
      if (!studentId) return [];
      
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });
};

export const useAttendanceSummary = (filters?: { class_id?: string; start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['attendanceSummary', filters],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('status');
      
      if (filters?.class_id) query = query.eq('class_id', filters.class_id);
      if (filters?.start_date) query = query.gte('date', filters.start_date);
      if (filters?.end_date) query = query.lte('date', filters.end_date);
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calculate summary
      const summary = {
        total: data.length,
        present: data.filter((a: any) => a.status === 'present').length,
        absent: data.filter((a: any) => a.status === 'absent').length,
        late: data.filter((a: any) => a.status === 'late').length,
        excused: data.filter((a: any) => a.status === 'excused').length,
      };
      
      return summary;
    }
  });
};

export const useCreateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attendance: {
      student_id: string;
      class_id: string;
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendance)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByClass'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByStudent'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      toast.success('Attendance recorded successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...attendance }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('attendance')
        .update(attendance)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByClass'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByStudent'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      toast.success('Attendance updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByClass'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByStudent'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      toast.success('Attendance deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useBulkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attendanceRecords: Array<{
      student_id: string;
      class_id: string;
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      notes?: string;
    }>) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, { onConflict: 'student_id,date' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByClass'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceByStudent'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      toast.success('Attendance recorded successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};
