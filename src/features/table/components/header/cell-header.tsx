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
    cn(
      { 'bg-primary': args.value?.columnId !== column.id },
      { 'border-t-primary': args.value?.columnId !== column.id },
      { 'border-l-primary': args.value?.columnId !== column.id },
      { 'first:border-l-0': args.value?.columnId !== column.id },
    ),
  );
  return (
    <th
      id={column.id}
      class={`min-w-80 w-80 max-w-80 text-left px-2 border-[0.5px] first:rounded-tl-sm border-l-secondary border-r-secondary ${classes.value}`}
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
