import { ReactNode, useMemo, useState } from 'react';
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
  Megaphone,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Bell,
  Check,
  CheckCheck
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { TISLogo } from './tis-logo';
import { ThemeToggle } from './theme-toggle';
import { supabase } from '@/lib/supabaseClient';
import { getCustomSession, signOutCustomSession } from '@/lib/auth-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  related_submission_id: string | null;
  is_read: boolean;
  created_at: string;
}

function getNotificationPath(
  role: DashboardLayoutProps['role'],
  notification: NotificationItem
): string | null {
  switch (notification.type) {
    case 'announcement':
      return `/${role}/announcements`;

    case 'newsletter':
      return `/${role}/newsletters`;

    case 'homework':
      return role === 'student' ? '/student/homework' : null;

    case 'result':
      if (role === 'student') return '/student/grades';
      if (role === 'parent') return '/parent/grades';
      if (role === 'teacher') return '/teacher/grading';
      if (role === 'admin') return '/admin/reports';
      return null;

    case 'payment_approved':
    case 'payment_rejected':
      return role === 'parent' ? '/parent/payment-history' : null;

    case 'payment_submitted':
      return role === 'accountant' ? '/accountant/payment-review' : null;

    case 'signup':
      return role === 'admin' ? '/admin/signup-requests' : null;

    case 'session':
      if (role === 'admin') return '/admin/settings';
      return `/${role}`;

    default:
      return null;
  }
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
    title: 'Finance',
    items: [
      { label: 'Dashboard', path: '/accountant', icon: LayoutDashboard },
      { label: 'Classes & Fees', path: '/accountant/classes', icon: BookOpen },
      { label: 'Payment Review', path: '/accountant/payment-review', icon: Banknote },
      { label: 'Financial Reports', path: '/accountant/financial-reports', icon: TrendingUp },
    ]
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', path: '/accountant/announcements', icon: Megaphone },
      { label: 'Newsletters', path: '/accountant/newsletters', icon: Newspaper },
    ]
  },
];

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

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
      await signOutCustomSession();
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

  const userRole = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : role === 'accountant' ? 'Accountant' : role === 'parent' ? 'Parent' : 'Student';
  const initial = userName.charAt(0).toUpperCase();

  const notificationQueryKey = useMemo(
    () => ['notifications', role, role === 'admin' ? adminSession?.user?.id ?? null : customSession?.id ?? null],
    [role, adminSession?.user?.id, customSession?.id]
  );

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<NotificationItem[]>({
    queryKey: notificationQueryKey,
    queryFn: async () => {
      if (role === 'admin') {
        if (!adminSession?.user?.id) return [];
        const { data, error } = await supabase.rpc('get_admin_notifications', {
          p_limit: 50,
        });
        if (error) throw error;
        return (data ?? []) as NotificationItem[];
      }

      if (!customSession?.session_token) return [];

      const { data, error } = await supabase.rpc('get_custom_notifications', {
        p_session_token: customSession.session_token,
        p_limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as NotificationItem[];
    },
    enabled: role === 'admin'
      ? Boolean(adminSession?.user?.id)
      : Boolean(customSession?.session_token),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const markNotificationRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (role === 'admin') {
        const { data, error } = await supabase.rpc('mark_admin_notification_read', {
          p_notification_id: notificationId,
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || 'Failed to mark notification as read');
        return data;
      }

      if (!customSession?.session_token) {
        throw new Error('No valid session. Please log in again.');
      }

      const { data, error } = await supabase.rpc('mark_custom_notification_read', {
        p_session_token: customSession.session_token,
        p_notification_id: notificationId,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Failed to mark notification as read');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: async () => {
      if (role === 'admin') {
        const { data, error } = await supabase.rpc('mark_all_admin_notifications_read');
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || 'Failed to mark notifications as read');
        return data;
      }

      if (!customSession?.session_token) {
        throw new Error('No valid session. Please log in again.');
      }

      const { data, error } = await supabase.rpc('mark_all_custom_notifications_read', {
        p_session_token: customSession.session_token,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Failed to mark notifications as read');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });

  const formatNotificationTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const diffMs = Date.now() - created.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return created.toLocaleDateString();
  };

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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative p-2 text-foreground hover:bg-accent rounded-md transition-colors"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="fixed left-1/2 top-16 z-40 w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[min(92vw,24rem)] sm:max-w-none sm:translate-x-0"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                          <h3 className="font-semibold text-sm">Notifications</h3>
                          <p className="text-xs text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => markAllNotificationsRead.mutate()}
                            disabled={markAllNotificationsRead.isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                          >
                            <CheckCheck className="w-4 h-4" />
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-[calc(100dvh-9rem)] sm:max-h-[70vh] overflow-y-auto">
                        {notificationsLoading ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Loading notifications...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-10 text-center">
                            <Bell className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm font-medium">No notifications yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              New school updates will appear here.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              type="button"
                              key={notification.id}
                              onClick={() => {
                                if (!notification.is_read) {
                                  markNotificationRead.mutate(notification.id);
                                }

                                const destination = getNotificationPath(role, notification);
                                if (destination) {
                                  setNotificationsOpen(false);
                                  setLocation(destination);
                                }
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-accent/50 ${
                                notification.is_read ? 'bg-card' : 'bg-primary/5'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                  notification.is_read ? 'bg-muted-foreground/30' : 'bg-primary'
                                }`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className={`text-sm ${
                                      notification.is_read ? 'font-medium' : 'font-semibold'
                                    }`}>
                                      {notification.title}
                                    </p>
                                    {notification.is_read && (
                                      <Check className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {notification.message}
                                  </p>
                                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
