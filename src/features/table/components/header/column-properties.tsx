import { component$ } from '@builder.io/qwik';
import { Popover, buttonVariants } from '~/components';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnNameEdition } from '~/features/table/components/header/column-name-edition';
import { HideColumn } from '~/features/table/components/header/hide-column';
import type { Column } from '~/state';

export const ColumnProperties = component$<{ column: Column }>(({ column }) => {
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
