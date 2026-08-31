import { useState, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useTeachers, useCreateTeacherAdmin, useUpdateTeacherAdmin, useDeleteTeacherAdmin } from '@/hooks/use-users';
import { sanitizeFormData, validateTeacherData } from '@/lib/validation';
import { adminResetPassword } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Edit2, Trash2, Loader2, Eye, EyeOff, Upload, Download, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function AdminTeachers() {
  const { data: teachers = [], isLoading: loadingTeachers } = useTeachers('admin');
  
  const createTeacher = useCreateTeacherAdmin();
  const updateTeacher = useUpdateTeacherAdmin();
  const deleteTeacher = useDeleteTeacherAdmin();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: 'Teacher@12',
    phone_number: '',
    gender: '',
    date_of_birth: '',
    status: 'Active'
  });

  const filteredTeachers = useMemo(() => {
    if (!search) return teachers;
    const lower = search.toLowerCase();
    return teachers.filter(t => 
      t.full_name.toLowerCase().includes(lower) || 
      t.email.toLowerCase().includes(lower)
    );
  }, [teachers, search]);

  const handleOpenDialog = (teacher?: any) => {
    if (teacher) {
      setEditingId(teacher.id);
      setFormData({
        full_name: teacher.full_name,
        email: teacher.email,
        password: '', // Leave blank when editing
        phone_number: teacher.phone_number || '',
        gender: teacher.gender || '',
        date_of_birth: teacher.date_of_birth || '',
        status: teacher.status
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '', email: '', password: 'Teacher@12', phone_number: '',
        gender: '', date_of_birth: '', status: 'Active'
      });
    }
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize form data
    const validation = validateTeacherData(formData, !!editingId);
    if (!validation.valid) {
      toast.error(validation.errors.join(', '));
      return;
    }
    
    const sanitizedData = sanitizeFormData(formData);
    
    if (editingId) {
      const { password, ...rest } = sanitizedData;
      const submitData = password ? { ...rest, password } : rest;
      await updateTeacher.mutateAsync({ id: editingId, data: submitData });
    } else {
      await createTeacher.mutateAsync(sanitizedData);
    }
    setIsDialogOpen(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    await updateTeacher.mutateAsync({ id, data: { status: newStatus } });
  };

  const handleResetPassword = async (teacher: any) => {
    const result = await adminResetPassword('teacher', teacher.id, 'Teacher@123');
    if (result.success) {
      toast.success(`Password reset for ${teacher.full_name}. Default password: Teacher@123`);
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
      
      const teachersToCreate: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const teacher: any = {};
        
        headers.forEach((header, index) => {
          if (header === 'full_name') teacher.full_name = values[index];
          if (header === 'email') teacher.email = values[index];
          if (header === 'password') teacher.password = values[index];
          if (header === 'phone_number') teacher.phone_number = values[index];
          if (header === 'gender') teacher.gender = values[index];
          if (header === 'date_of_birth') teacher.date_of_birth = values[index];
        });
        
        if (teacher.full_name && teacher.email && teacher.password) {
          teacher.status = 'Active';
          teachersToCreate.push(teacher);
        }
      }

      if (teachersToCreate.length === 0) {
        toast.error('No valid teachers found in CSV. Ensure headers match: full_name, email, password, phone_number, gender, date_of_birth');
        return;
      }

      try {
        for (const teacher of teachersToCreate) {
          await createTeacher.mutateAsync(teacher);
        }
        toast.success(`Successfully imported ${teachersToCreate.length} teachers`);
        setIsBulkDialogOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        toast.error('Error importing teachers. Please check the CSV format and try again.');
      }
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = 'full_name,email,password,phone_number,gender,date_of_birth\nJohn Doe,john@example.com,password123,1234567890,Male,1985-01-01';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Manage Teachers" 
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
              <Button onClick={() => handleOpenDialog()} className="bg-gold-600 hover:bg-gold-700 text-white border-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Teacher
              </Button>
            </div>
          }
        />

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[400px]">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9 h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filteredTeachers.length} {filteredTeachers.length === 1 ? 'teacher' : 'teachers'}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingTeachers ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12">S/N</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No teachers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher, index) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{teacher.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                        <TableCell>{teacher.phone_number || '-'}</TableCell>
                        <TableCell>{teacher.gender || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={teacher.status === 'Active'} 
                              onCheckedChange={() => toggleStatus(teacher.id, teacher.status)}
                            />
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${teacher.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50' : 'bg-red-50 text-red-600 dark:bg-red-900/50'}`}>
                              {teacher.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(teacher)} title="Edit Teacher">
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleResetPassword(teacher)} 
                              title="Reset Password to Default (Teacher@123)"
                              className="hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600"
                            >
                              <RefreshCw className="w-4 h-4 text-amber-600" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50" title="Delete Teacher">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {teacher.full_name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => deleteTeacher.mutate(teacher.id)}
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
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2 relative md:col-span-2">
                  <Label htmlFor="password">{editingId ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Hide Password" : "Show Password"}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input id="phone_number" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
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
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gold-600 hover:bg-gold-700 text-white border-0" disabled={createTeacher.isPending || updateTeacher.isPending}>
                  {(createTeacher.isPending || updateTeacher.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Teacher'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Import Teachers</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Import teachers from a CSV file. The CSV must have the following headers:</p>
                <code className="block bg-muted p-2 rounded text-xs">
                  full_name, email, password, phone_number, gender, date_of_birth
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
