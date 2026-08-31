import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  UserPlus,
  X,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { adminResetPassword } from '@/lib/auth-utils';
import { 
  useParents, 
  useCreateParent, 
  useUpdateParent, 
  useDeleteParent,
  useParentChildrenByAdmin,
  useAssignStudentToParent,
  useRemoveStudentFromParent
} from '@/hooks/use-parents';
import { useStudents } from '@/hooks/use-records';

export default function AdminParents() {
  const { data: parents = [], isLoading } = useParents();
  const { data: students = [] } = useStudents();
  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const deleteParent = useDeleteParent();
  const assignStudent = useAssignStudentToParent();
  const removeStudent = useRemoveStudentFromParent();

  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: 'Parent@12',
    phone_number: '',
    address: ''
  });
  const [assignData, setAssignData] = useState({
    student_id: '',
    relationship: 'Parent',
    is_primary: false
  });

  const { data: parentChildren = [] } = useParentChildrenByAdmin(selectedParent?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingParent) {
      await updateParent.mutateAsync({
        id: editingParent.id,
        ...formData,
        password: formData.password // Only update password if provided
      });
    } else {
      await createParent.mutateAsync(formData);
    }

    setFormData({ full_name: '', email: '', password: 'Parent@12', phone_number: '', address: '' });
    setShowPassword(false);
    setShowForm(false);
    setEditingParent(null);
  };

  const handleEdit = (parent: any) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.full_name,
      email: parent.email,
      password: '', // Leave blank when editing
      phone_number: parent.phone_number || '',
      address: parent.address || ''
    });
    setShowPassword(false);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this parent? This will also remove all student associations.')) {
      await deleteParent.mutateAsync(id);
    }
  };

  const handleResetPassword = async (parent: any) => {
    const result = await adminResetPassword('parent', parent.id, 'Parent@12');
    if (result.success) {
      toast.success(`Password reset for ${parent.full_name}. Default password: Parent@12`);
    } else {
      toast.error(result.error || 'Failed to reset password');
    }
  };

  const handleCancel = () => {
    setFormData({ full_name: '', email: '', password: 'Parent@12', phone_number: '', address: '' });
    setShowPassword(false);
    setShowForm(false);
    setEditingParent(null);
  };

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignData.student_id) {
      toast.error('Please select a student');
      return;
    }

    await assignStudent.mutateAsync({
      parent_id: selectedParent.id,
      ...assignData
    });

    setAssignData({ student_id: '', relationship: 'Parent', is_primary: false });
    setShowAssignModal(false);
  };

  const handleRemoveStudent = async (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this student from this parent?')) {
      await removeStudent.mutateAsync(assignmentId);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Parents Management" 
          subtitle="Create and manage parent accounts and student assignments." 
        />

        <Card className="card-premium border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editingParent ? 'Edit Parent' : 'Create New Parent'}
            </CardTitle>
            <CardDescription>
              {editingParent ? 'Update parent account details.' : 'Add a new parent to the system.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Parent
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="parent@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  {editingParent ? (
                    <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                      Password can only be reset using the Reset Password button.
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+234..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Home address"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createParent.isPending || updateParent.isPending}
                  >
                    {createParent.isPending || updateParent.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : editingParent ? (
                      <Edit className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingParent ? 'Update' : 'Create'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Parents
            </CardTitle>
            <CardDescription>
              View and manage all parent accounts in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : parents.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Users className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No parents registered yet</h3>
                <p className="text-muted-foreground">
                  Create your first parent account to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {parents.map((parent: any, index: number) => (
                  <div
                    key={parent.id}
                    className="card-premium border border-border rounded-2xl p-5 bg-gradient-to-br from-card to-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                          <h3 className="text-lg font-semibold">{parent.full_name}</h3>
                          {parent.is_active ? (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {parent.email}
                          </div>
                          {parent.phone_number && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-4 h-4" />
                              {parent.phone_number}
                            </div>
                          )}
                          {parent.address && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {parent.address}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedParent(parent);
                              setShowAssignModal(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign Students
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(parent)}
                          title="Edit Parent"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(parent)}
                          title="Reset Password to Default (Parent@123)"
                          className="hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600 text-amber-600"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(parent.id)}
                          disabled={deleteParent.isPending}
                          title="Delete Parent"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Student Modal */}
        {showAssignModal && selectedParent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Assign Student to {selectedParent.full_name}</CardTitle>
                <CardDescription>Select a student to assign to this parent.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Student *</Label>
                    <select
                      id="student"
                      value={assignData.student_id}
                      onChange={(e) => setAssignData({ ...assignData, student_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                      required
                    >
                      <option value="">Select a student</option>
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <select
                      id="relationship"
                      value={assignData.relationship}
                      onChange={(e) => setAssignData({ ...assignData, relationship: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                      required
                    >
                      <option value="Parent">Parent</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={assignData.is_primary}
                      onChange={(e) => setAssignData({ ...assignData, is_primary: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="is_primary">Primary Contact</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={assignStudent.isPending}>
                      {assignStudent.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      Assign
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowAssignModal(false);
                        setSelectedParent(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>

                {/* Show current students */}
                {parentChildren.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3">Currently Assigned Students</h4>
                    <div className="space-y-2">
                      {parentChildren.map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{assignment.students.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.relationship}
                              {assignment.is_primary && ' (Primary)'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStudent(assignment.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
