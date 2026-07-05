import { useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { JsonRow } from '../types'; // IMPORT RIGOROSO DI TIPO PER VERBATIMMODULESYNTAX

// Evidenzia le occorrenze di `query` dentro `text`, se presenti.
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return <>{text}</>;

  while (idx !== -1) {
    parts.push(text.slice(lastIndex, idx));
    parts.push(
      <mark key={idx} className="bg-amber-400/40 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  parts.push(text.slice(lastIndex));

  return <>{parts}</>;
}

interface DataCellProps {
  value: any;
  rowId: string | number;
  colName: string;
  expandedRows: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  isDark: boolean;
  searchQuery?: string;
}

export function DataCell({ value, rowId, colName, expandedRows, onToggleExpand, isDark, searchQuery = '' }: DataCellProps) {
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
              <HighlightedText text={item.toString()} query={searchQuery} />
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

  return (
    <span className={"font-medium font-sans " + (isDark ? "text-slate-300" : "text-slate-800")}>
      <HighlightedText text={value.toString()} query={searchQuery} />
    </span>
  );
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
  searchQuery?: string;
  onCellEdit?: (uid: number, col: string, value: string) => void;
  uidKey?: string;
}

export function DataTable({
  parsedData,
  columns,
  paginatedData,
  sortConfig,
  requestSort,
  expandedRows,
  toggleRowExpand,
  isDark,
  searchQuery = '',
  onCellEdit,
  uidKey = '__uid'
}: DataTableProps) {
  // Cella attualmente in modifica: "uid-colonna", oppure null se nessuna.
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!parsedData) {
    return null;
  }

  const startEditing = (uid: number, col: string, currentValue: any) => {
    setEditingCellKey(`${uid}-${col}`);
    setEditValue(currentValue === null || currentValue === undefined ? '' : String(currentValue));
  };

  const commitEdit = (uid: number, col: string) => {
    onCellEdit?.(uid, col, editValue);
    setEditingCellKey(null);
  };

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
          paginatedData.map((row, rowIdx) => {
            const uid: number = row[uidKey] ?? rowIdx;
            return (
              <tr
                key={rowIdx}
                className={"transition-colors " + (isDark ? "hover:bg-slate-900/40" : "hover:bg-slate-100/60")}
              >
                {columns.map(col => {
                  const rawValue = row[col];
                  const isEditableType = rawValue === null || typeof rawValue !== 'object';
                  const cellKey = `${uid}-${col}`;
                  const isEditing = editingCellKey === cellKey;

                  return (
                    <td
                      key={col}
                      className={"px-4 py-3.5 " + (isEditableType && onCellEdit ? "cursor-text" : "")}
                      onDoubleClick={() => {
                        if (isEditableType && onCellEdit) startEditing(uid, col, rawValue);
                      }}
                      title={isEditableType && onCellEdit && !isEditing ? "Doppio click per modificare" : undefined}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(uid, col)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(uid, col);
                            if (e.key === 'Escape') setEditingCellKey(null);
                          }}
                          className={"w-full px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 " + (
                            isDark
                              ? "bg-slate-800 border-indigo-500 text-slate-100"
                              : "bg-white border-indigo-400 text-slate-800"
                          )}
                        />
                      ) : (
                        <DataCell
                          value={rawValue}
                          rowId={uid}
                          colName={col}
                          expandedRows={expandedRows}
                          onToggleExpand={toggleRowExpand}
                          isDark={isDark}
                          searchQuery={searchQuery}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })
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