import { blobValue } from '@duckdb/node-api';

export const getDatasetTableName = (dataset: { id: string }) => {
  return `"${dataset.id}"`;
};

export const getDatasetRowSequenceName = (dataset: { id: string }) => {
  return `"${dataset.id}_rowIdx_seq"`;
};

export const getColumnName = (column: { id: string }) => {
  return `"${column.id}"`;
};

export const sanitizeValue = (value: any) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (value instanceof Uint8Array) return blobValue(value);
  return value;
};
