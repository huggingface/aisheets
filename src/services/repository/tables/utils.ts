export const getDatasetTableName = (dataset: { id: string }) => {
  return `"${dataset.id}"`;
};

export const getDatasetRowSequenceName = (dataset: { id: string }) => {
  return `"${dataset.id}_rowIdx_seq"`;
};

export const getColumnName = (column: { id: string }) => {
  return `"${column.id}"`;
};

export const escapeValue = (value: any) => {
  if (value === undefined) return null;
  if (typeof value === 'string') return `$tag$${value}$tag$`;
  if (value instanceof Uint8Array) {
    // TODO: Handle Uint8Array without converting to string
    const base64Value = Buffer.from(value).toString('base64');
    return `from_base64('${base64Value}')`;
  }

  return value;
};
