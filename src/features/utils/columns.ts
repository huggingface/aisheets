import type { Column } from '~/state/columns';

interface Typeable {
  type: Column['type'];
}

export const hasBlobContent = (column?: Typeable): boolean => {
  return column?.type?.toUpperCase().includes('BLOB') || isImage(column);
};

export const isArrayType = (column?: Typeable): boolean => {
  return column?.type?.includes('[]') ?? false;
};

export const isObjectType = (column?: Typeable): boolean => {
  return (
    (column?.type?.toUpperCase().startsWith('STRUCT') ||
      column?.type?.toUpperCase().startsWith('MAP')) ??
    false
  );
};

export const isTextType = (column?: Typeable): boolean => {
  return (
    (column?.type?.toUpperCase().startsWith('TEXT') ||
      column?.type?.toUpperCase().startsWith('STRING') ||
      column?.type?.toUpperCase().startsWith('VARCHAR')) ??
    false
  );
};

export const isHTMLContent = (value?: string): boolean => {
  return /<([a-z]+)([^>]*?)>(.*?)<\/\1>|<([a-z]+)([^>]*?)\/?>/i.test(
    value || '',
  );
};

export const isMarkDown = (value?: string): boolean => {
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
    !isHTMLContent(value) &&
    markdownPatterns.some((pattern) => pattern.test(value || ''))
  );
};

export const isImage = (column?: Typeable): boolean => {
  return column?.type?.toLowerCase().includes('image') ?? false;
};

export const isEditableValue = (column: Typeable): boolean => {
  return (
    !hasBlobContent(column) && !isArrayType(column) && !isObjectType(column)
  );
};

export const getThinking = (value: string): string[] => {
  if (typeof value !== 'string') return [];

  const match = value?.match(/<think>([\s\S]*?)<\/think>/);
  if (!match) return [];

  const thinkText = match[1].trim();
  return thinkText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);
};

export const removeThinking = (value: string) => {
  if (typeof value !== 'string') return value;

  return value?.replace(/<think>[\s\S]*?<\/think>/, '').trim();
};
