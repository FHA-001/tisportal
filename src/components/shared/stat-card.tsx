import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  color?: 'primary' | 'gold' | 'green' | 'purple' | 'red';
  delay?: number;
}

export function StatCard({ icon: Icon, label, value, trend, color = 'primary', delay = 0 }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-navy-50 text-navy-600 dark:bg-navy-900/50 dark:text-navy-400',
    gold: 'bg-gold-50 text-gold-600 dark:bg-gold-900/50 dark:text-gold-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="p-5 overflow-hidden relative group hover:shadow-lg transition-all duration-300 border-border/50 dark:border-border">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${colorClasses[color]} transition-colors`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">
              {trend}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-3xl font-heading font-bold text-foreground">{value}</h3>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
        <div className="absolute -bottom-4 -right-4 opacity-8 group-hover:opacity-12 transition-opacity pointer-events-none transform group-hover:scale-110 duration-500">
          <Icon className="w-32 h-32" />
        </div>
      </Card>
    </motion.div>
  );
}
