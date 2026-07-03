import { BarChart3 } from 'lucide-react';
import type { DatasetStats } from '../types'; // IMPORT RIGOROSO DI TIPO PER VERBATIMMODULESYNTAX

interface StatsPanelProps {
  stats: DatasetStats;
  isDark: boolean;
}

export function StatsPanel({ stats, isDark }: StatsPanelProps) {
  return (
    <div className={"p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 " + (
      isDark 
        ? "border-indigo-500/10 bg-indigo-500/[0.02]" 
        : "border-indigo-100 bg-indigo-50/[0.3]"
    )}>
      <div className={"flex items-center justify-between mb-3 border-b pb-2 " + (isDark ? "border-slate-800" : "border-slate-100")}>
        <h3 className="text-xs font-bold tracking-wider text-indigo-500 uppercase flex items-center gap-2">
          <BarChart3 size={14} />
          Schema Inference & Statistiche Colonne
        </h3>
        <div className={"flex gap-4 text-[11px] font-semibold " + (isDark ? "text-slate-500" : "text-slate-400")}>
          <span>Righe totali: <strong className={isDark ? "text-slate-300" : "text-slate-700"}>{stats.totalRows}</strong></span>
          <span>Colonne rilevate: <strong className={isDark ? "text-slate-300" : "text-slate-700"}>{stats.totalColumns}</strong></span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[140px] overflow-y-auto pr-1">
        {Object.values(stats.columnDetails).map(col => {
          const typeColors = {
            number: isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200",
            string: isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200",
            boolean: isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200",
            object: isDark ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-700 border-violet-200",
            mixed: isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200"
          };
          return (
            <div key={col.name} className={"p-2.5 rounded-lg border flex flex-col justify-between shadow-sm " + (
              isDark ? "bg-slate-950/60 border-slate-900" : "bg-white border-slate-200"
            )}>
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <span className={"font-semibold text-xs truncate " + (isDark ? "text-slate-300" : "text-slate-700")} title={col.name}>
                  {col.name}
                </span>
                <span className={"text-[9px] px-1.5 py-0.5 rounded uppercase border font-bold " + (typeColors[col.type] || "")}>
                  {col.type}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Completezza</span>
                  <span className={"font-semibold " + (isDark ? "text-slate-300" : "text-slate-600")}>{col.completeness}%</span>
                </div>
                <div className={"w-full h-1 rounded-full overflow-hidden " + (isDark ? "bg-slate-900" : "bg-slate-100")}>
                  <div 
                    className={"h-full rounded-full " + (col.completeness === 100 ? "bg-emerald-500" : col.completeness > 50 ? "bg-indigo-500" : "bg-rose-500")} 
                    style={{ width: col.completeness + "%" }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                <span>Valori unici: <strong className={isDark ? "text-slate-300" : "text-slate-600"}>{col.uniqueValuesCount}</strong></span>
                {col.nullCount > 0 && <span className="text-rose-500 font-medium">Null: {col.nullPercentage}%</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
