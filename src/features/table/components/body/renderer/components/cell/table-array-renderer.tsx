import { component$ } from '@builder.io/qwik';
import type { TableProps } from '~/features/table/components/body/renderer/components/cell/type';
import { bigIntStringify } from '~/usecases/utils/serializer';

export const TableArrayRenderer = component$<TableProps>(({ cell }) => {
  if (!Array.isArray(cell.value)) {
    return <span></span>;
  }

  const maxPreviewLength = 512;
  const content = JSON.stringify(cell.value, bigIntStringify, 2);

  return <pre>{content.slice(0, maxPreviewLength)}</pre>;
});
