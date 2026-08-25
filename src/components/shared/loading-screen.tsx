import { motion } from 'framer-motion';
import { TISLogo } from './tis-logo';

export function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="mb-8"
      >
        <TISLogo size="lg" />
      </motion.div>
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
        />
        Loading...
      </div>
    </div>
  );
}
