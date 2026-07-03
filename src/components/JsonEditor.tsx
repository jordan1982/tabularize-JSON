import { FileJson, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface JsonEditorProps {
  jsonInput: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onLoadDemo: () => void;
  onFormat: () => void;
  onClear: () => void;
  error: string | null;
  isDark: boolean;
}

export function JsonEditor({ jsonInput, onChange, onLoadDemo, onFormat, onClear, error, isDark }: JsonEditorProps) {
  return (
    <div className={"flex flex-col h-full border rounded-2xl p-5 shadow-sm " + (
      isDark ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-200"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileJson size={18} className="text-indigo-500" />
          <h2 className={"font-bold text-sm " + (isDark ? "text-slate-200" : "text-slate-800")}>Sorgente JSON</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={onLoadDemo} 
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 transition-all duration-200 cursor-pointer"
          >
            Demo
          </button>
          <button 
            onClick={onFormat} 
            className={"px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer " + (
              isDark 
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            )}
          >
            Formatta
          </button>
          <button 
            onClick={onClear} 
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all duration-200 cursor-pointer"
          >
            Svuota
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col relative min-h-[250px] lg:min-h-0">
        <textarea
          value={jsonInput}
          onChange={onChange}
          placeholder="Incolla qui il tuo array JSON..."
          className={"w-full h-full flex-grow p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono text-xs leading-relaxed resize-none shadow-inner transition-all duration-300 " + (
            isDark 
              ? "bg-slate-950/80 border-slate-900 text-slate-300" 
              : "bg-slate-50 border-slate-200 text-slate-800"
          )}
        />
      </div>

      <div className="mt-4 flex-shrink-0">
        {error ? (
          <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex gap-2 items-start shadow-sm">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-rose-500" />
            <span className="break-all font-mono font-medium">{error}</span>
          </div>
        ) : (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs flex gap-2 items-center shadow-sm">
            <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-500" />
            <span className="font-semibold">Sintassi JSON valida, nessun dato inviato esternamente.</span>
          </div>
        )}
      </div>
    </div>
  );
}
