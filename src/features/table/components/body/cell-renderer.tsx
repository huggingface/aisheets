import { component$ } from '@builder.io/qwik';
import { CellArrayRenderer } from '~/features/table/components/body/cell-array-renderer';
import { CellBlobRenderer } from '~/features/table/components/body/cell-blob-renderer';
import { CellObjectRenderer } from '~/features/table/components/body/cell-object-renderer';
import type { CellProps } from '~/features/table/components/body/cell-props';
import { CellRawRenderer } from '~/features/table/components/body/cell-raw-renderer';
import { type Column, useColumnsStore } from '~/state';

const hasBlobContent = (column: Column | undefined): boolean => {
  return column?.type?.includes('BLOB') ?? false;
};

const isArrayType = (column: Column): boolean => {
  return column?.type?.includes('[]');
};

const isObjectType = (column: Column): boolean => {
  return column?.type?.startsWith('STRUCT') || column?.type?.startsWith('MAP');
};

export const CellContentRenderer = component$<CellProps>((props) => {
  const { cell } = props;
  const { columns } = useColumnsStore();
  const column = columns.value.find((col) => col.id === cell.column?.id);

  if (!column) {
    return null;
  }

  if (hasBlobContent(column)) {
    return <CellBlobRenderer {...props} />;
  }

  if (isObjectType(column)) {
    return <CellObjectRenderer {...props} />;
  }

  if (isArrayType(column)) {
    return <CellArrayRenderer {...props} />;
  }

  return <CellRawRenderer {...props} />;
});
