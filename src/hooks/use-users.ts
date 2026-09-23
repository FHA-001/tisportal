import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { hashPassword, getCustomSession } from '@/lib/auth-utils';
import { toast } from 'sonner';

export type StudentEnrollmentStatus = 'active' | 'inactive' | 'graduated' | 'withdrawn';

// --- STUDENTS ---
export const useStudents = (role: 'admin' | 'teacher' = 'admin', classId?: string) => {
  return useQuery({
    queryKey: ['students', role, classId],
    queryFn: async () => {
      if (role === 'admin') {
        let query = supabase.from('students').select('*, classes(name, tier)');
        if (classId) query = query.eq('class_id', classId);
        const { data, error } = await query.order('full_name', { ascending: true });
        if (error) throw error;
        return data;
      }

      const session = getCustomSession();
      if (!classId) throw new Error('Class ID is required for teacher student queries');
      if (!session || session.role !== 'teacher' || !session.session_token) {
        throw new Error('Session expired or invalid. Please log in again.');
      }

      const { data, error } = await supabase.rpc('get_students_by_teacher', {
        p_class_id: classId,
        p_session_token: session.session_token
      });

      if (error) throw error;
      return data;
    }
  });
};

export const useCreateStudentAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const p_hash = await hashPassword(payload.password);
      const { password, ...dataWithoutPassword } = payload;

      const { data, error } = await supabase
        .from('students')
        .insert([{
          ...dataWithoutPassword,
          status: dataWithoutPassword.status || 'approved',
          enrollment_status: dataWithoutPassword.enrollment_status || 'active',
          is_active: dataWithoutPassword.is_active ?? true,
          password_hash: p_hash,
          must_change_password: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateStudentAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = { ...data };
      if (updateData.password) {
        updateData.password_hash = await hashPassword(updateData.password);
        delete updateData.password;
      }

      const { data: res, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateStudentLifecycleAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      enrollmentStatus,
    }: {
      id: string;
      enrollmentStatus: StudentEnrollmentStatus;
    }) => {
      const { data, error } = await supabase
        .from('students')
        .update({
          enrollment_status: enrollmentStatus,
          is_active: enrollmentStatus === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['accountantClassesFeeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['accountantClassFeeOverview'] });

      const labels: Record<StudentEnrollmentStatus, string> = {
        active: 'Active',
        inactive: 'Inactive',
        graduated: 'Graduated',
        withdrawn: 'Withdrawn',
      };

      toast.success(`Student marked as ${labels[variables.enrollmentStatus]}`);
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteStudentAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const [gradesResult, paymentsResult, submissionsResult] = await Promise.all([
        supabase.from('grades').select('id', { count: 'exact', head: true }).eq('student_id', id),
        supabase.from('fee_payments').select('id', { count: 'exact', head: true }).eq('student_id', id),
        supabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('student_id', id),
      ]);

      const checkError = gradesResult.error || paymentsResult.error || submissionsResult.error;
      if (checkError) throw checkError;

      const gradesCount = gradesResult.count ?? 0;
      const paymentsCount = paymentsResult.count ?? 0;
      const submissionsCount = submissionsResult.count ?? 0;

      if (gradesCount > 0 || paymentsCount > 0 || submissionsCount > 0) {
        throw new Error(
          'This student has academic or payment history and cannot be permanently deleted. Use Inactive, Graduated, or Withdrawn instead.'
        );
      }

      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- TEACHERS ---
export const useTeachers = (role: 'admin' | 'student' = 'admin') => {
  return useQuery({
    queryKey: ['teachers', role],
    queryFn: async () => {
      if (role === 'admin') {
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .order('full_name', { ascending: true });

        if (error) throw error;
        return data;
      }

      const session = getCustomSession();
      if (!session || session.role !== 'student' || !session.session_token) {
        throw new Error('Session expired or invalid. Please log in again.');
      }

      const { data, error } = await supabase.rpc('get_student_teacher_directory', {
        p_session_token: session.session_token
      });

      if (error) throw error;
      return data || [];
    }
  });
};

export const useCreateTeacherAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const p_hash = await hashPassword(payload.password);
      const { password, ...dataWithoutPassword } = payload;
      const { data, error } = await supabase.from('teachers').insert([{
        ...dataWithoutPassword,
        password_hash: p_hash,
        must_change_password: true,
      }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateTeacherAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = { ...data };
      if (updateData.password) updateData.password_hash = await hashPassword(updateData.password);
      delete updateData.password;
      delete updateData.confirmPassword;

      const { data: res, error } = await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteTeacherAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

// --- TEACHER CLASSES ---
export const useTeacherClasses = (teacherId?: string) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['teacherClasses', teacherId, session?.id],
    queryFn: async () => {
      if (!teacherId) return [];

      if (!session || session.role !== 'teacher' || !session.id) {
        throw new Error('Session expired or invalid. Please log in again.');
      }

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          class_id,
          classes (id, name, tier, level)
        `)
        .eq('teacher_id', session.id);

      if (error) throw error;

      const uniqueClasses = new Map<string, any>();

      for (const row of data || []) {
        const classInfo = Array.isArray((row as any).classes)
          ? (row as any).classes[0]
          : (row as any).classes;

        const classId = (row as any).class_id;

        if (!classId || !classInfo || uniqueClasses.has(classId)) continue;

        uniqueClasses.set(classId, {
          id: `class-${classId}`,
          teacher_id: session.id,
          class_id: classId,
          classes: classInfo
        });
      }

      return Array.from(uniqueClasses.values());
    },
    enabled: !!teacherId && session?.role === 'teacher' && !!session?.id
  });
};
