import { useState, useMemo, useEffect } from 'react';
import {
  type JsonRow,
  analyzeDataset,
  extractRows,
  findArrayOfObjectPaths,
  explodeArrayField,
  flattenDataset
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
  Database,
  GitBranch,
  PencilLine
} from 'lucide-react';

const DEMO_DATA: JsonRow[] = [
  { id: 1, name: "Igor Bellini", role: "Frontend Developer", active: true, balance: 1250.50, contact: { email: "igor@example.com", phone: "+39 333 123456" }, tags: ["React", "TypeScript", "Tailwind"] },
  { id: 2, name: "Sofia Rossi", role: "Product Designer", active: true, balance: 2100.00, contact: { email: "sofia@example.com" }, tags: ["UI/UX", "Figma"] },
  { id: 3, name: "Marco Verdi", role: "DevOps Engineer", active: false, balance: 980.00, contact: null, tags: ["Docker", "AWS", "Kubernetes"] },
  { id: 4, name: "Giulia Neri", role: "Data Scientist", active: true, balance: 3450.75, contact: { email: "giulia@example.com", phone: "+39 347 987654" }, tags: ["Python", "Pandas", "PyTorch"] }
];

// Chiave interna usata per assegnare un identificativo stabile a ogni riga.
// Non viene mai mostrata come colonna né esportata nel CSV.
const UID_KEY = '__uid';

