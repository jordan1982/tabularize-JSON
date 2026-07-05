export type JsonRow = Record<string, any>;

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

const MAX_ARRAY_INDEX_COLUMNS = 5;

export type ArrayPolicy = 'index' | 'stringify';

// Funzione di flattening ricorsivo dei nodi complessi.
// Gli array di primitivi vengono sempre uniti in una stringa.
// Per gli array di oggetti, se viene fornita una `arrayPolicies` (calcolata a
// livello di dataset con computeArrayPolicies) si usa quella per decidere se
// esplodere in colonne indicizzate o stringificare; altrimenti si ricade sulla
// vecchia euristica locale basata sulla lunghezza dell'array di QUESTA riga
// (utile per chiamate isolate, es. da explodeArrayField).
export function flattenObject(
  obj: Record<string, any>,
  prefix = '',
  arrayPolicies?: Record<string, ArrayPolicy>
): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = prefix ? prefix + '.' + key : key;
      const value = obj[key];

      if (Array.isArray(value)) {
        if (value.length === 0) {
          flattened[propName] = '';
        } else if (value.every(v => v === null || typeof v !== 'object')) {
          flattened[propName] = value.join(', ');
        } else {
          const policy: ArrayPolicy =
            arrayPolicies?.[propName] ??
            (value.length <= MAX_ARRAY_INDEX_COLUMNS ? 'index' : 'stringify');

          if (policy === 'index') {
            value.forEach((item, idx) => {
              if (item !== null && typeof item === 'object') {
                Object.assign(flattened, flattenObject(item, `${propName}.${idx}`, arrayPolicies));
              } else {
                flattened[`${propName}.${idx}`] = item;
              }
            });
          } else {
            flattened[propName] = JSON.stringify(value);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(flattened, flattenObject(value, propName, arrayPolicies));
      } else {
        flattened[propName] = value;
      }
    }
  }

  return flattened;
}

// Calcola, per ciascun campo che è un array di oggetti, la lunghezza massima
// raggiunta in QUALSIASI riga del dataset, e decide una policy UNICA e coerente
// (index oppure stringify) da applicare a quella colonna per tutte le righe.
// Questo evita che la stessa colonna logica cambi "forma" da riga a riga.
export function computeArrayPolicies(rows: JsonRow[]): Record<string, ArrayPolicy> {
  const maxLengths: Record<string, number> = {};

  function walk(obj: any, prefix: string) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const propPath = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        const isArrayOfObjects = value.length > 0 && value.some(v => v !== null && typeof v === 'object');
        if (isArrayOfObjects) {
          maxLengths[propPath] = Math.max(maxLengths[propPath] ?? 0, value.length);
        }
      } else if (typeof value === 'object' && value !== null) {
        walk(value, propPath);
      }
    }
  }

  rows.forEach(row => walk(row, ''));

  const policies: Record<string, ArrayPolicy> = {};
  for (const path in maxLengths) {
    policies[path] = maxLengths[path] <= MAX_ARRAY_INDEX_COLUMNS ? 'index' : 'stringify';
  }
  return policies;
}

// Appiattisce un intero dataset in modo coerente: calcola prima le policy degli
// array a livello di dataset, poi le applica a ogni riga con le stesse regole.
export function flattenDataset(rows: JsonRow[]): JsonRow[] {
  const policies = computeArrayPolicies(rows);
  return rows.map(row => flattenObject(row, '', policies));
}

// Estrae l'array di record da tabulare a partire dal JSON parsato.
// Se la radice non è già un array, cerca la proprietà-array (di oggetti) più grande.
export function extractRows(parsed: any): JsonRow[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    const arrayProps = Object.values(parsed).filter(
      (v): v is any[] =>
        Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null
    );
    if (arrayProps.length > 0) {
      return arrayProps.reduce((longest, curr) => (curr.length > longest.length ? curr : longest));
    }
  }
  return [parsed];
}

// Legge un valore annidato tramite path puntato, es. "orders" o "address.city"
export function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function deleteByPath(obj: any, path: string): void {
  const keys = path.split('.');
  let curr = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (curr == null) return;
    curr = curr[keys[i]];
  }
  if (curr != null) delete curr[keys[keys.length - 1]];
}

// Rileva automaticamente i campi (anche annidati) che sono array di oggetti,
// candidati per l'esplosione in righe separate.
export function findArrayOfObjectPaths(rows: JsonRow[], sampleSize = 20): string[] {
  const paths = new Set<string>();

  function walk(obj: any, prefix: string) {
    if (obj === null || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const propPath = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          paths.add(propPath);
        }
      } else if (typeof value === 'object' && value !== null) {
        walk(value, propPath);
      }
    }
  }

  rows.slice(0, sampleSize).forEach(row => walk(row, ''));
  return Array.from(paths);
}

// Esplode un array-di-oggetti annidato: 1 riga originale -> N righe (una per elemento).
// Le righe con array vuoto o campo assente vengono mantenute (senza perdita di dati).
export function explodeArrayField(rows: JsonRow[], path: string): JsonRow[] {
  const result: JsonRow[] = [];

  rows.forEach(row => {
    const arrValue = getByPath(row, path);

    if (Array.isArray(arrValue) && arrValue.length > 0) {
      arrValue.forEach((item, idx) => {
        const base = cloneDeep(row);
        deleteByPath(base, path);
        const itemEntries =
          item !== null && typeof item === 'object'
            ? flattenObject(item, path)
            : { [path]: item };
        result.push({ ...base, ...itemEntries, [`${path}_index`]: idx });
      });
    } else {
      const base = cloneDeep(row);
      deleteByPath(base, path);
      result.push(base);
    }
  });

  return result;
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

    const completeness = totalRows > 0 ? Math.round(((totalRows - nullCount) / totalRows) * 100) : 0;

    columnDetails[header] = {
      name: header,
      type: inferredType,
      nullCount,
      nullPercentage: totalRows > 0 ? Math.round((nullCount / totalRows) * 100) : 0,
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