import { component$, useComputed$ } from '@builder.io/qwik';
import { Popover, buttonVariants } from '~/components';
import { HideColumn } from '~/features/table/components/header';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableView = component$(() => {
  const { columns } = useColumnsStore();
  const shouldShow = useComputed$(
    () => columns.value.filter((c) => c.id !== TEMPORAL_ID).length > 1,
  );

  if (!shouldShow.value) return null;

  return (
    <Popover.Root flip={false} gutter={8} floating="bottom-start">
      <Popover.Trigger
        class={`${buttonVariants({ look: 'ghost' })} text-primary-foreground my-1 p-2`}
      >
        Column view
      </Popover.Trigger>
      <Popover.Panel>
        <div class="flex flex-col justify-start w-full gap-2">
          {columns.value.map((column) => (
            <HideColumn key={column.id} column={column} label={column.name} />
          ))}
        </div>
      </Popover.Panel>
    </Popover.Root>
  );
});
