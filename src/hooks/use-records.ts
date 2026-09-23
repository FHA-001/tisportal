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

export type AdminClassResultStudent = {
  id: string;
  full_name: string;
  admission_number: string | null;
  tier: string | null;
  class_id: string;
  class_name: string;
  expected_subjects: number;
  completed_subjects: number;
  average: number;
  total_score: number;
  status: 'complete' | 'incomplete' | 'no_grades';
};

export type AdminClassResultsOverview = {
  students: AdminClassResultStudent[];
  expected_subjects: number;
  complete_count: number;
  incomplete_count: number;
  no_grades_count: number;
};

export const useAdminClassResults = (classId?: string, term?: string, sessionName?: string) => {
  return useQuery({
    queryKey: ['admin-class-results', classId, term, sessionName],
    queryFn: async (): Promise<AdminClassResultsOverview> => {
      if (!classId || !term || !sessionName) {
        return { students: [], expected_subjects: 0, complete_count: 0, incomplete_count: 0, no_grades_count: 0 };
      }

      const [studentsResult, classSubjectsResult, gradesResult] = await Promise.all([
        supabase
          .from('students')
          .select(`
            id,
            full_name,
            admission_number,
            tier,
            class_id,
            is_active,
            enrollment_status,
            classes(name)
          `)
          .eq('class_id', classId)
          .eq('status', 'approved')
          .order('full_name', { ascending: true }),
        supabase
          .from('class_subjects')
          .select('id, subject_id')
          .eq('class_id', classId),
        supabase
          .from('grades')
          .select(`
            id,
            student_id,
            class_subject_id,
            total,
            term,
            session,
            class_subjects!inner(class_id)
          `)
          .eq('term', term)
          .eq('session', sessionName)
          .eq('class_subjects.class_id', classId),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (classSubjectsResult.error) throw classSubjectsResult.error;
      if (gradesResult.error) throw gradesResult.error;

      const expectedSubjects = classSubjectsResult.data?.length ?? 0;
      const gradesByStudent = new Map<string, any[]>();

      for (const grade of gradesResult.data ?? []) {
        const studentId = (grade as any).student_id as string;
        if (!gradesByStudent.has(studentId)) gradesByStudent.set(studentId, []);
        gradesByStudent.get(studentId)!.push(grade);
      }

      const students = (studentsResult.data ?? [])
        .filter((student: any) => student.enrollment_status === 'active' && student.is_active === true)
        .map((student: any): AdminClassResultStudent => {
          const studentGrades = gradesByStudent.get(student.id) ?? [];
          const completedSubjects = new Set(
            studentGrades
              .filter((grade: any) => grade.total !== null)
              .map((grade: any) => grade.class_subject_id)
          ).size;

          const validTotals = studentGrades
            .map((grade: any) => grade.total)
            .filter((total: any) => total !== null && total !== undefined)
            .map(Number);

          const totalScore = validTotals.reduce((sum: number, value: number) => sum + value, 0);
          const average = validTotals.length > 0 ? totalScore / validTotals.length : 0;

          let status: AdminClassResultStudent['status'] = 'no_grades';
          if (validTotals.length > 0) {
            status = expectedSubjects > 0 && completedSubjects >= expectedSubjects ? 'complete' : 'incomplete';
          }

          const classRelation = Array.isArray(student.classes) ? student.classes[0] : student.classes;

          return {
            id: student.id,
            full_name: student.full_name,
            admission_number: student.admission_number,
            tier: student.tier,
            class_id: student.class_id,
            class_name: classRelation?.name ?? '',
            expected_subjects: expectedSubjects,
            completed_subjects: completedSubjects,
            average,
            total_score: totalScore,
            status,
          };
        });

      return {
        students,
        expected_subjects: expectedSubjects,
        complete_count: students.filter((student) => student.status === 'complete').length,
        incomplete_count: students.filter((student) => student.status === 'incomplete').length,
        no_grades_count: students.filter((student) => student.status === 'no_grades').length,
      };
    },
    enabled: !!classId && !!term && !!sessionName,
  });
};

// --- SECURE STUDENT GRADES ---
export const useStudentGrades = (filters?: { term?: string; session?: string }) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['student-grades', session?.id, filters],
    queryFn: async () => {
      if (!session?.session_token || session?.role !== 'student') return [];

      const { data, error } = await supabase.rpc('get_student_grades', {
        p_session_token: session.session_token,
        p_term: filters?.term || null,
        p_session: filters?.session || null
      });

      if (error) throw error;

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
          subjects: { name: row.subject_name, code: row.subject_code },
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
      if (!session?.session_token || session?.role !== 'parent' || !studentId) return [];

      const { data, error } = await supabase.rpc('get_parent_child_grades', {
        p_session_token: session.session_token,
        p_student_id: studentId,
        p_term: filters?.term || null,
        p_session: filters?.session || null
      });

      if (error) throw error;

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
          subjects: { name: row.subject_name, code: row.subject_code },
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

// --- SECURE TEACHER GRADES ---
export const useTeacherGrades = (classSubjectId?: string, filters?: { term?: string; session?: string }) => {
  const session = getCustomSession();

  return useQuery({
    queryKey: ['teacher-grades', session?.id, classSubjectId, filters],
    queryFn: async () => {
      if (!session?.session_token || session?.role !== 'teacher' || !classSubjectId) return [];

      const { data, error } = await supabase.rpc('get_teacher_grades', {
        p_session_token: session.session_token,
        p_class_subject_id: classSubjectId,
        p_term: filters?.term || null,
        p_session: filters?.session || null
      });

      if (error) throw error;

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
        students: {
          full_name: row.student_full_name,
          admission_number: row.student_admission_number
        }
      }));
    },
    enabled: !!session?.session_token && session?.role === 'teacher' && !!classSubjectId
  });
};

// --- SECURE TEACHER SAVE GRADES ---
export const useSaveTeacherGrades = () => {
  const queryClient = useQueryClient();
  const session = getCustomSession();

  return useMutation({
    mutationFn: async (payload: any[]) => {
      if (!session?.session_token || session?.role !== 'teacher') throw new Error('Unauthorized');

      const { data, error } = await supabase.rpc('save_teacher_grades', {
        p_session_token: session.session_token,
        p_grades: payload as any
      });

      if (error) throw error;
      if (data?.success !== true) throw new Error(data?.error || 'Failed to save grades');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-grades'] });
      queryClient.invalidateQueries({ queryKey: ['admin-class-results'] });
      toast.success('Grades saved successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save grades')
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
