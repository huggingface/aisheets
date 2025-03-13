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
