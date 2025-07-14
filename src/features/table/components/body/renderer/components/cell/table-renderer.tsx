import { component$ } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { TableArrayRenderer } from '~/features/table/components/body/renderer/components/cell/table-array-renderer';
import { TableBlobRenderer } from '~/features/table/components/body/renderer/components/cell/table-blob-renderer';
import { TableHTMLRenderer } from '~/features/table/components/body/renderer/components/cell/table-html-renderer';
import { TableMarkDownRenderer } from '~/features/table/components/body/renderer/components/cell/table-markdown-renderer';
import { TableObjectRenderer } from '~/features/table/components/body/renderer/components/cell/table-object-renderer';
import { TableRawRenderer } from '~/features/table/components/body/renderer/components/cell/table-raw-renderer';
import {
  hasBlobContent,
  isArrayType,
  isHTMLContent,
  isMarkDown,
  isObjectType,
} from '~/features/utils/columns';

export const TableRenderer = component$<CellProps>((props) => {
  const { cell, column } = props;

  if (!column) {
    return null;
  }

  if (hasBlobContent(column)) {
    return <TableBlobRenderer {...props} />;
  }

  if (isObjectType(column)) {
    return <TableObjectRenderer {...props} />;
  }

  if (isArrayType(column)) {
    return <TableArrayRenderer {...props} />;
  }

  if (isMarkDown(cell.value)) {
    return <TableMarkDownRenderer {...props} />;
  }

  if (isHTMLContent(cell.value)) {
    return <TableHTMLRenderer {...props} />;
  }

  return <TableRawRenderer {...props} />;
});
