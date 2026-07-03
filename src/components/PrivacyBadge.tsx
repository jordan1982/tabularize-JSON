import { Shield } from 'lucide-react';

interface PrivacyBadgeProps {
  isDark: boolean;
}

export function PrivacyBadge({ isDark }: PrivacyBadgeProps) {
  return (
    <div className={"flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-all duration-300 " + (
      isDark 
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
        : "bg-emerald-50 border-emerald-200 text-emerald-700"
    )}>
      <Shield size={14} className="animate-pulse" />
      <span>Elaborazione 100% Client-Side. Nessun dato lascia il browser.</span>
    </div>
  );
}
