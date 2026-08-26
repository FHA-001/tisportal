import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ScrollToTop } from '@/components/shared/scroll-to-top';

// Pages
import Home from '@/pages/home';
import Login from '@/pages/auth/login';
import ChangePassword from '@/pages/auth/change-password';
import StudentSignup from '@/pages/auth/student-signup';
import ParentDashboard from '@/pages/parent/dashboard';
import PrivacyPolicy from '@/pages/privacy-policy';
import ParentChildren from '@/pages/parent/children';
import ParentGrades from '@/pages/parent/grades';
import ParentFees from '@/pages/parent/fees';
import ParentAnnouncements from '@/pages/parent/announcements';
import ParentNewsletters from '@/pages/parent/newsletters';
import ParentPaymentSubmissions from '@/pages/parent/payment-submissions';
import ParentPaymentHistory from '@/pages/parent/payment-history';
import ResetCustomPassword from '@/pages/auth/reset-custom-password';
import SchoolFees from '@/pages/school-fees';
import NotFound from '@/pages/not-found';

// Admin
import AdminDashboard from '@/pages/admin/dashboard';
import AdminStudents from '@/pages/admin/students';
import AdminTeachers from '@/pages/admin/teachers';
import AdminParents from '@/pages/admin/parents';
import AdminClasses from '@/pages/admin/classes';
import AdminSubjects from '@/pages/admin/subjects';
import AdminClassSubjects from '@/pages/admin/class-subjects';
import AdminGrades from '@/pages/admin/grades';
import AdminReports from '@/pages/admin/reports';
import AdminSchoolFees from '@/pages/admin/school-fees';
import AdminAnnouncements from '@/pages/admin/announcements';
import AdminNewsletters from '@/pages/admin/newsletters';
import AdminSettings from '@/pages/admin/settings';
import AdminSignupRequests from '@/pages/admin/signup-requests';

// Teacher
import TeacherDashboard from '@/pages/teacher/dashboard';
import TeacherClasses from '@/pages/teacher/classes';
import TeacherGrading from '@/pages/teacher/grading';
import TeacherStudents from '@/pages/teacher/students';
import TeacherAnnouncements from '@/pages/teacher/announcements';
import TeacherLessonPlanning from '@/pages/teacher/lesson-planning';
import TeacherHomework from '@/pages/teacher/homework';
import TeacherNewsletters from '@/pages/teacher/newsletters';

// Accountant
import AccountantDashboard from '@/pages/accountant/dashboard';
import AccountantPaymentReview from '@/pages/accountant/payment-review';
import FinancialReports from '@/pages/accountant/financial-reports';

// Student
import StudentDashboard from '@/pages/student/dashboard';
import StudentGrades from '@/pages/student/grades';
import StudentTimetable from '@/pages/student/timetable';
import StudentAnnouncements from '@/pages/student/announcements';
import StudentHomework from '@/pages/student/homework';
import StudentNewsletters from '@/pages/student/newsletters';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={StudentSignup} />
      <Route path="/school-fees" component={SchoolFees} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/reset-custom-password" component={ResetCustomPassword} />

      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/teachers" component={AdminTeachers} />
      <Route path="/admin/parents" component={AdminParents} />
      <Route path="/admin/classes" component={AdminClasses} />
      <Route path="/admin/subjects" component={AdminSubjects} />
      <Route path="/admin/class-subjects" component={AdminClassSubjects} />
      <Route path="/admin/grades" component={AdminGrades} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/school-fees" component={AdminSchoolFees} />
      <Route path="/admin/announcements" component={AdminAnnouncements} />
      <Route path="/admin/newsletters" component={AdminNewsletters} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/signup-requests" component={AdminSignupRequests} />

      {/* Teacher Routes */}
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/classes" component={TeacherClasses} />
      <Route path="/teacher/grading" component={TeacherGrading} />
      <Route path="/teacher/students" component={TeacherStudents} />
      <Route path="/teacher/announcements" component={TeacherAnnouncements} />
      <Route path="/teacher/lesson-planning" component={TeacherLessonPlanning} />
      <Route path="/teacher/homework" component={TeacherHomework} />
      <Route path="/teacher/newsletters" component={TeacherNewsletters} />

      {/* Accountant Routes */}
      <Route path="/accountant" component={AccountantDashboard} />
      <Route path="/accountant/payment-review" component={AccountantPaymentReview} />
      <Route path="/accountant/financial-reports" component={FinancialReports} />

      {/* Student Routes */}
      <Route path="/student" component={StudentDashboard} />
      <Route path="/student/grades" component={StudentGrades} />
      <Route path="/student/timetable" component={StudentTimetable} />
      <Route path="/student/announcements" component={StudentAnnouncements} />
      <Route path="/student/homework" component={StudentHomework} />
      <Route path="/student/newsletters" component={StudentNewsletters} />

      {/* Parent Routes */}
      <Route path="/parent" component={ParentDashboard} />
      <Route path="/parent/children" component={ParentChildren} />
      <Route path="/parent/grades" component={ParentGrades} />
      <Route path="/parent/fees" component={ParentFees} />
      <Route path="/parent/payment-submissions" component={ParentPaymentSubmissions} />
      <Route path="/parent/payment-history" component={ParentPaymentHistory} />
      <Route path="/parent/announcements" component={ParentAnnouncements} />
      <Route path="/parent/newsletters" component={ParentNewsletters} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <ScrollToTop />
            <Router />
          </WouterRouter>
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
