import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, useDeactivateSubject, useReactivateSubject } from '@/hooks/use-academics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Loader2, BookOpen, Archive, RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminSubjects() {
  const { data: subjects = [], isLoading } = useSubjects();

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const deactivateSubject = useDeactivateSubject();
  const reactivateSubject = useReactivateSubject();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  const [formData, setFormData] = useState({
    name: '',
    code: ''
  });

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && s.is_active !== false) ||
      (statusFilter === 'archived' && s.is_active === false);

    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (subject?: any) => {
    if (subject) {
      setEditingId(subject.id);
      setFormData({
        name: subject.name,
        code: subject.code || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateSubject.mutateAsync({ id: editingId, data: formData });
    } else {
      await createSubject.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Manage Subjects" 
          actions={
            <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          }
        />

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[400px]">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <Input
              placeholder="Search subjects..."
              className="max-w-xs h-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'archived' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('archived')}
              >
                Archived
              </Button>
            </div>
          </div>
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
                    <TableHead className="w-[80px]">Icon</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No subjects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubjects.map((s, index) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center dark:bg-purple-900/30 dark:text-purple-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        </TableCell>
                        <TableCell className="font-heading font-medium text-foreground">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{s.code || '-'}</TableCell>
                        <TableCell>
                          {s.is_active === false ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(s)} title="Edit Subject">
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            {s.is_active === false ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => reactivateSubject.mutate(s.id)}
                                title="Reactivate Subject"
                                disabled={reactivateSubject.isPending}
                              >
                                <RotateCcw className="w-4 h-4 text-green-600" />
                              </Button>
                            ) : (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50" title="Delete Subject">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to permanently delete {s.name}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => deleteSubject.mutate(s.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deactivateSubject.mutate(s.id)}
                                  title="Deactivate Subject"
                                  disabled={deactivateSubject.isPending}
                                >
                                  <Archive className="w-4 h-4 text-orange-600" />
                                </Button>
                              </>
                            )}
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
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Subject Code</Label>
                <Input id="code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. MTH" className="font-mono" />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white border-0" disabled={createSubject.isPending || updateSubject.isPending}>
                  {(createSubject.isPending || updateSubject.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Subject'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
