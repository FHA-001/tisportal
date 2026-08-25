import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { GraduationCap, Users, BookOpen, FileText, Shield } from 'lucide-react';
import { useStudents, useTeachers } from '@/hooks/use-users';
import { useClasses, useSubjects } from '@/hooks/use-academics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Label } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { Badge } from '@/components/ui/badge';

const PIE_COLORS = ['#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD'];
const BAR_COLORS = ['#1D4ED8', '#F59E0B', '#10B981']; // Primary (blue), Junior Secondary (amber), Senior Secondary (emerald)
const BAR_GRADIENT_START = '#1D4ED8';
const BAR_GRADIENT_END = '#1E3A8A';

export default function AdminDashboard() {
  const { data: students = [] } = useStudents('admin');
  const { data: teachers = [] } = useTeachers('admin');
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();

  const activeStudents = students.filter(s => s.is_active === true);
  
  // Data for charts
  const tierDistribution = [
    { name: 'Primary', count: students.filter(s => s.tier === 'Primary').length },
    { name: 'Junior Sec', count: students.filter(s => s.tier === 'Junior Secondary').length },
    { name: 'Senior Sec', count: students.filter(s => s.tier === 'Senior Secondary').length },
  ];

  const genderDistribution = [
    { name: 'Male', value: students.filter(s => s.gender === 'Male').length },
    { name: 'Female', value: students.filter(s => s.gender === 'Female').length },
  ].filter(item => item.value > 0);

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Admin Dashboard" 
          subtitle={getTimeBasedGreeting()}
          actions={
            <Badge variant="secondary" className="bg-navy-100 text-navy-800 dark:bg-navy-900 dark:text-navy-100">
              <Shield className="w-3 h-3 mr-1" />
              Administrator
            </Badge>
          }
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={GraduationCap} label="Total Students" value={activeStudents.length} color="primary" delay={0} />
          <StatCard icon={Users} label="Total Teachers" value={teachers.length} color="gold" delay={0.1} />
          <StatCard icon={BookOpen} label="Classes" value={classes.length} color="green" delay={0.2} />
          <StatCard icon={FileText} label="Subjects" value={subjects.length} color="purple" delay={0.3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Students by Tier</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(29, 78, 216, 0.1)' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.1)', padding: '12px' }}
                      itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                      labelStyle={{ color: '#64748b', fontSize: 12 }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill={BAR_GRADIENT_START} 
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {tierDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Enrollment Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex flex-col items-center justify-center">
                {genderDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={800}
                        animationEasing="ease-out"
                        label={(entry) => `${entry.name} (${entry.value})`}
                        labelLine={false}
                      >
                        {genderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.1)', padding: '12px' }}
                        itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                        labelStyle={{ color: '#64748b', fontSize: 12 }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, color: '#64748b' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground">No student data available.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
