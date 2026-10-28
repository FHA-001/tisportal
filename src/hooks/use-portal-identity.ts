import { useQuery } from '@tanstack/react-query';
import { getPortalIdentity } from '@/lib/portal-auth';

export const usePortalIdentity = () => {
  return useQuery({
    queryKey: ['portalIdentity'],
    queryFn: getPortalIdentity,
    staleTime: 0, // Always refetch to ensure fresh identity data
    refetchOnWindowFocus: false,
  });
};
