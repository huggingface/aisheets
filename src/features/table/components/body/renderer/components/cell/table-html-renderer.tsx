import { component$ } from '@builder.io/qwik';
import { CellActions } from '~/features/table/components/body/cell-actions';
import type { TableProps } from '~/features/table/components/body/renderer/components/cell/type';
import { TableSandbox } from '~/features/table/components/body/renderer/components/table-sandbox';
import { removeThinking } from '~/features/utils/columns';

export const TableHTMLRenderer = component$<TableProps>(({ cell }) => {
  const maxPreviewLength = 256;

  const content = removeThinking(cell.value || '')
    .replace('```html', '')
    .replace(/```/g, '');

  return (
    <div class="h-full flex flex-col justify-between">
      <CellActions cell={cell} />

      <TableSandbox content={content.slice(0, maxPreviewLength)} />
    </div>
  );
});
