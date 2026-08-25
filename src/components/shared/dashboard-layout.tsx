import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  BookOpen, 
  FileText, 
  Calendar, 
  Award, 
  ClipboardList, 
  Settings,
  UserPlus,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Link as LinkIcon,
  Banknote,
  TrendingUp,
  Newspaper,
  Book,
  Users as ParentsIcon,
  CheckSquare,
  Megaphone,
  FileEdit,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { TISLogo } from './tis-logo';
import { ThemeToggle } from './theme-toggle';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCustomSession, clearCustomSession } from '@/lib/auth-utils';
import { useQuery } from '@tanstack/react-query';

interface DashboardLayoutProps {
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const adminNavSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    ]
  },
  {
    title: 'People',
    items: [
      { label: 'Students', path: '/admin/students', icon: GraduationCap },
      { label: 'Signup Requests', path: '/admin/signup-requests', icon: UserPlus },
      { label: 'Teachers', path: '/admin/teachers', icon: Users },
      { label: 'Parents', path: '/admin/parents', icon: ParentsIcon },
    ]
  },
  {
    title: 'Academics',
    items: [
      { label: 'Classes', path: '/admin/classes', icon: BookOpen },
      { label: 'Subjects', path: '/admin/subjects', icon: FileText },
      { label: 'Class-Subject Assignments', path: '/admin/class-subjects', icon: LinkIcon },
      { label: 'Grades', path: '/admin/grades', icon: Award },
    ]
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
      { label: 'Newsletters', path: '/admin/newsletters', icon: Newspaper },
    ]
  },
  {
    title: 'Admin',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: ClipboardList },
      { label: 'School Fees', path: '/admin/school-fees', icon: Banknote },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ]
  },
];

const teacherNavSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Teaching',
    items: [
      { label: 'My Classes', path: '/teacher/classes', icon: BookOpen },
      { label: 'Grading', path: '/teacher/grading', icon: Award },
      { label: 'Students', path: '/teacher/students', icon: UserPlus },
      { label: 'Lesson Planning', path: '/teacher/lesson-planning', icon: FileEdit },
      { label: 'Homework', path: '/teacher/homework', icon: Book },
    ]
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', path: '/teacher/announcements', icon: Megaphone },
      { label: 'Newsletters', path: '/teacher/newsletters', icon: Newspaper },
    ]
  },
];

const studentNavSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', path: '/student', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Academics',
    items: [
      { label: 'My Grades', path: '/student/grades', icon: Award },
      { label: 'Timetable', path: '/student/timetable', icon: Calendar },
      { label: 'Homework', path: '/student/homework', icon: Book },
    ]
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', path: '/student/announcements', icon: Megaphone },
      { label: 'Newsletters', path: '/student/newsletters', icon: Newspaper },
    ]
  },
];

const parentNavSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', path: '/parent', icon: LayoutDashboard },
    ]
  },
  {
    title: 'My Children',
    items: [
      { label: 'My Children', path: '/parent/children', icon: GraduationCap },
      { label: 'Payment Submissions', path: '/parent/payment-submissions', icon: Banknote },
      { label: 'Payment History', path: '/parent/payment-history', icon: FileText },
    ]
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', path: '/parent/announcements', icon: Megaphone },
      { label: 'Newsletters', path: '/parent/newsletters', icon: Newspaper },
    ]
  },
];

const accountantNavSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', path: '/accountant', icon: LayoutDashboard },
      { label: 'Payment Review', path: '/accountant/payment-review', icon: Banknote },
      { label: 'Financial Reports', path: '/accountant/financial-reports', icon: TrendingUp },
    ]
  },
];

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const navSections = role === 'admin' ? adminNavSections : role === 'teacher' ? teacherNavSections : role === 'parent' ? parentNavSections : role === 'accountant' ? accountantNavSections : studentNavSections;

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleSignOut = async () => {
    if (role === 'admin') {
      await supabase.auth.signOut();
    } else {
      clearCustomSession();
    }
    setLocation('/login');
  };

  const { data: adminSession } = useQuery({
    queryKey: ['adminSession'],
    queryFn: async () => {
      if (role !== 'admin') return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const customSession = role !== 'admin' ? getCustomSession() : null;

  const userName = role === 'admin' 
    ? adminSession?.user?.email?.split('@')[0] || 'Admin'
    : customSession?.full_name || 'User';

  const userRole = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : role === 'parent' ? 'Parent' : 'Student';
  const initial = userName.charAt(0).toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-5 border-b border-sidebar-border">
        <Link href={`/${role}`} className="flex items-center gap-3">
          <TISLogo size="sm" />
          <span className="font-heading font-bold text-white truncate">
            TIS <span className="font-medium opacity-90 text-sm block">Portal</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {navSections.map((section) => {
          const isExpanded = expandedSections[section.title] !== false; // Default to expanded
          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-white/60 hover:text-white uppercase tracking-wider transition-colors"
              >
                {section.title}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {isExpanded && (
                <div className="space-y-1 mt-1">
                  {section.items.map((item: NavItem) => {
                    const isActive = location === item.path || location.startsWith(item.path + '/');
                    const Icon = item.icon;
                    return (
                      <Link 
                        key={item.path} 
                        href={item.path} 
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                          isActive 
                            ? 'bg-sidebar-accent text-white' 
                            : 'text-white/90 hover:bg-sidebar-accent/50 hover:text-white'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                        )}
                        <div className="flex items-center gap-3 relative z-10 pl-2">
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        {isActive && (
                          <motion.div
                            layoutId="nav-indicator"
                            className="relative z-10"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </motion.div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sidebar-foreground font-bold text-sm">
            {initial}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-white truncate">{userName}</span>
            <span className="text-xs text-white/80 truncate">{userRole}</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer & Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden shadow-2xl"
          >
            <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-sidebar-foreground/70 hover:text-sidebar-foreground bg-sidebar-accent/50 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border h-14 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-foreground hover:bg-accent rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb or small contextual title could go here */}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
