import { component$ } from '@builder.io/qwik';
import { CellActions } from '~/features/table/components/body/cell-actions';
import type { TableProps } from '~/features/table/components/body/renderer/components/cell/type';
import { TableSandbox } from '~/features/table/components/body/renderer/components/table-sandbox';

export const TableHTMLRenderer = component$<TableProps>(({ cell }) => {
  const content = (cell.value || '').replace('```html', '').replace(/```/g, '');

  return (
    <div class="h-full flex flex-col justify-between">
      <CellActions cell={cell} />
      <TableSandbox content={content} />
    </div>
  );
});
