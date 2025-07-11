import { component$ } from '@builder.io/qwik';
import type { TableProps } from '~/features/table/components/body/renderer/components/cell/type';

export const TableArrayRenderer = component$<TableProps>(({ cell }) => {
  return <pre>{JSON.stringify(cell.value, null, 2)}</pre>;
});
