import { component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuZap } from '@qwikest/icons/lucide';
import { useExecution } from '~/features/add-column';
import { CellGeneration } from '~/features/table/components/header/cell-generation';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnProperties } from '~/features/table/components/header/column-properties';
import type { Column } from '~/state';

export const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { columnId } = useExecution();

  const classes = useComputed$(() =>
    cn({ 'bg-neutral-100': columnId.value === column.id }),
  );
  return (
    <th
      id={column.id}
      class={`min-w-80 w-80 max-w-80 min-h-8 h-8 p-2 text-left border-[0.5px] first:rounded-tl-sm border-l-neutral-300 border-r-neutral-300 ${classes.value}`}
    >
      <div class="flex items-center justify-between gap-2 w-full">
        <div class="flex items-center gap-2 text-wrap w-[80%]">
          <LuZap class="text-sm text-primary-foreground" />
          <ColumnProperties column={column} />
        </div>

        <div class="flex items-center w-[20%] h-0">
          <CellGeneration column={column} />
          <CellSettings column={column} />
        </div>
      </div>
    </th>
  );
});
