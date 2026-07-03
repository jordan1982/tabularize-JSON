import { useState, useMemo } from 'react';
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
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? '"' + str.replace(/"/g, '""') + '"'
          : str;
      }).join(',');
    });

    const csvContent = [headersLine, ...rowsLines].join('\n');
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
