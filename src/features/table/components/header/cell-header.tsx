import { component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuSparkle } from '@qwikest/icons/lucide';
import { useActiveModal } from '~/components';
import { CellGeneration } from '~/features/table/components/header/cell-generation';
import { CellName } from '~/features/table/components/header/cell-name';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import type { Column } from '~/state';

export const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { args } = useActiveModal();

  const classes = useComputed$(() =>
    cn({ 'bg-primary': args.value?.columnId !== column.id }),
  );
  return (
    <th
      id={column.id}
      class={`w-[300px] max-w-[300px] border border-l-primary border-t-primary border-r border-b-0 border-secondary px-1 text-left ${classes.value}`}
    >
      <div class="flex items-center justify-between gap-2 w-full">
        <div class="flex items-center gap-2 text-wrap w-[80%]">
          <LuSparkle class="text-primary-foreground" />
          <CellName column={column} />
        </div>

        <div class="flex items-center w-[20%]">
          <CellGeneration column={column} />

          <CellSettings column={column} />
        </div>
      </div>
    </th>
  );
});
