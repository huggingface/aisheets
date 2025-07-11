import { component$ } from '@builder.io/qwik';
import { CellActions } from '~/features/table/components/body/cell-actions';
import type { TableProps } from '~/features/table/components/body/renderer/components/cell/type';

export const TableRawRenderer = component$<TableProps>(({ cell }) => {
  return (
    <div class="h-full flex flex-col justify-between">
      <CellActions cell={cell} />
      <p>{cell.value?.toString()}</p>
    </div>
  );
});
