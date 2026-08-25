import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useNewsletters = () => {
  return useQuery({
    queryKey: ['newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
};

export const useAllNewsletters = () => {
  return useQuery({
    queryKey: ['allNewsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
};

export const useUploadNewsletter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title, publishedBy }: { file: File; title: string; publishedBy: string }) => {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `newsletters/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('newsletters')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('newsletters')
        .getPublicUrl(filePath);

      // Insert newsletter record
      const { data, error } = await supabase
        .from('newsletters')
        .insert({
          title,
          pdf_url: publicUrl,
          pdf_file_name: file.name,
          published_by: publishedBy,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNewsletters'] });
      toast.success('Newsletter uploaded successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const usePublishNewsletter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('newsletters')
        .update({ 
          is_published: true, 
          published_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNewsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter published successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useUnpublishNewsletter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('newsletters')
        .update({ 
          is_published: false, 
          published_at: null 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNewsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter unpublished successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};

export const useDeleteNewsletter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // First get the newsletter to get the file path
      const { data: newsletter } = await supabase
        .from('newsletters')
        .select('pdf_url')
        .eq('id', id)
        .single();

      if (newsletter) {
        // Extract file path from URL
        const urlParts = newsletter.pdf_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `newsletters/${fileName}`;

        // Delete from storage
        await supabase.storage
          .from('newsletters')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('newsletters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNewsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter deleted successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });
};
