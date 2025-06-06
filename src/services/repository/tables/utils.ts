export const getDatasetTableName = (dataset: {
  id: string;
}) => {
  return `"${dataset.id}"`;
};

export const getDatasetRowSequenceName = (dataset: {
  id: string;
}) => {
  return `"${dataset.id}_rowIdx_seq"`;
};

export const getColumnName = (column: {
  id: string;
}) => {
  return `"${column.id}"`;
};

export const escapeValue = (value: any) => {
  if (value === undefined) return null;
  if (typeof value === 'string') return `$tag$${value}$tag$`;

  return value;
};

export const readFuncFromFile = (file: string) => {
  switch (file.split('.').pop()?.toLowerCase()) {
    case 'csv':
    case 'tsv':
      return `read_csv('${file}', ignore_errors=true, auto_detect=true)`;
    case 'jsonl':
      return `read_json('${file}', ignore_errors=true, auto_detect=true)`;
    default:
      return `'${file}'`;
  }
};
