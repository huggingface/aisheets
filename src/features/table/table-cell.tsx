import { component$ } from '@builder.io/qwik';
import { CellError } from '~/features/table/components/body/cell-error';
import { CellRenderer } from '~/features/table/components/body/cell-renderer';
import { CellSkeleton } from '~/features/table/components/body/cell-skeleton';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

export const TableCell = component$<CellProps>((props) => {
  const { cell } = props;

  return (
    <div class="min-h-[100px] h-[102px] max-h-[102px] relative flex flex-col overflow-hidden group">
      <CellSkeleton cell={cell} />
      <CellError cell={cell} />

      <div class="flex-1 px-2 pt-2">
        <CellRenderer {...props} />
      </div>
    </div>
  );
});
