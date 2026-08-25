import { SCHOOL_CONFIG } from '@/lib/app-config';

export function TISLogo({ size = 'md', showText = false }: { size?: 'sm' | 'md' | 'lg'; showText?: boolean }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex items-center gap-3">
      {SCHOOL_CONFIG.logoUrl ? (
        <img
          src={SCHOOL_CONFIG.logoUrl}
          alt={SCHOOL_CONFIG.name}
          className={`${sizeClasses[size]} rounded-lg object-cover bg-white`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center text-white text-xl shadow-lg border border-navy-600`}>
          🔱
        </div>
      )}
      {showText && (
        <div className="flex flex-col">
          <span className="font-heading font-bold text-lg leading-tight tracking-tight">Triton International</span>
          <span className="text-xs font-medium opacity-80">School Management</span>
        </div>
      )}
    </div>
  );
}
