import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '@/hooks/use-announcements';
import { getCustomSession } from '@/lib/auth-utils';
import { Megaphone, Plus, Pencil, Trash2, Loader2, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAnnouncements() {
  const session = getCustomSession();
  const { data: announcements = [], isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'general',
    target_audience: 'all',
    priority: 'normal',
    expires_at: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    const announcementData = {
      title: formData.title,
      content: formData.content,
      announcement_type: formData.announcement_type,
      target_audience: formData.target_audience,
      priority: formData.priority,
      ...(formData.expires_at ? { expires_at: formData.expires_at } : {})
    };

    if (editingId) {
      await updateAnnouncement.mutateAsync({ id: editingId, ...announcementData });
    } else {
      await createAnnouncement.mutateAsync(announcementData);
    }

    setFormData({
      title: '',
      content: '',
      announcement_type: 'general',
      target_audience: 'all',
      priority: 'normal',
      expires_at: ''
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      announcement_type: announcement.announcement_type,
      target_audience: announcement.target_audience,
      priority: announcement.priority,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      announcement_type: 'general',
      target_audience: 'all',
      priority: 'normal',
      expires_at: ''
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'exam': return <Clock className="w-4 h-4" />;
      default: return <Megaphone className="w-4 h-4" />;
    }
  };

  const isExpired = (expiresAt: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <DashboardLayout role="admin">
      <PageHeader 
        title="Announcements" 
        subtitle="Create and manage school announcements for students, parents, and staff." 
      />

        <Card className="card-premium border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Manage Announcements
                </CardTitle>
                <CardDescription>
                  {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showForm && (
              <div className="border border-border rounded-lg p-6 bg-muted/30">
                <h3 className="font-semibold mb-4">
                  {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Announcement title"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Announcement content"
                        rows={4}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.announcement_type}
                        onValueChange={(value) => setFormData({ ...formData, announcement_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="exam">Exam</SelectItem>
                          <SelectItem value="holiday">Holiday</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audience">Target Audience</Label>
                      <Select
                        value={formData.target_audience}
                        onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="students">Students Only</SelectItem>
                          <SelectItem value="teachers">Teachers Only</SelectItem>
                          <SelectItem value="parents">Parents Only</SelectItem>
                          <SelectItem value="admin">Admin Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires">Expiration Date (Optional)</Label>
                      <Input
                        id="expires"
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createAnnouncement.isPending || updateAnnouncement.isPending}>
                      {createAnnouncement.isPending || updateAnnouncement.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {editingId ? 'Update' : 'Publish'} Announcement
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Megaphone className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
                <p className="text-muted-foreground">
                  Create your first announcement to keep everyone informed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement: any, index: number) => {
                  const expired = isExpired(announcement.expires_at);
                  return (
                    <div
                      key={announcement.id}
                      className={`p-5 rounded-lg border ${
                        expired ? 'opacity-60 bg-muted/30' : 'bg-gradient-to-br from-card to-muted/30'
                      } ${!announcement.is_active ? 'border-dashed' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                              {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                              {announcement.target_audience.charAt(0).toUpperCase() + announcement.target_audience.slice(1)}
                            </span>
                            {expired && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                                Expired
                              </span>
                            )}
                            {!announcement.is_active && (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                                Inactive
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{announcement.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {getTypeIcon(announcement.announcement_type)}
                              {announcement.announcement_type.charAt(0).toUpperCase() + announcement.announcement_type.slice(1)}
                            </span>
                            <span>•</span>
                            <span>{new Date(announcement.published_at).toLocaleDateString()}</span>
                            {announcement.expires_at && (
                              <>
                                <span>•</span>
                                <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(announcement)}
                            title="Edit Announcement"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(announcement.id)}
                            disabled={deleteAnnouncement.isPending}
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Published by {announcement.admins?.full_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
  );
}
