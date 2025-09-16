import type { Column } from '~/state/columns';

interface Typeable {
  type: Column['type'];
}

export const hasBlobContent = (column?: Typeable): boolean => {
  // text-image columns store text data, not blob data
  if (column?.type === 'text-image') return false;
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
  // text-image is not an image column, it's a text column with image input
  if (column?.type === 'text-image') return false;
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

/**
 * Checks if a column contains image data by examining its type and potentially its content.
 * This is similar to the logic in export-to-hub.usecase.ts but adapted for the execution form context.
 */
export const isImageColumn = async (column: Column): Promise<boolean> => {
  // Direct image type check
  if (column.type === 'image') return true;

  // Check if it's a blob column that might contain image data
  if (column.type.toLowerCase().includes('blob')) {
    // For imported datasets, we need to check if the blob contains image data
    // This would require examining the actual data, but for now we'll be conservative
    // and assume blob columns in imported datasets might contain images
    return true;
  }

  return false;
};

/**
 * Checks if a column contains image data by examining its actual content.
 * This is a more sophisticated version that checks the MIME type of blob data.
 */
export const isImageColumnWithContentCheck = async (
  column: Column,
): Promise<boolean> => {
  // Direct image type check
  if (column.type === 'image') return true;

  // Check if it's a blob column that might contain image data
  if (column.type.toLowerCase().includes('blob')) {
    try {
      // Import the necessary functions dynamically to avoid circular dependencies
      const { listDatasetTableRows } = await import(
        '~/services/repository/tables'
      );
      const { detectMimeTypeFromBytes } = await import(
        '~/usecases/utils/mime-types'
      );

      // Get a sample of data from the column
      const rows = await listDatasetTableRows({
        dataset: column.dataset,
        columns: [{ id: column.id }],
        offset: 0,
        limit: 1,
      });

      if (rows.length === 0) return false;

      const value = rows[0][column.id];

      // Check if the value contains image data
      if (value instanceof Uint8Array) {
        const mimeType = detectMimeTypeFromBytes(value);
        return mimeType?.startsWith('image/') ?? false;
      }

      if ('bytes' in value && value.bytes instanceof Uint8Array) {
        const mimeType = detectMimeTypeFromBytes(value.bytes);
        return mimeType?.startsWith('image/') ?? false;
      }

      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (first instanceof Uint8Array) {
          const mimeType = detectMimeTypeFromBytes(first);
          return mimeType?.startsWith('image/') ?? false;
        }
        if (first && 'bytes' in first && first.bytes instanceof Uint8Array) {
          const mimeType = detectMimeTypeFromBytes(first.bytes);
          return mimeType?.startsWith('image/') ?? false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking image content:', error);
      // Fallback to conservative approach for blob columns
      return true;
    }
  }

  return false;
};