export default function App() {
  const [jsonInput, setJsonInput] = useState<string>(() => JSON.stringify(DEMO_DATA, null, 2));
  const [parsedData, setParsedData] = useState<JsonRow[] | null>(DEMO_DATA);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(""); // valore immediato del campo di ricerca
  const [searchQuery, setSearchQuery] = useState("");  // valore "debounced" usato per filtrare
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isFlattenEnabled, setIsFlattenEnabled] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [explodeFieldPath, setExplodeFieldPath] = useState<string | null>(null);

  // Modifiche fatte a mano nella griglia: uid riga -> { nomeColonna: nuovoValore }
  const [cellEdits, setCellEdits] = useState<Record<number, Record<string, string>>>({});

  // Debounce della ricerca: aspetta che l'utente smetta di digitare per 250ms
  // prima di ricalcolare il filtro. Con dataset grandi (migliaia di righe)
  // filtrare a ogni singolo tasto premuto rallenta l'interfaccia.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(searchInput), 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const arrayPaths = useMemo(() => {
    if (!parsedData) return [];
    return findArrayOfObjectPaths(parsedData);
  }, [parsedData]);

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
      const rows = extractRows(parsed);
      setParsedData(rows);
      setError(null);
      setCurrentPage(1);
      setExplodeFieldPath(null);
      setCellEdits({});
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
    setExplodeFieldPath(null);
    setCellEdits({});
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
    setSearchInput("");
    setSearchQuery("");
    setExpandedRows({});
    setExplodeFieldPath(null);
    setCellEdits({});
  };

  // Applica esplosione + flatten, poi assegna un uid stabile a ogni riga.
  // L'uid viene assegnato DOPO l'esplosione (perché l'esplosione cambia il
  // numero di righe: ha senso che le modifiche non sopravvivano a quel
  // cambio strutturale) ma è indipendente dal Deep Flatten, quindi attivare
  // o disattivare il flatten non fa perdere le modifiche già fatte.
  const processedData = useMemo(() => {
    if (!parsedData) return [];
    let data = parsedData;
    if (explodeFieldPath) {
      data = explodeArrayField(data, explodeFieldPath);
    }
    data = data.map((row, idx) => ({ ...row, [UID_KEY]: idx }));
    if (isFlattenEnabled) {
      data = flattenDataset(data);
    }
    return data;
  }, [parsedData, isFlattenEnabled, explodeFieldPath]);

  // Sovrappone le modifiche manuali ai dati elaborati. Da qui in poi
  // (ricerca, ordinamento, paginazione, export) si lavora sempre su
  // editedData, quindi le modifiche partecipano a tutto normalmente.
  const editedData = useMemo(() => {
    if (Object.keys(cellEdits).length === 0) return processedData;
    return processedData.map(row => {
      const uid = row[UID_KEY];
      const edits = cellEdits[uid];
      return edits ? { ...row, ...edits } : row;
    });
  }, [processedData, cellEdits]);

  const columns = useMemo(() => {
    if (editedData.length === 0) return [];
    const headerSet = new Set<string>();
    editedData.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => {
          if (key !== UID_KEY) headerSet.add(key);
        });
      }
    });
    return Array.from(headerSet);
  }, [editedData]);

  const datasetStats = useMemo(() => {
    return analyzeDataset(editedData, columns);
  }, [editedData, columns]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return editedData;
    const query = searchQuery.toLowerCase();

    return editedData.filter(row => {
      return columns.some(col => {
        const val = row[col];
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(query);
        }
        return val.toString().toLowerCase().includes(query);
      });
    });
  }, [editedData, columns, searchQuery]);

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

  // Salva la modifica di una singola cella, indicizzata per uid di riga.
  const handleCellEdit = (uid: number, col: string, value: string) => {
    setCellEdits(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [col]: value }
    }));
  };

  const hasEdits = Object.keys(cellEdits).length > 0;

  const handleExportCSV = () => {
    if (editedData.length === 0) return;

    try {
      const headersLine = columns.join(',');
      const rowsLines = editedData.map(row => {
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
      // Nota: niente revoke dell'URL qui. Con file grandi, revocarlo troppo
      // presto (anche dopo 1s) può interrompere il download prima che il
      // browser finisca di scriverlo su disco, facendolo restare "in corso"
      // a tempo indeterminato. La memoria viene comunque liberata quando
      // la pagina viene ricaricata o chiusa.
    } catch (err) {
      console.error("Export CSV fallito:", err);
      alert("Export CSV fallito: " + (err instanceof Error ? err.message : String(err)));
    }
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
              tabularize-json <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-medium">v1.3</span>
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
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filtra tra i record e i nodi interni..."
                className={"w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-inner " + (
                  isDark
                    ? "bg-slate-900/60 border-slate-800/80 text-slate-200 placeholder-slate-500"
                    : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                )}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {arrayPaths.length > 0 && (
                <div className="relative">
                  <GitBranch
                    className={"absolute left-2.5 top-2.5 pointer-events-none " + (
                      explodeFieldPath ? "text-white" : "text-slate-500"
                    )}
                    size={12}
                  />
                  <select
                    value={explodeFieldPath ?? ''}
                    onChange={(e) => {
                      setExplodeFieldPath(e.target.value || null);
                      setCurrentPage(1);
                      setCellEdits({});
                    }}
                    className={"pl-7 pr-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer transition-all appearance-none " + (
                      explodeFieldPath
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : (isDark
                          ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                          : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm")
                    )}
                    title="Esplode un array annidato in righe separate"
                  >
                    <option value="">Nessuna esplosione</option>
                    {arrayPaths.map(path => (
                      <option key={path} value={path}>Esplodi: {path}</option>
                    ))}
                  </select>
                </div>
              )}

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
                title={hasEdits ? "L'export includerà le modifiche fatte in griglia" : undefined}
                className={"flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer " + (
                  hasEdits
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10"
                )}
              >
                <Download size={12} />
                <span>Export CSV{hasEdits ? " *" : ""}</span>
              </button>
            </div>
          </div>

          {hasEdits && (
            <div className={"flex items-center gap-2 -mt-2 px-3 py-2 rounded-lg text-[11px] font-medium border " + (
              isDark ? "bg-amber-500/5 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"
            )}>
              <PencilLine size={12} />
              <span>Hai modifiche non salvate nella griglia: verranno incluse nel prossimo Export CSV.</span>
              <button
                onClick={() => setCellEdits({})}
                className="ml-auto underline underline-offset-2 hover:opacity-70 cursor-pointer"
              >
                Annulla tutte le modifiche
              </button>
            </div>
          )}

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
                searchQuery={searchQuery}
                onCellEdit={handleCellEdit}
                uidKey={UID_KEY}
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
                    {[5, 10, 25, 50, 100].map(val => (
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