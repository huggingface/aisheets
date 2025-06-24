import type { Column } from '~/state/columns';

//Refactor, duplicated
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

export const isImage = (column: Column | undefined): boolean => {
  return column?.type?.toLowerCase().includes('image') ?? false;
};

export const isEditableValue = (column: Column): boolean => {
  return (
    !hasBlobContent(column) && !isArrayType(column) && !isObjectType(column)
  );
};
