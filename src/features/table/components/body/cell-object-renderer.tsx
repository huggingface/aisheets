import { component$ } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/cell-props';

export const CellObjectRenderer = component$<CellProps>(({ cell }) => {
  return <pre>{JSON.stringify(cell.value, null, 2)}</pre>;
});
