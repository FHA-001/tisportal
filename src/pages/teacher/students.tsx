import { useState, useMemo } from 'react';



import { DashboardLayout } from '@/components/shared/dashboard-layout';



import { CustomSessionGuard } from '@/components/shared/custom-session-guard';



import { PageHeader } from '@/components/shared/page-header';



import { useStudents } from '@/hooks/use-users';



import { useTeacherClassSubjects } from '@/hooks/use-academics';



import {
  createStudentByTeacher,
  generateUsernameFromName,
  manageStudentParentByTeacher
} from '@/lib/auth-utils';



import { Button } from '@/components/ui/button';



import { Input } from '@/components/ui/input';



import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';



import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';



import { Label } from '@/components/ui/label';



import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';



import { Search, Plus, Loader2, Eye, EyeOff } from 'lucide-react';



import { toast } from 'sonner';



import { useQueryClient } from '@tanstack/react-query';







type TeacherStudent = {



  id: string;



  full_name: string;



  admission_number: string | null;



  username: string;



  gender?: string | null;



  parent_phone?: string | null;



  classes?: {



    name?: string | null;



  } | null;



};







export default function TeacherStudents() {

  const queryClient = useQueryClient();







  const { data: assignments = [] } = useTeacherClassSubjects();



  const teacherClasses = Array.from(new Map(assignments.map((a: any) => [a.class_id, a.classes])).values());







  const [selectedClass, setSelectedClass] = useState<string>('');







  const { data: studentsData = [], isLoading: loadingStudents } = useStudents('teacher', selectedClass);



  const students = studentsData as TeacherStudent[];







  const [search, setSearch] = useState('');



  const [isDialogOpen, setIsDialogOpen] = useState(false);



  const [isCreating, setIsCreating] = useState(false);



  const [showPassword, setShowPassword] = useState(false);



  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  const [parentMode, setParentMode] = useState<'none' | 'existing' | 'new'>('none');
  const [newParentPassword, setNewParentPassword] = useState('Parent@12');
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [relationship, setRelationship] = useState<'Parent' | 'Father' | 'Mother' | 'Guardian'>('Parent');
  const [isPrimaryParent, setIsPrimaryParent] = useState(true);

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



  });







  const filteredStudents = useMemo(() => {



    if (!search) return students;







    const lower = search.toLowerCase();







    return students.filter((student) =>



      (student.full_name ?? '').toLowerCase().includes(lower) ||



      (student.admission_number ?? '').toLowerCase().includes(lower) ||



      (student.username ?? '').toLowerCase().includes(lower)



    );



  }, [students, search]);







  const handleOpenDialog = () => {



    setUsernameManuallyEdited(false);
    setParentMode('none');
    setNewParentPassword('Parent@12');
    setShowParentPassword(false);
    setRelationship('Parent');
    setIsPrimaryParent(true);

    setFormData({



      full_name: '', username: '', password: 'Student@12', admission_number: '', email: '', phone_number: '',



      gender: '', class_id: selectedClass || (teacherClasses[0] as any)?.id || '', tier: '', date_of_birth: '',



      parent_name: '', parent_phone: '', parent_email: ''



    });







    // Auto-set tier if class is pre-selected



    if (selectedClass || teacherClasses.length > 0) {



      const cId = selectedClass || (teacherClasses[0] as any)?.id;



      const cObj = teacherClasses.find((c: any) => c.id === cId) as any;



      if (cObj) {



        setFormData(prev => ({ ...prev, class_id: cId, tier: cObj.tier }));



      }



    }







    setShowPassword(false);



    setIsDialogOpen(true);



  };







  const handleClassChange = (classId: string) => {



    const selectedClassObj = teacherClasses.find((c: any) => c.id === classId) as any;



    setFormData(prev => ({ ...prev, class_id: classId, tier: selectedClassObj?.tier || prev.tier }));



  };







  const handleFullNameChange = (fullName: string) => {



    setFormData(prev => ({ ...prev, full_name: fullName }));



    // Auto-generate username only if not manually edited



    if (!usernameManuallyEdited) {



      const generatedUsername = generateUsernameFromName(fullName);



      if (generatedUsername) {



        setFormData(prev => ({ ...prev, username: generatedUsername }));



      }



    }



  };







  const handleUsernameChange = (username: string) => {



    setFormData(prev => ({ ...prev, username }));



    setUsernameManuallyEdited(true);



  };







  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class_id || !formData.tier) {
      toast.error('Please select a class');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (parentMode === 'existing' && !formData.parent_email.trim()) {
      toast.error('Enter the email address of the existing Parent account.');
      return;
    }

    if (parentMode === 'new') {
      if (!formData.parent_name.trim() || !formData.parent_email.trim()) {
        toast.error('Parent name and email are required.');
        return;
      }

      if (!newParentPassword || newParentPassword.length < 8) {
        toast.error('Parent password must be at least 8 characters.');
        return;
      }
    }

    setIsCreating(true);

    try {
      const submitData = {
        ...formData,
        admission_number: formData.admission_number?.trim() || '',
        parent_name: formData.parent_name.trim(),
        parent_phone: formData.parent_phone.trim(),
        parent_email: formData.parent_email.trim().toLowerCase()
      };

      const {
        data: createdStudent,
        error: createError
      } = await createStudentByTeacher({
        ...submitData,
        password: formData.password
      });

      if (createError) throw createError;

      const studentId = createdStudent?.student_id as string | undefined;

      if (parentMode !== 'none') {
        if (!studentId) {
          throw new Error('Student was created, but the new Student ID was not returned for Parent linking.');
        }

        const {
          data: parentResult,
          error: parentError
        } = await manageStudentParentByTeacher({
          action: parentMode === 'existing' ? 'link_existing' : 'create_or_reuse',
          student_id: studentId,
          email: formData.parent_email.trim().toLowerCase(),
          full_name: parentMode === 'new' ? formData.parent_name.trim() : undefined,
          password: parentMode === 'new' ? newParentPassword : undefined,
          phone_number: parentMode === 'new' ? formData.parent_phone.trim() : undefined,
          relationship,
          is_primary: isPrimaryParent
        });

        if (parentError) {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setIsDialogOpen(false);

          toast.error(
            `Student created successfully, but Parent setup failed: ${parentError.message}`,
            { duration: 12000 }
          );
          return;
        }

        if (parentResult?.reused_existing_parent) {
          toast.success('Student created and existing Parent account linked successfully.');
        } else {
          toast.success('Student and Parent account created and linked successfully.');
        }
      } else {
        toast.success('Student created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create student');
    } finally {
      setIsCreating(false);
    }
  };





  return (



    <CustomSessionGuard role="teacher">



      <DashboardLayout role="teacher">



        <PageHeader 



          title="Student Roster" 



          actions={



            <Button onClick={handleOpenDialog} className="bg-navy-700 hover:bg-navy-800 text-white shadow-sm">



              <Plus className="w-4 h-4 mr-2" />



              Register New Student



            </Button>



          }



        />







        <div className="bg-card rounded-xl border border-border shadow-sm mb-6 p-4">



          <div className="flex flex-col sm:flex-row gap-4">



            <div className="space-y-2 w-full sm:w-64">



              <Label>Filter by Class</Label>



              <Select value={selectedClass} onValueChange={setSelectedClass}>



                <SelectTrigger><SelectValue placeholder="All My Classes" /></SelectTrigger>



                <SelectContent>



                  <SelectItem value="all_classes">All My Classes</SelectItem>



                  {teacherClasses.map((c: any) => (



                    <SelectItem key={c.name} value={assignments.find((a: any) => a.classes?.name === c.name)?.class_id!}>



                      {c.name}



                    </SelectItem>



                  ))}



                </SelectContent>



              </Select>



            </div>



            <div className="space-y-2 flex-1 relative flex flex-col justify-end">



              <div className="relative">



                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />



                <Input 



                  placeholder="Search by name, username, or admission number..." 



                  className="pl-9 h-10"



                  value={search}



                  onChange={e => setSearch(e.target.value)}



                />



              </div>



            </div>



          </div>



        </div>







        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-[calc(100vh-18rem)] min-h-[400px]">



          <div className="flex-1 overflow-auto">



            {loadingStudents ? (



              <div className="flex items-center justify-center h-full">



                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />



              </div>



            ) : (



              <Table>



                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-[0_1px_0_0_var(--color-border)]">



                  <TableRow>



                    <TableHead className="w-12">S/N</TableHead>



                    <TableHead>Admission #</TableHead>



                    <TableHead>Name</TableHead>



                    <TableHead>Username</TableHead>



                    <TableHead>Class</TableHead>



                    <TableHead>Gender</TableHead>



                    <TableHead>Parent Phone</TableHead>



                  </TableRow>



                </TableHeader>



                <TableBody>



                  {filteredStudents.length === 0 ? (



                    <TableRow>



                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">



                        {selectedClass ? 'No students found in this class.' : 'No students found. Try selecting a class.'}



                      </TableCell>



                    </TableRow>



                  ) : (



                    filteredStudents.map((student, index) => (



                      <TableRow key={student.id}>



                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>



                        <TableCell className="font-medium font-mono text-xs text-navy-700 dark:text-navy-300">{student.admission_number}</TableCell>



                        <TableCell className="font-medium text-foreground">{student.full_name}</TableCell>



                        <TableCell className="text-muted-foreground">{student.username}</TableCell>



                        <TableCell>



                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-border">



                            {student.classes?.name || '-'}



                          </span>



                        </TableCell>



                        <TableCell>{student.gender || '-'}</TableCell>



                        <TableCell className="text-muted-foreground">{student.parent_phone || '-'}</TableCell>



                      </TableRow>



                    ))



                  )}



                </TableBody>



              </Table>



            )}



          </div>



        </div>







        {/* Teacher's constrained "Create Student" dialog */}



        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>



          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">



            <DialogHeader>



              <DialogTitle>Register New Student</DialogTitle>



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



                  <Label htmlFor="password">Initial Password *</Label>



                  <div className="relative">



                    <Input id="password" type={showPassword ? "text" : "password"} required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="pr-10" />



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



                  <Label>Class (Must be a class you teach) *</Label>



                  <Select required value={formData.class_id} onValueChange={handleClassChange}>



                    <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>



                    <SelectContent>



                      {teacherClasses.map((c: any) => (



                        <SelectItem key={c.name} value={assignments.find((a: any) => a.classes?.name === c.name)?.class_id!}>



                          {c.name}



                        </SelectItem>



                      ))}



                    </SelectContent>



                  </Select>



                </div>



                <div className="space-y-2">



                  <Label htmlFor="date_of_birth">Date of Birth</Label>



                  <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />



                </div>



              </div>







              <div className="border-t border-border pt-4">
                <h3 className="font-heading font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
                  Parent / Guardian Account
                </h3>

                <div className="space-y-2 mb-4">
                  <Label>Parent setup</Label>
                  <Select
                    value={parentMode}
                    onValueChange={(value: 'none' | 'existing' | 'new') => {
                      setParentMode(value);
                      setRelationship('Parent');
                      setIsPrimaryParent(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose parent setup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent account / keep contact details</SelectItem>
                      <SelectItem value="existing">Link an existing Parent by email</SelectItem>
                      <SelectItem value="new">Create or reuse Parent by email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {parentMode === 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_name">Parent Name</Label>
                      <Input
                        id="parent_name"
                        value={formData.parent_name}
                        onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parent_phone">Parent Phone</Label>
                      <Input
                        id="parent_phone"
                        value={formData.parent_phone}
                        onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="parent_email">Parent Email</Label>
                      <Input
                        id="parent_email"
                        type="email"
                        value={formData.parent_email}
                        onChange={e => setFormData({ ...formData, parent_email: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {parentMode === 'existing' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="existing_parent_email">Existing Parent Email *</Label>
                      <Input
                        id="existing_parent_email"
                        type="email"
                        required
                        placeholder="parent@example.com"
                        value={formData.parent_email}
                        onChange={e => setFormData({ ...formData, parent_email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        For privacy, Teachers link an existing Parent using the exact email address instead of browsing the full Parent directory.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Select value={relationship} onValueChange={(value: 'Parent' | 'Father' | 'Mother' | 'Guardian') => setRelationship(value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Parent">Parent</SelectItem>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Guardian">Guardian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <label className="flex items-center gap-3 self-end rounded-md border border-border px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={isPrimaryParent}
                          onChange={e => setIsPrimaryParent(e.target.checked)}
                        />
                        Primary contact
                      </label>
                    </div>
                  </div>
                )}

                {parentMode === 'new' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new_parent_name">Parent Name *</Label>
                        <Input
                          id="new_parent_name"
                          required
                          value={formData.parent_name}
                          onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new_parent_phone">Parent Phone</Label>
                        <Input
                          id="new_parent_phone"
                          value={formData.parent_phone}
                          onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new_parent_email">Parent Email *</Label>
                        <Input
                          id="new_parent_email"
                          type="email"
                          required
                          value={formData.parent_email}
                          onChange={e => setFormData({ ...formData, parent_email: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new_parent_password">Initial Parent Password *</Label>
                        <div className="relative">
                          <Input
                            id="new_parent_password"
                            type={showParentPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={newParentPassword}
                            onChange={e => setNewParentPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowParentPassword(!showParentPassword)}
                            title={showParentPassword ? 'Hide Password' : 'Show Password'}
                          >
                            {showParentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Select value={relationship} onValueChange={(value: 'Parent' | 'Father' | 'Mother' | 'Guardian') => setRelationship(value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Parent">Parent</SelectItem>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Guardian">Guardian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <label className="flex items-center gap-3 self-end rounded-md border border-border px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={isPrimaryParent}
                          onChange={e => setIsPrimaryParent(e.target.checked)}
                        />
                        Primary contact
                      </label>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      If this email already belongs to a Parent profile, that existing Parent will be reused instead of creating a duplicate account.
                    </p>
                  </div>
                )}
              </div>





              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">



                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>



                <Button type="submit" className="bg-navy-700 hover:bg-navy-800 text-white" disabled={isCreating}>



                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}



                  Register Student



                </Button>



              </div>



            </form>



          </DialogContent>



        </Dialog>



      </DashboardLayout>



    </CustomSessionGuard>



  );



}
