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
      const { data: feePaymentsData, error: feePaymentsError } =
        await supabase.rpc('get_accountant_fee_payments');

      if (feePaymentsError) throw feePaymentsError;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const totalRevenue =
        feePaymentsData?.reduce(
          (sum: number, fp: any) => sum + Number(fp.amount),
          0
        ) || 0;

      let revenueThisSession = 0;

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('academic_sessions')
          .select('id')
          .eq('is_current', true)
          .maybeSingle();

        if (!sessionError && sessionData) {
          revenueThisSession =
            feePaymentsData
              ?.filter((fp: any) => fp.term_id === sessionData.id)
              .reduce(
                (sum: number, fp: any) => sum + Number(fp.amount),
                0
              ) || 0;
        }
      } catch (e) {
        console.warn('Failed to fetch current session:', e);
      }

      const revenueThisMonth =
        feePaymentsData
          ?.filter((fp: any) => new Date(fp.date_paid) >= startOfMonth)
          .reduce(
            (sum: number, fp: any) => sum + Number(fp.amount),
            0
          ) || 0;

      const revenueToday =
        feePaymentsData
          ?.filter((fp: any) => new Date(fp.date_paid) >= startOfDay)
          .reduce(
            (sum: number, fp: any) => sum + Number(fp.amount),
            0
          ) || 0;

      const { data: submissionsData, error: submissionsError } =
        await supabase.rpc('get_all_payment_submissions');

      if (submissionsError) throw submissionsError;

      const approvedPayments =
        submissionsData?.filter((s: any) => s.status === 'approved').length ||
        0;

      const pendingReviews =
        submissionsData?.filter((s: any) => s.status === 'pending').length ||
        0;

      const rejectedPayments =
        submissionsData?.filter((s: any) => s.status === 'rejected').length ||
        0;

      const totalTransactions = submissionsData?.length || 0;

      const pendingAmount =
        submissionsData
          ?.filter((s: any) => s.status === 'pending')
          .reduce(
            (sum: number, s: any) => sum + Number(s.amount),
            0
          ) || 0;

      const rejectedAmount =
        submissionsData
          ?.filter((s: any) => s.status === 'rejected')
          .reduce(
            (sum: number, s: any) => sum + Number(s.amount),
            0
          ) || 0;

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
    },
  });
};

export const useMonthlyRevenue = (year?: number) => {
  return useQuery({
    queryKey: ['monthlyRevenue', year],
    queryFn: async () => {
      const currentYear = year || new Date().getFullYear();

      const { data, error } = await supabase.rpc(
        'get_accountant_fee_payments'
      );

      if (error) throw error;

      const monthlyData: MonthlyRevenue[] = Array.from(
        { length: 12 },
        (_, i) => ({
          month: new Date(currentYear, i).toLocaleString('default', {
            month: 'short',
          }),
          year: currentYear,
          revenue: 0,
        })
      );

      data?.forEach((fp: any) => {
        const date = new Date(fp.date_paid);

        if (date.getFullYear() === currentYear) {
          monthlyData[date.getMonth()].revenue += Number(fp.amount);
        }
      });

      return monthlyData;
    },
  });
};

export const usePaymentMethodBreakdown = () => {
  return useQuery({
    queryKey: ['paymentMethodBreakdown'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_all_payment_submissions'
      );

      if (error) throw error;

      const breakdown: Record<
        string,
        { count: number; amount: number }
      > = {};

      data?.forEach((submission: any) => {
        const method = submission.payment_method || 'unknown';

        if (!breakdown[method]) {
          breakdown[method] = {
            count: 0,
            amount: 0,
          };
        }

        breakdown[method].count += 1;
        breakdown[method].amount += Number(submission.amount);
      });

      return Object.entries(breakdown).map(([method, item]) => ({
        method,
        count: item.count,
        amount: item.amount,
      })) as PaymentMethodBreakdown[];
    },
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

      const { data: feePayments, error: feePaymentsError } =
        await supabase.rpc('get_accountant_fee_payments');

      if (feePaymentsError) throw feePaymentsError;

      const sessionRevenue: SessionRevenue[] = [];

      for (const session of sessions || []) {
        const revenue =
          feePayments
            ?.filter((fp: any) => fp.term_id === session.id)
            .reduce(
              (sum: number, fp: any) => sum + Number(fp.amount),
              0
            ) || 0;

        sessionRevenue.push({
          sessionId: session.id,
          sessionName: session.name,
          revenue,
        });
      }

      return sessionRevenue.sort((a, b) => b.revenue - a.revenue);
    },
  });
};