import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface FinanceStats {
  totalRevenue: number;
  revenueThisSession: number;
  revenueThisMonth: number;
  revenueToday: number;
  approvedPayments: number;
  pendingReviews: number;
  rejectedPayments: number;
  totalTransactions: number;
  pendingAmount: number;
  rejectedAmount: number;
}

export interface MonthlyRevenue {
  month: string;
  year: number;
  revenue: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

export interface SessionRevenue {
  sessionId: string;
  sessionName: string;
  revenue: number;
}

export const useFinanceStats = () => {
  return useQuery({
    queryKey: ['financeStats'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Total revenue from fee_payments
      const { data: totalRevenueData, error: totalRevenueError } = await supabase
        .from('fee_payments')
        .select('amount');

      if (totalRevenueError) throw totalRevenueError;

      const totalRevenue = totalRevenueData?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;

      // Revenue this session (current academic session)
      let revenueThisSession = 0;
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('academic_sessions')
          .select('id')
          .eq('is_current', 'true')
          .maybeSingle();

        if (!sessionError && sessionData) {
          const { data: sessionRevenueData } = await supabase
            .from('fee_payments')
            .select('amount')
            .eq('term_id', sessionData.id);

          revenueThisSession = sessionRevenueData?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;
        }
      } catch (e) {
        // If session query fails, just skip session revenue
        console.warn('Failed to fetch current session:', e);
      }

      // Revenue this month
      const { data: monthlyRevenueData } = await supabase
        .from('fee_payments')
        .select('amount')
        .gte('date_paid', startOfMonth.toISOString());

      const revenueThisMonth = monthlyRevenueData?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;

      // Revenue today
      const { data: dailyRevenueData } = await supabase
        .from('fee_payments')
        .select('amount')
        .gte('date_paid', startOfDay.toISOString());

      const revenueToday = dailyRevenueData?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;

      // Payment counts and amounts
      const { data: submissionsData } = await supabase
        .from('payment_submissions')
        .select('status, amount');

      const approvedPayments = submissionsData?.filter(s => s.status === 'approved').length || 0;
      const pendingReviews = submissionsData?.filter(s => s.status === 'pending').length || 0;
      const rejectedPayments = submissionsData?.filter(s => s.status === 'rejected').length || 0;
      const totalTransactions = submissionsData?.length || 0;

      // Calculate actual pending and rejected amounts
      const pendingAmount = submissionsData
        ?.filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      const rejectedAmount = submissionsData
        ?.filter(s => s.status === 'rejected')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      return {
        totalRevenue,
        revenueThisSession,
        revenueThisMonth,
        revenueToday,
        approvedPayments,
        pendingReviews,
        rejectedPayments,
        totalTransactions,
        pendingAmount,
        rejectedAmount,
      } as FinanceStats;
    }
  });
};

export const useMonthlyRevenue = (year?: number) => {
  return useQuery({
    queryKey: ['monthlyRevenue', year],
    queryFn: async () => {
      const currentYear = year || new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear + 1, 0, 1);

      const { data, error } = await supabase
        .from('fee_payments')
        .select('date_paid, amount')
        .gte('date_paid', startDate.toISOString())
        .lt('date_paid', endDate.toISOString());

      if (error) throw error;

      const monthlyData: MonthlyRevenue[] = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
        year: currentYear,
        revenue: 0,
      }));

      data?.forEach((fp) => {
        const date = new Date(fp.date_paid);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyData[monthIndex].revenue += Number(fp.amount);
        }
      });

      return monthlyData;
    }
  });
};

export const usePaymentMethodBreakdown = () => {
  return useQuery({
    queryKey: ['paymentMethodBreakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select('payment_method, amount, status');

      if (error) throw error;

      const breakdown: Record<string, { count: number; amount: number }> = {};

      data?.forEach((submission) => {
        const method = submission.payment_method;
        if (!breakdown[method]) {
          breakdown[method] = { count: 0, amount: 0 };
        }
        breakdown[method].count += 1;
        breakdown[method].amount += Number(submission.amount);
      });

      return Object.entries(breakdown).map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
      })) as PaymentMethodBreakdown[];
    }
  });
};

export const useSessionRevenue = () => {
  return useQuery({
    queryKey: ['sessionRevenue'],
    queryFn: async () => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('academic_sessions')
        .select('id, name');

      if (sessionsError) throw sessionsError;

      const sessionRevenue: SessionRevenue[] = [];

      for (const session of sessions || []) {
        const { data: payments } = await supabase
          .from('fee_payments')
          .select('amount')
          .eq('term_id', session.id);

        const revenue = payments?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;

        sessionRevenue.push({
          sessionId: session.id,
          sessionName: session.name,
          revenue,
        });
      }

      return sessionRevenue.sort((a, b) => b.revenue - a.revenue);
    }
  });
};
