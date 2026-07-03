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
