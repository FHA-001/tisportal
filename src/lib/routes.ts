export const ROUTE_CONFIG = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  resetCustomPassword: '/reset-custom-password',
  home: '/',
  schoolFees: '/school-fees',

  admin: {
    dashboard: '/admin',
    students: '/admin/students',
    teachers: '/admin/teachers',
    parents: '/admin/parents',
    classes: '/admin/classes',
    subjects: '/admin/subjects',
    grades: '/admin/grades',
    reports: '/admin/reports',
    schoolFees: '/admin/school-fees',
    newsletters: '/admin/newsletters',
    settings: '/admin/settings',
  },

  teacher: {
    dashboard: '/teacher',
    classes: '/teacher/classes',
    grading: '/teacher/grading',
    students: '/teacher/students',
    homework: '/teacher/homework',
    newsletters: '/teacher/newsletters',
  },

  student: {
    dashboard: '/student',
    grades: '/student/grades',
    timetable: '/student/timetable',
    announcements: '/student/announcements',
    homework: '/student/homework',
    newsletters: '/student/newsletters',
  },

  parent: {
    dashboard: '/parent',
    children: '/parent/children',
    grades: '/parent/grades',
    fees: '/parent/fees',
    announcements: '/parent/announcements',
    newsletters: '/parent/newsletters',
  }
};
