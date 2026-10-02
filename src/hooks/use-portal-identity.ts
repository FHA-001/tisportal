import { useQuery } from '@tanstack/react-query';
import { getPortalIdentity, type PortalIdentity } from '@/lib/portal-auth';

export const usePortalIdentity = () => {
  return useQuery({
    queryKey: ['portalIdentity'],
    queryFn: getPortalIdentity,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
