import { useState, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useStudents, useCreateStudentAdmin, useUpdateStudentAdmin, useDeleteStudentAdmin } from '@/hooks/use-users';
import { useParents, useCreateParent, useStudentParents, useAssignStudentToParent } from '@/hooks/use-parents';
import { useClasses } from '@/hooks/use-academics';
import { adminResetPassword, generateUsernameFromName } from '@/lib/auth-utils';
import { sanitizeFormData, validateStudentData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Edit2, Trash2, Loader2, Eye, EyeOff, Upload, Download, RefreshCw, Link2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function AdminStudents() {
  const { data: students = [], isLoading: loadingStudents } = useStudents('admin');
  const { data: classes = [] } = useClasses();
  
  const createStudent = useCreateStudentAdmin();
  const updateStudent = useUpdateStudentAdmin();
  const deleteStudent = useDeleteStudentAdmin();

  const { data: parents = [] } = useParents();
  const createParent = useCreateParent();
  const assignStudentToParent = useAssignStudentToParent();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [parentMode, setParentMode] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [isPrimaryParent, setIsPrimaryParent] = useState(true);
  const [newParentPassword, setNewParentPassword] = useState('Parent@12');

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: 'Student@12',
    admission_number: '',
    email: '',
    phone_number: '',
    gender: '',
    class_id: '',
    tier: '',
    date_of_birth: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    status: 'approved'
  });

  const { data: linkedParents = [] } = useStudentParents(editingId || undefined);

  const selectedExistingParent = parents.find((parent: any) => parent.id === selectedParentId);

  const resetParentWorkflow = () => {
    setParentMode('none');
    setSelectedParentId('');
    setRelationship('Parent');
    setIsPrimaryParent(true);
    setNewParentPassword('Parent@12');
  };

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const lower = search.toLowerCase();
    return students.filter((s: any) =>
      (s.full_name || '').toLowerCase().includes(lower) ||
      (s.admission_number || '').toLowerCase().includes(lower) ||
      (s.username || '').toLowerCase().includes(lower)
    );
  }, [students, search]);

  const handleOpenDialog = (student?: any) => {
    resetParentWorkflow();

    if (student) {
      setEditingId(student.id);
      setFormData({
        full_name: student.full_name,
        username: student.username,
        password: '', // Leave blank when editing
        admission_number: student.admission_number || '',
        email: student.email || '',
        phone_number: student.phone_number || '',
        gender: student.gender || '',
        class_id: student.class_id || '',
        tier: student.tier || '',
        date_of_birth: student.date_of_birth || '',
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
        parent_email: student.parent_email || '',
        status: student.status
      });
    } else {
      setEditingId(null);
      setUsernameManuallyEdited(false);
      setFormData({
        full_name: '', username: '', password: 'Student@12', admission_number: '', email: '', phone_number: '',
        gender: '', class_id: '', tier: '', date_of_birth: '',
        parent_name: '', parent_phone: '', parent_email: '', status: 'approved'
      });
    }
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleClassChange = (classId: string) => {
    const selectedClass = classes.find(c => c.id === classId);
    setFormData(prev => ({ ...prev, class_id: classId, tier: selectedClass?.tier || prev.tier }));
  };

  const handleFullNameChange = (fullName: string) => {
    setFormData(prev => ({ ...prev, full_name: fullName }));
    // Auto-generate username only in create mode and if not manually edited
    if (!editingId && !usernameManuallyEdited) {
      const generatedUsername = generateUsernameFromName(fullName);
      if (generatedUsername) {
        setFormData(prev => ({ ...prev, username: generatedUsername }));
      }
    }
  };

  const handleUsernameChange = (username: string) => {
    setFormData(prev => ({ ...prev, username }));
    // Mark as manually edited only in create mode
    if (!editingId) {
      setUsernameManuallyEdited(true);
    }
  };

  const buildParentFields = () => {
    if (parentMode === 'existing' && selectedExistingParent) {
      return {
        parent_name: selectedExistingParent.full_name || '',
        parent_phone: selectedExistingParent.phone_number || '',
        parent_email: selectedExistingParent.email || '',
      };
    }

    if (parentMode === 'new') {
      return {
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        parent_email: formData.parent_email,
      };
    }

    return {
      parent_name: formData.parent_name,
      parent_phone: formData.parent_phone,
      parent_email: formData.parent_email,
    };
  };

  const ensureParentAndLink = async (studentId: string) => {
    if (parentMode === 'none') return;

    let parent: any = null;

    if (parentMode === 'existing') {
      if (!selectedExistingParent) {
        throw new Error('Please select an existing parent.');
      }
      parent = selectedExistingParent;
    } else {
      const email = formData.parent_email.trim().toLowerCase();

      if (!formData.parent_name.trim() || !email) {
        throw new Error('Parent name and email are required when creating a parent account.');
      }

      const matchedParent = parents.find(
        (item: any) => (item.email || '').trim().toLowerCase() === email
      );

      if (matchedParent) {
        parent = matchedParent;
      } else {
        parent = await createParent.mutateAsync({
          full_name: formData.parent_name.trim(),
          email,
          password: newParentPassword || 'Parent@12',
          phone_number: formData.parent_phone.trim() || undefined,
          address: '',
        });
      }
    }

    const alreadyLinked = linkedParents.some(
      (assignment: any) => assignment.parent_id === parent.id
    );

    if (!alreadyLinked) {
      await assignStudentToParent.mutateAsync({
        parent_id: parent.id,
        student_id: studentId,
        relationship,
        is_primary: isPrimaryParent,
      });
    }

    return parent;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize form data
    const validation = validateStudentData(formData, !!editingId);
    if (!validation.valid) {
      toast.error(validation.errors.join(', '));
      return;
    }
    
    if (parentMode === 'existing' && !selectedParentId) {
      toast.error('Please select an existing parent.');
      return;
    }

    if (parentMode === 'new') {
      if (!formData.parent_name.trim() || !formData.parent_email.trim()) {
        toast.error('Parent name and email are required.');
        return;
      }

      if (!newParentPassword || newParentPassword.length < 6) {
        toast.error('Parent password must be at least 6 characters.');
        return;
      }
    }

    const sanitizedData = sanitizeFormData({
      ...formData,
      ...buildParentFields(),
    });

    // PostgreSQL DATE columns do not accept an empty string.
    // Store no date as NULL instead.
    const normalizedStudentData: any = {
      ...sanitizedData,
      date_of_birth: sanitizedData.date_of_birth?.trim() || null,
    };

    // Check for duplicate admission number if provided
    const admissionNumber = normalizedStudentData.admission_number?.trim();
    if (admissionNumber) {
      const duplicate = students.find(
        (s: any) => s.admission_number?.trim() === admissionNumber && s.id !== editingId
      );
      if (duplicate) {
        toast.error(`Admission number ${admissionNumber} is already assigned to ${duplicate.full_name}`);
        return;
      }
    }

    try {
      let studentId = editingId;

      if (editingId) {
        // Don't send empty password
        const { password, ...rest } = normalizedStudentData;
        const normalizedAdmissionNumber = rest.admission_number?.trim() || null;
        const submitData: any = {
          ...rest,
          admission_number: normalizedAdmissionNumber
        };

        if (password) {
          submitData.password = password;
        }

        await updateStudent.mutateAsync({ id: editingId, data: submitData });
      } else {
        const submitData: any = {
          ...normalizedStudentData,
          admission_number: normalizedStudentData.admission_number?.trim() || null
        };

        const createdStudent = await createStudent.mutateAsync(submitData);
        studentId = createdStudent?.id;
      }

      if (studentId && parentMode !== 'none') {
        await ensureParentAndLink(studentId);
      }

      setIsDialogOpen(false);
      resetParentWorkflow();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save student and parent relationship.');
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    await updateStudent.mutateAsync({ id, data: { is_active: newStatus === 'Active' } });
  };

  const handleResetPassword = async (student: any) => {
    const result = await adminResetPassword('student', student.id, 'Student@12');
    if (result.success) {
      toast.success(`Password reset for ${student.full_name}. Default password: Student@12`);
    } else {
      toast.error(result.error || 'Failed to reset password');
    }
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const studentsToCreate: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const student: any = {};
        
        headers.forEach((header, index) => {
          if (header === 'full_name') student.full_name = values[index];
          if (header === 'username') student.username = values[index];
          if (header === 'password') student.password = values[index];
          if (header === 'email') student.email = values[index];
          if (header === 'phone_number') student.phone_number = values[index];
          if (header === 'gender') student.gender = values[index];
          if (header === 'class_id') student.class_id = values[index];
          if (header === 'tier') student.tier = values[index];
          if (header === 'date_of_birth') student.date_of_birth = values[index];
          if (header === 'parent_name') student.parent_name = values[index];
          if (header === 'parent_phone') student.parent_phone = values[index];
          if (header === 'parent_email') student.parent_email = values[index];
        });
        
        if (student.full_name && student.username && student.password && student.class_id && student.tier) {
          // Normalize blank admission_number to null
          student.admission_number = student.admission_number?.trim() || null;
          student.status = 'Active';
          studentsToCreate.push(student);
        }
      }

      if (studentsToCreate.length === 0) {
        toast.error('No valid students found in CSV. Ensure headers match: full_name, username, password, email, phone_number, gender, class_id, tier, date_of_birth, parent_name, parent_phone, parent_email');
        return;
      }

      try {
        for (const student of studentsToCreate) {
          await createStudent.mutateAsync(student);
        }
        toast.success(`Successfully imported ${studentsToCreate.length} students`);
        setIsBulkDialogOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        toast.error('Error importing students. Please check the CSV format and try again.');
      }
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = 'full_name,username,password,email,phone_number,gender,class_id,tier,date_of_birth,parent_name,parent_phone,parent_email\nJohn Doe,johndoe,password123,john@example.com,1234567890,Male,class-uuid-here,JSS1,2010-01-01,Jane Doe,9876543210,jane@example.com';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Manage Students" 
          actions={
            <div className="flex gap-2">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button onClick={() => setIsBulkDialogOpen(true)} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-navy-700 hover:bg-navy-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
          }
        />

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[400px]">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name, username, or admission number..." 
                className="pl-9 h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingStudents ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12">S/N</TableHead>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student: any, index: number) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium text-navy-700 dark:text-navy-300">{student.admission_number}</TableCell>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.username}</TableCell>
                        <TableCell>{student.classes?.name || '-'}</TableCell>
                        <TableCell>{student.gender || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={student.is_active} 
                              onCheckedChange={() => toggleStatus(student.id, student.is_active ? 'Active' : 'Inactive')}
                            />
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${student.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50' : 'bg-red-50 text-red-600 dark:bg-red-900/50'}`}>
                              {student.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(student)} title="Edit Student">
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleResetPassword(student)} 
                              title="Reset Password to Default (Student@12)"
                              className="hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600"
                            >
                              <RefreshCw className="w-4 h-4 text-amber-600" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50" title="Delete Student">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {student.full_name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => deleteStudent.mutate(student.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" required value={formData.full_name} onChange={e => handleFullNameChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input id="username" required value={formData.username} onChange={e => handleUsernameChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admission_number">Admission Number (Optional)</Label>
                  <Input id="admission_number" value={formData.admission_number} onChange={e => setFormData({...formData, admission_number: e.target.value})} placeholder="Leave blank for auto-assignment" />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">{editingId ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Hide Password" : "Show Password"}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select required value={formData.class_id} onValueChange={handleClassChange}>
                    <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <Input id="tier" readOnly disabled value={formData.tier} className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Student Phone</Label>
                  <Input id="phone_number" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Parent / Guardian Account
                  </h3>
                </div>

                {editingId && linkedParents.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium mb-2">Currently linked</p>
                    <div className="space-y-2">
                      {linkedParents.map((assignment: any) => (
                        <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span>
                            {assignment.parents?.full_name || 'Parent'}
                            {assignment.relationship ? ` • ${assignment.relationship}` : ''}
                          </span>
                          {assignment.is_primary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <Label>Parent setup</Label>
                  <Select
                    value={parentMode}
                    onValueChange={(value: 'none' | 'existing' | 'new') => {
                      setParentMode(value);
                      setSelectedParentId('');

                      if (value === 'none') {
                        setRelationship('Parent');
                        setIsPrimaryParent(true);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose parent setup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent account / keep existing details</SelectItem>
                      <SelectItem value="existing">Link an existing parent</SelectItem>
                      <SelectItem value="new">Create or reuse parent by email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {parentMode === 'existing' && (
                  <div className="space-y-2 mb-4">
                    <Label>Select Existing Parent *</Label>
                    <Select
                      value={selectedParentId}
                      onValueChange={(parentId) => {
                        setSelectedParentId(parentId);
                        const parent = parents.find((item: any) => item.id === parentId);

                        if (parent) {
                          setFormData((prev) => ({
                            ...prev,
                            parent_name: parent.full_name || '',
                            parent_phone: parent.phone_number || '',
                            parent_email: parent.email || '',
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a parent" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((parent: any) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.full_name} — {parent.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {parentMode === 'new' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_name">Parent Name *</Label>
                      <Input
                        id="parent_name"
                        value={formData.parent_name}
                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_phone">Parent Phone</Label>
                      <Input
                        id="parent_phone"
                        value={formData.parent_phone}
                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_email">Parent Email *</Label>
                      <Input
                        id="parent_email"
                        type="email"
                        value={formData.parent_email}
                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                        placeholder="Existing email will reuse that parent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_password">Parent Password</Label>
                      <Input
                        id="parent_password"
                        type="text"
                        value={newParentPassword}
                        onChange={(e) => setNewParentPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used only if a new parent account is created. Default: Parent@12
                      </p>
                    </div>
                  </div>
                )}

                {parentMode !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-border p-3">
                    <div className="space-y-2">
                      <Label>Relationship *</Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Guardian">Guardian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm cursor-pointer min-h-10">
                        <input
                          type="checkbox"
                          checked={isPrimaryParent}
                          onChange={(e) => setIsPrimaryParent(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Primary contact
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-navy-700 hover:bg-navy-800 text-white" disabled={
                    createStudent.isPending ||
                    updateStudent.isPending ||
                    createParent.isPending ||
                    assignStudentToParent.isPending
                  }>
                  {(
                    createStudent.isPending ||
                    updateStudent.isPending ||
                    createParent.isPending ||
                    assignStudentToParent.isPending
                  ) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Student'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Import Students</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Import students from a CSV file. The CSV must have the following headers:</p>
                <code className="block bg-muted p-2 rounded text-xs">
                  full_name, username, password, email, phone_number, gender, class_id, tier, date_of_birth, parent_name, parent_phone, parent_email
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleBulkImport}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
