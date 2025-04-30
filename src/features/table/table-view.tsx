import { component$ } from '@builder.io/qwik';
import { LuColumns } from '@qwikest/icons/lucide';
import { Popover, buttonVariants } from '~/components';
import { HideColumn } from '~/features/table/components/header';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableView = component$(() => {
  const { columns } = useColumnsStore();
  const hasMultipleColumns =
    columns.value.filter((c) => c.id !== TEMPORAL_ID).length > 1;

  return (
    <div class="h-10">
      {hasMultipleColumns && (
        <Popover.Root floating="bottom-start" gutter={4}>
          <Popover.Trigger
            class={`${buttonVariants({ look: 'ghost' })} flex gap-1 text-primary-foreground my-1`}
          >
            <LuColumns class="text-sm text-neutral mr-1" />
            View column
          </Popover.Trigger>
          <Popover.Panel class="rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <div class="flex flex-col justify-start w-full gap-2">
              {columns.value.map((column) => (
                <div key={column.id} class="hover:bg-neutral-100 rounded-sm">
                  <HideColumn column={column} label={column.name} />
                </div>
              ))}
            </div>
          </Popover.Panel>
        </Popover.Root>
      )}
    </div>
  );
});
