import { component$, useSignal, useTask$ } from '@builder.io/qwik';
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
  removeThinking,
} from '~/features/utils/columns';

export const TableRenderer = component$<Required<CellProps>>((props) => {
  const { cell } = props;
  const newValue = useSignal('');

  useTask$(({ track }) => {
    track(() => cell.value);

    newValue.value = removeThinking(cell.value);
  });

  if (hasBlobContent(cell.column)) {
    return <TableBlobRenderer {...props} />;
  }

  if (isObjectType(cell.column)) {
    return <TableObjectRenderer {...props} />;
  }

  if (isArrayType(cell.column)) {
    return <TableArrayRenderer {...props} />;
  }

  if (isMarkDown(newValue.value)) {
    return <TableMarkDownRenderer {...props} />;
  }

  if (isHTMLContent(newValue.value)) {
    return <TableHTMLRenderer {...props} />;
  }

  return <TableRawRenderer {...props} />;
});
