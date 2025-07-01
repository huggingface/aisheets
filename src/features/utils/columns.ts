import type { Cell, Column } from '~/state/columns';

export const hasBlobContent = (column: Column | undefined): boolean => {
  return column?.type?.includes('BLOB') || isImage(column);
};

export const isArrayType = (column: Column): boolean => {
  return column.type.includes('[]');
};

export const isObjectType = (column: Column): boolean => {
  return column.type.startsWith('STRUCT') || column.type.startsWith('MAP');
};

export const isTextType = (column: Column): boolean => {
  return (
    column.type.startsWith('TEXT') ||
    column.type.startsWith('STRING') ||
    column.type.startsWith('VARCHAR')
  );
};

export const isHTMLContent = (cell: Cell): boolean => {
  return /<([a-z]+)([^>]*?)>(.*?)<\/\1>|<([a-z]+)([^>]*?)\/?>/i.test(
    cell.value || '',
  );
};

export const isMarkDown = (cell: Cell): boolean => {
  const markdownPatterns = [
    /^#{1,6}\s.+/,
    /^\s*[-*+]\s.+/,
    /^\d+\.\s.+/,
    /(\*\*|__)(.*?)\1/,
    /(_|\*)(.*?)\1/,
    /~~(.*?)~~/,
    /`[^`]*`/,
    /^```[\s\S]*?```$/,
    /\[.*?\]\(.*?\)/,
    /!\[.*?\]\(.*?\)/,
    /^>\s.+/,
  ];

  return (
    !isHTMLContent(cell) &&
    markdownPatterns.some((pattern) => pattern.test(cell.value || ''))
  );
};

export const isImage = (column: Column | undefined): boolean => {
  return column?.type?.toLowerCase().includes('image') ?? false;
};

export const isEditableValue = (column: Column): boolean => {
  return (
    !hasBlobContent(column) && !isArrayType(column) && !isObjectType(column)
  );
};
