import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useAnnouncements = (filters?: { target_audience?: string; is_active?: boolean }) => {
  return useQuery({
    queryKey: ['announcements', filters],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });
      
      if (filters?.target_audience) query = query.eq('target_audience', filters.target_audience);
      if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
};

export const usePublicAnnouncements = () => {
  return useQuery({
    queryKey: ['publicAnnouncements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          admins (full_name)
        `)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useStudentAnnouncements = () => {
  return useQuery({
    queryKey: ['studentAnnouncements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('target_audience.eq.all,target_audience.eq.students')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useParentAnnouncements = () => {
  return useQuery({
    queryKey: ['parentAnnouncements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('target_audience.eq.all,target_audience.eq.parents')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useTeacherAnnouncements = () => {
  return useQuery({
    queryKey: ['teacherAnnouncements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .or('target_audience.eq.all,target_audience.eq.teachers')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcement: {
      title: string;
      content: string;
      announcement_type?: string;
      target_audience?: string;
      priority?: string;
      expires_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['publicAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['parentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['teacherAnnouncements'] });
      toast.success('Announcement created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...announcement }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(announcement)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['publicAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['parentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['teacherAnnouncements'] });
      toast.success('Announcement updated successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['publicAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['parentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['teacherAnnouncements'] });
      toast.success('Announcement deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};
