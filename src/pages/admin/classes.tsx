import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useClasses, useCreateClass, useUpdateClass, useDeleteClass } from '@/hooks/use-academics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Loader2, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminClasses() {
  const { data: classes = [], isLoading } = useClasses();
  
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    tier: '',
    level: 1,
    section: '',
    admission_prefix: ''
  });

  const handleOpenDialog = (classItem?: any) => {
    if (classItem) {
      setEditingId(classItem.id);
      setFormData({
        name: classItem.name,
        tier: classItem.tier,
        level: classItem.level || 1,
        section: classItem.section || '',
        admission_prefix: classItem.admission_prefix || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', tier: '', level: 1, section: '', admission_prefix: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-generate prefix based on tier if not provided
    const payload = { ...formData };
    if (!payload.admission_prefix && payload.tier) {
      const map: Record<string, string> = { 'Primary': 'PRI', 'Junior Secondary': 'JSS', 'Senior Secondary': 'SSS' };
      payload.admission_prefix = map[payload.tier] || 'STU';
    }

    if (editingId) {
      await updateClass.mutateAsync({ id: editingId, data: payload });
    } else {
      await createClass.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Manage Classes" 
          actions={
            <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          }
        />

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[400px]">
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12">S/N</TableHead>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No classes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classes.map((c, index) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-heading font-medium text-navy-700 dark:text-navy-300">{c.name}</TableCell>
                        <TableCell>{c.tier}</TableCell>
                        <TableCell>{c.section || '-'}</TableCell>
                        <TableCell>{c.level}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{c.students?.[0]?.count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(c)} title="Edit Class">
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50" title="Delete Class">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Class</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {c.name}? You cannot delete a class that has active students assigned to it.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => deleteClass.mutate(c.id)}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Class' : 'Add New Class'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. JSS 1A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Tier *</Label>
                <Select required value={formData.tier} onValueChange={v => setFormData({...formData, tier: v})}>
                  <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Junior Secondary">Junior Secondary</SelectItem>
                    <SelectItem value="Senior Secondary">Senior Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level Number</Label>
                  <Input id="level" type="number" min="1" value={formData.level} onChange={e => setFormData({...formData, level: parseInt(e.target.value) || 1})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Input id="section" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} placeholder="e.g. A, B, Science" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={createClass.isPending || updateClass.isPending}>
                  {(createClass.isPending || updateClass.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Class'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
