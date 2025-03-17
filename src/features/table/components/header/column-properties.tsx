import { component$ } from '@builder.io/qwik';
import { Popover, buttonVariants } from '~/components';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnNameEdition } from '~/features/table/components/header/column-name-edition';
import { HideColumn } from '~/features/table/components/header/hide-column';
import type { Column } from '~/state';

export const ColumnProperties = component$<{ column: Column }>(({ column }) => {
  return (
    <Popover.Root flip={false} gutter={8} floating="bottom-start">
      <Popover.Trigger
        class={`${buttonVariants({ look: 'ghost' })} text-neutral-600`}
      >
        {column.name}
      </Popover.Trigger>
      <Popover.Panel>
        <div class="flex flex-col gap-0.5">
          <ColumnNameEdition column={column} />
          <div class="rounded-sm hover:bg-neutral-100 transition-colors mt-2">
            <CellSettings column={column}>
              <span class="font-normal">Edit configuration</span>
            </CellSettings>
          </div>
          <div class="rounded-sm hover:bg-neutral-100 transition-colors">
            <HideColumn column={column} />
          </div>
        </div>
      </Popover.Panel>
    </Popover.Root>
  );
});
