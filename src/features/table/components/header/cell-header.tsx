import { component$ } from '@builder.io/qwik';
import { LuSparkle } from '@qwikest/icons/lucide';
import { CellGeneration } from '~/features/table/components/header/cell-generation';
import { CellName } from '~/features/table/components/header/cell-name';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import type { Column } from '~/state';

export const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  return (
    <th
      id={column.id}
      class="w-[300px] border border-l-primary border-t-primary border-r border-b-0 border-secondary max-w-[300px] bg-primary px-1 text-left"
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
