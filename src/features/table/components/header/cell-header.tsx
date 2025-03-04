import { component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuZap } from '@qwikest/icons/lucide';
import { Popover, buttonVariants } from '~/components';
import { useExecution } from '~/features/add-column';
import { CellGeneration } from '~/features/table/components/header/cell-generation';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnNameEdition } from '~/features/table/components/header/column-name-edition';
import { HideColumn } from '~/features/table/components/header/hide-column';
import type { Column } from '~/state';

export const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { columnId } = useExecution();

  const classes = useComputed$(() =>
    cn({ 'bg-primary': columnId.value === column.id }),
  );
  return (
    <th
      id={column.id}
      class={`min-w-80 w-80 max-w-80 min-h-12 h-12 p-2 text-left border-[0.5px] first:rounded-tl-sm border-l-secondary border-r-secondary ${classes.value}`}
    >
      <div class="flex items-center justify-between gap-2 w-full">
        <div class="flex items-center gap-2 text-wrap w-[80%]">
          <LuZap class="text-primary-foreground" />
          <ColumnProperties column={column} />
        </div>

        <div class="flex items-center w-[20%]">
          {column.kind === 'dynamic' && (
            <>
              <CellGeneration column={column} />
              <CellSettings column={column} />
            </>
          )}
        </div>
      </div>
    </th>
  );
});

const ColumnProperties = component$<{ column: Column }>(({ column }) => {
  return (
    <Popover.Root flip={false} gutter={8} floating="bottom-start">
      <Popover.Trigger class={buttonVariants({ look: 'ghost' })}>
        {column.name}
      </Popover.Trigger>
      <Popover.Panel>
        <div class="flex flex-col gap-2">
          <ColumnNameEdition column={column} />
          <CellSettings column={column}>Edit configuration</CellSettings>
          <HideColumn column={column} />
        </div>
      </Popover.Panel>
    </Popover.Root>
  );
});
