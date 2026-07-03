import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ricostruzione di __dirname per ambiente ES Modules (Vite/Node)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');

// 1. Assicuriamoci che la cartella src/ e src/components/ esistano
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

// 2. Mappa dei file da generare con sintassi TypeScript rigorosa (verbatimModuleSyntax compatibile)
const files = {
  // === FILE 1: src/types.ts ===
  [path.join(srcDir, 'types.ts')]: `export type JsonRow = Record<string, any>;

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'mixed';
  nullCount: number;
  nullPercentage: number;
  uniqueValuesCount: number;
  completeness: number;
}

export interface DatasetStats {
  totalRows: number;
  totalColumns: number;
  columnDetails: Record<string, ColumnInfo>;
}

// Funzione di flattening ricorsivo dei nodi complessi
export function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = prefix ? prefix + '.' + key : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, propName));
      } else {
        flattened[propName] = value;
      }
    }
  }

  return flattened;
}

// Funzione di analisi statistica dello schema del dataset
export function analyzeDataset(rows: JsonRow[], headers: string[]): DatasetStats {
  const totalRows = rows.length;
  const columnDetails: Record<string, ColumnInfo> = {};

  headers.forEach(header => {
    const typesPresent = new Set<string>();
    const uniqueValues = new Set<any>();
    let nullCount = 0;

    rows.forEach(row => {
      const value = row[header];
      if (value === null || value === undefined || value === '') {
        nullCount++;
      } else {
        typesPresent.add(typeof value);
        if (typeof value !== 'object') {
          uniqueValues.add(value);
        }
      }
    });

    let inferredType: ColumnInfo['type'] = 'string';
    if (typesPresent.size > 1) {
      inferredType = 'mixed';
    } else if (typesPresent.has('number')) {
      inferredType = 'number';
    } else if (typesPresent.has('boolean')) {
      inferredType = 'boolean';
    } else if (typesPresent.has('object')) {
      inferredType = 'object';
    }

    const completeness = Math.round(((totalRows - nullCount) / totalRows) * 100);

    columnDetails[header] = {
      name: header,
      type: inferredType,
      nullCount,
      nullPercentage: Math.round((nullCount / totalRows) * 100),
      uniqueValuesCount: uniqueValues.size,
      completeness
    };
  });

  return {
    totalRows,
    totalColumns: headers.length,
    columnDetails
  };
}
`,

  // === FILE 2: src/components/PrivacyBadge.tsx ===
  [path.join(componentsDir, 'PrivacyBadge.tsx')]: `import { Shield } from 'lucide-react';

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
`,

  // === FILE 3: src/components/StatsPanel.tsx ===
  [path.join(componentsDir, 'StatsPanel.tsx')]: `import { BarChart3 } from 'lucide-react';
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
`,

  // === FILE 4: src/components/JsonEditor.tsx ===
  [path.join(componentsDir, 'JsonEditor.tsx')]: `import { FileJson, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
`,

  // === FILE 5: src/components/DataTable.tsx ===
  [path.join(componentsDir, 'DataTable.tsx')]: `import { ArrowUpDown, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { JsonRow } from '../types'; // IMPORT RIGOROSO DI TIPO PER VERBATIMMODULESYNTAX

interface DataCellProps {
  value: any;
  rowId: string | number;
  colName: string;
  expandedRows: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  isDark: boolean;
}

export function DataCell({ value, rowId, colName, expandedRows, onToggleExpand, isDark }: DataCellProps) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 italic font-mono text-xs">null</span>;
  }
  
  if (Array.isArray(value)) {
    const isSimpleArray = value.every(item => typeof item !== 'object');
    if (isSimpleArray) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <span key={idx} className={"px-2 py-0.5 text-[10px] font-medium rounded-md border " + (
              isDark 
                ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" 
                : "bg-indigo-50 text-indigo-700 border-indigo-100"
            )}>
              {item.toString()}
            </span>
          ))}
        </div>
      );
    }
  }
  
  if (typeof value === 'object') {
    const cellKey = rowId + '-' + colName;
    const isExpanded = !!expandedRows[cellKey];
    const summary = Array.isArray(value) ? 'Array[' + value.length + ']' : 'Object{' + Object.keys(value).length + '}';

    return (
      <div className="flex flex-col gap-1 items-start">
        <button 
          onClick={() => onToggleExpand(cellKey)}
          className={"flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-all border cursor-pointer " + (
            isDark 
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60" 
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
          )}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {summary}
        </button>
        {isExpanded && (
          <pre className={"mt-1 p-2 rounded-lg text-[10px] font-mono overflow-x-auto max-w-[280px] max-h-[150px] shadow-inner " + (
            isDark 
              ? "bg-slate-950 border border-slate-800 text-slate-400" 
              : "bg-slate-100 border border-slate-200 text-slate-600"
          )}>
            {JSON.stringify(value, null, 2)}
          </pre>
        )}
      </div>
    );
  }
  
  if (typeof value === 'boolean') {
    return (
      <span className={"inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border " + (
        value 
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
      )}>
        <span className={"w-1.5 h-1.5 rounded-full " + (value ? "bg-emerald-500" : "bg-rose-500")}></span>
        {value ? 'True' : 'False'}
      </span>
    );
  }
  
  return <span className={"font-medium font-sans " + (isDark ? "text-slate-300" : "text-slate-800")}>{value.toString()}</span>;
}

interface DataTableProps {
  parsedData: JsonRow[] | null;
  columns: string[];
  paginatedData: JsonRow[];
  sortConfig: { key: string | null; direction: 'asc' | 'desc' };
  requestSort: (key: string) => void;
  expandedRows: Record<string, boolean>;
  toggleRowExpand: (key: string) => void;
  isDark: boolean;
}

export function DataTable({
  parsedData,
  columns,
  paginatedData,
  sortConfig,
  requestSort,
  expandedRows,
  toggleRowExpand,
  isDark
}: DataTableProps) {
  if (!parsedData) {
    return null;
  }

  return (
    <table className="w-full min-w-[600px] border-collapse text-left text-xs">
      <thead>
        <tr className={"sticky top-0 z-10 border-b " + (isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200")}>
          {columns.map(col => {
            const isSorted = sortConfig.key === col;
            return (
              <th 
                key={col}
                onClick={() => requestSort(col)}
                className={"px-4 py-3 font-semibold tracking-wider cursor-pointer select-none transition-colors " + (
                  isDark ? "text-slate-400 hover:text-indigo-400" : "text-slate-600 hover:text-indigo-600"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col}</span>
                  <span className="text-[10px]">
                    {isSorted ? (
                      sortConfig.direction === 'asc' ? '▲' : '▼'
                    ) : (
                      <ArrowUpDown size={10} className="opacity-40" />
                    )}
                  </span>
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className={"divide-y " + (isDark ? "divide-slate-900" : "divide-slate-200")}>
        {paginatedData.length > 0 ? (
          paginatedData.map((row, rowIdx) => (
            <tr 
              key={row.id || rowIdx} 
              className={"transition-colors " + (isDark ? "hover:bg-slate-900/40" : "hover:bg-slate-100/60")}
            >
              {columns.map(col => (
                <td key={col} className="px-4 py-3.5">
                  <DataCell 
                    value={row[col]} 
                    rowId={row.id || rowIdx} 
                    colName={col} 
                    expandedRows={expandedRows} 
                    onToggleExpand={toggleRowExpand}
                    isDark={isDark}
                  />
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="px-4 py-16 text-center">
              <Trash2 size={32} className={"mx-auto mb-2 " + (isDark ? "text-slate-800" : "text-slate-300")} />
              <p className={"font-semibold " + (isDark ? "text-slate-500" : "text-slate-400")}>Nessun record trovato con i parametri di ricerca.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
`,

  // === FILE 6: src/App.tsx ===
  [path.join(srcDir, 'App.tsx')]: `import { useState, useMemo } from 'react';
import { 
  type JsonRow, 
  type DatasetStats, 
  flattenObject, 
  analyzeDataset 
} from './types'; // IMPORT RIGOROSO DI TIPO E FUNZIONE SEPARATI PER VERBATIMMODULESYNTAX

import { PrivacyBadge } from './components/PrivacyBadge';
import { StatsPanel } from './components/StatsPanel';
import { JsonEditor } from './components/JsonEditor';
import { DataTable } from './components/DataTable';
import { 
  Search, 
  Download, 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  Moon, 
  Sun,
  Database
} from 'lucide-react';

const DEMO_DATA: JsonRow[] = [
  { id: 1, name: "Igor Bellini", role: "Frontend Developer", active: true, balance: 1250.50, contact: { email: "igor@example.com", phone: "+39 333 123456" }, tags: ["React", "TypeScript", "Tailwind"] },
  { id: 2, name: "Sofia Rossi", role: "Product Designer", active: true, balance: 2100.00, contact: { email: "sofia@example.com" }, tags: ["UI/UX", "Figma"] },
  { id: 3, name: "Marco Verdi", role: "DevOps Engineer", active: false, balance: 980.00, contact: null, tags: ["Docker", "AWS", "Kubernetes"] },
  { id: 4, name: "Giulia Neri", role: "Data Scientist", active: true, balance: 3450.75, contact: { email: "giulia@example.com", phone: "+39 347 987654" }, tags: ["Python", "Pandas", "PyTorch"] }
];

export default function App() {
  const [jsonInput, setJsonInput] = useState<string>(() => JSON.stringify(DEMO_DATA, null, 2));
  const [parsedData, setParsedData] = useState<JsonRow[] | null>(DEMO_DATA);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isFlattenEnabled, setIsFlattenEnabled] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isDark, setIsDark] = useState(true);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJsonInput(value);
    if (!value.trim()) {
      setParsedData(null);
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      setParsedData(rows);
      setError(null);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLoadDemo = () => {
    const demoStr = JSON.stringify(DEMO_DATA, null, 2);
    setJsonInput(demoStr);
    setParsedData(DEMO_DATA);
    setError(null);
    setCurrentPage(1);
  };

  const handleFormat = () => {
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err: any) {
      setError("Errore formattazione: " + err.message);
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setParsedData(null);
    setError(null);
    setSearchQuery("");
    setExpandedRows({});
  };

  const processedData = useMemo(() => {
    if (!parsedData) return [];
    if (!isFlattenEnabled) return parsedData;
    return parsedData.map(row => flattenObject(row));
  }, [parsedData, isFlattenEnabled]);

  const columns = useMemo(() => {
    if (processedData.length === 0) return [];
    const headerSet = new Set<string>();
    processedData.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => headerSet.add(key));
      }
    });
    return Array.from(headerSet);
  }, [processedData]);

  const datasetStats = useMemo(() => {
    return analyzeDataset(processedData, columns);
  }, [processedData, columns]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return processedData;
    const query = searchQuery.toLowerCase();
    
    return processedData.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(query);
        }
        return val.toString().toLowerCase().includes(query);
      });
    });
  }, [processedData, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();
      
      return sortConfig.direction === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleRowExpand = (key: string) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportCSV = () => {
    if (processedData.length === 0) return;
    
    const headersLine = columns.join(',');
    const rowsLines = processedData.map(row => {
      return columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          return '"' + JSON.stringify(val).replace(/"/g, '""') + '"';
        }
        const str = val.toString();
        return str.includes(',') || str.includes('"') || str.includes('\\n') 
          ? '"' + str.replace(/"/g, '""') + '"'
          : str;
      }).join(',');
    });

    const csvContent = [headersLine, ...rowsLines].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tabularize_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={"min-h-screen flex flex-col transition-colors duration-300 " + (
      isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
    )}>
      <header className={"px-6 py-4 border-b flex justify-between items-center transition-colors " + (
        isDark ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
            <Database size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase flex items-center gap-1">
              tabularize-json <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-medium">v1.1</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Convertitore JSON Interattivo & Privacy-First</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PrivacyBadge isDark={isDark} />
          <button
            onClick={() => setIsDark(!isDark)}
            className={"p-2 rounded-lg border transition-all cursor-pointer " + (
              isDark 
                ? "bg-slate-800 border-slate-700/60 text-amber-400 hover:bg-slate-700" 
                : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 shadow-sm"
            )}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <section className={"lg:col-span-4 p-6 flex flex-col border-r transition-colors " + (
          isDark ? "border-slate-900 bg-slate-950" : "border-slate-200 bg-slate-50"
        )}>
          <JsonEditor 
            jsonInput={jsonInput}
            onChange={handleJsonChange}
            error={error}
            onLoadDemo={handleLoadDemo}
            onFormat={handleFormat}
            onClear={handleClear}
            isDark={isDark}
          />
        </section>

        <section className="lg:col-span-8 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtra tra i record e i nodi interni..."
                className={"w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-inner " + (
                  isDark 
                    ? "bg-slate-900/60 border-slate-800/80 text-slate-200 placeholder-slate-500" 
                    : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFlattenEnabled(!isFlattenEnabled)}
                className={"flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer transition-all active:scale-95 " + (
                  isFlattenEnabled
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                    : (isDark 
                        ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300" 
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm")
                )}
              >
                <SlidersHorizontal size={12} />
                <span>Deep Flatten</span>
              </button>

              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={"flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer transition-all active:scale-95 " + (
                  showAnalytics
                    ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400"
                    : (isDark 
                        ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400" 
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm")
                )}
              >
                {showAnalytics ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>Schema Profile</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={!parsedData || parsedData.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl transition-all shadow-sm shadow-indigo-600/10 active:scale-95 cursor-pointer"
              >
                <Download size={12} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {showAnalytics && parsedData && parsedData.length > 0 && (
            <StatsPanel stats={datasetStats} isDark={isDark} />
          )}

          <div className={"flex-1 rounded-xl border overflow-hidden shadow-sm transition-colors " + (
            isDark ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"
          )}>
            <div className="overflow-x-auto w-full">
              <DataTable 
                parsedData={parsedData}
                columns={columns}
                paginatedData={paginatedData}
                sortConfig={sortConfig}
                requestSort={handleSort}
                expandedRows={expandedRows}
                toggleRowExpand={handleToggleRowExpand}
                isDark={isDark}
              />
            </div>

            {parsedData && sortedData.length > 0 && (
              <div className={"px-4 py-3 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] font-medium transition-colors " + (
                isDark ? "border-slate-900 bg-slate-900/20 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
              )}>
                <div className="flex items-center gap-2">
                  <span>Record per pagina:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={"px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer " + (
                      isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                    )}
                  >
                    {[5, 10, 25, 50].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                  <span className="ml-2">
                    Mostrati {Math.min(sortedData.length, (currentPage - 1) * rowsPerPage + 1)}-{Math.min(sortedData.length, currentPage * rowsPerPage)} di {sortedData.length} record
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={"px-2 py-1 rounded border disabled:opacity-35 cursor-pointer " + (
                      isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={"px-2.5 py-1 rounded border disabled:opacity-35 cursor-pointer " + (
                      isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Indietro
                  </button>
                  <span className="px-3">Pagina {currentPage} di {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={"px-2.5 py-1 rounded border disabled:opacity-35 cursor-pointer " + (
                      isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Avanti
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={"px-2 py-1 rounded border disabled:opacity-35 cursor-pointer " + (
                      isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
`
};

console.log('📦 Avvio dello split automatico per "tabularize-json"...');

Object.entries(files).forEach(([filepath, content]) => {
  const relativePath = path.relative(__dirname, filepath);
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Creato con successo: ${relativePath}`);
  } catch (err) {
    console.error(`❌ Errore durante la creazione di ${relativePath}:`, err.message);
  }
});

console.log('\n🚀 Divisione completata con successo! Il tuo progetto è ora 100% modulare.');
console.log('💡 Avvia "npm run dev" nel tuo terminale per far partire l\'applicazione.');