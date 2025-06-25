import { component$ } from '@builder.io/qwik';
import { CellArrayRenderer } from '~/features/table/components/body/renderer/cell-array-renderer';
import { CellBlobRenderer } from '~/features/table/components/body/renderer/cell-blob-renderer';
import { CellObjectRenderer } from '~/features/table/components/body/renderer/cell-object-renderer';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { CellRawRenderer } from '~/features/table/components/body/renderer/cell-raw-renderer';
import {
  hasBlobContent,
  isArrayType,
  isObjectType,
} from '~/features/utils/columns';
import { useColumnsStore } from '~/state';

export const CellRenderer = component$<CellProps>((props) => {
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
