import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeacherClasses } from '@/hooks/use-users';
import { useAttendanceByClass, useBulkAttendance, useAttendanceSummary } from '@/hooks/use-attendance';
import { getCustomSession } from '@/lib/auth-utils';
import { CheckSquare, Calendar, Users, Loader2, Save, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherAttendance() {
  const session = getCustomSession();
  const { data: classes = [] } = useTeacherClasses(session?.id);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const { data: attendance = [], isLoading: attendanceLoading } = useAttendanceByClass(selectedClassId, selectedDate);
  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary({ class_id: selectedClassId, start_date: selectedDate, end_date: selectedDate });
  const bulkAttendance = useBulkAttendance();

  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const selectedClass = classes.find((c: any) => c.classes?.id === selectedClassId);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setNotes(prev => ({ ...prev, [studentId]: note }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedDate) {
      toast.error('Please select a class and date');
      return;
    }

    const attendanceRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
      student_id: studentId,
      class_id: selectedClassId,
      date: selectedDate,
      status,
      ...(notes[studentId] ? { notes: notes[studentId] } : {})
    }));

    if (attendanceRecords.length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    await bulkAttendance.mutateAsync(attendanceRecords);
    setAttendanceData({});
    setNotes({});
  };

  const markAllPresent = () => {
    if (!selectedClass) return;
    const allPresent: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    selectedClass.students?.forEach((student: any) => {
      allPresent[student.id] = 'present';
    });
    setAttendanceData(allPresent);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />;
      case 'absent': return <XCircle className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      case 'excused': return <FileText className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <CustomSessionGuard role="teacher">
      <DashboardLayout role="teacher">
        <PageHeader 
          title="Attendance Tracking" 
          subtitle="Record and manage student attendance for your classes." 
        />

        <Card className="card-premium border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Class & Date
            </CardTitle>
            <CardDescription>
              Choose the class and date to record attendance for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-select">Class</Label>
                <select
                  id="class-select"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="">Select a class</option>
                  {classes.map((classData: any) => (
                    <option key={classData.classes?.id} value={classData.classes?.id}>
                      {classData.classes?.name} ({classData.classes?.tier})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-select">Date</Label>
                <Input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && (
          <>
            <Card className="card-premium border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Attendance Summary
                </CardTitle>
                <CardDescription>
                  {selectedClass.classes?.name} • {selectedDate}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : summary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Present
                      </div>
                      <div className="text-2xl font-bold text-emerald-600">{summary.present}</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Absent
                      </div>
                      <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        Late
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">{summary.late}</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Excused
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{summary.excused}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No attendance data for this date yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5" />
                      Mark Attendance
                    </CardTitle>
                    <CardDescription>
                      {selectedClass.students?.length || 0} students in class
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={markAllPresent}>
                      Mark All Present
                    </Button>
                    <Button 
                      onClick={handleSaveAttendance}
                      disabled={bulkAttendance.isPending || Object.keys(attendanceData).length === 0}
                    >
                      {bulkAttendance.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Attendance
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedClass.students?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No students in this class.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedClass.students?.map((student: any) => {
                      const existingAttendance = attendance.find((a: any) => a.student_id === student.id);
                      const currentStatus = attendanceData[student.id] || existingAttendance?.status;
                      
                      return (
                        <div
                          key={student.id}
                          className="p-4 bg-muted/30 rounded-lg border border-border"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="font-medium">{student.full_name}</div>
                              <div className="text-sm text-muted-foreground">{student.admission_number}</div>
                            </div>
                            <div className="flex gap-2">
                              {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(student.id, status)}
                                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                    currentStatus === status
                                      ? getStatusColor(status)
                                      : 'bg-background hover:bg-muted border-border'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    {getStatusIcon(status)}
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3">
                            <Input
                              placeholder="Add notes (optional)"
                              value={notes[student.id] || existingAttendance?.notes || ''}
                              onChange={(e) => handleNoteChange(student.id, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
