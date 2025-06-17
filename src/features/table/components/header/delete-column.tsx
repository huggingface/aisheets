import { $, component$, useSignal } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { usePopover } from '@qwik-ui/headless';
import { LuTrash } from '@qwikest/icons/lucide';
import { Button, Popover } from '~/components';
import { deleteColumn } from '~/services';
import { type Column, useColumnsStore } from '~/state';

export const DeleteColumn = component$<{
  column: Column;
}>(({ column }) => {
  const { columns, removeColumn } = useColumnsStore();
  const popoverId = `delete-column-${column.id}`;
  const anchorRef = useSignal<HTMLElement | undefined>();
  const { showPopover, hidePopover } = usePopover(popoverId);

  const onDeleteColumn = $(async () => {
    await server$(async (columnId: string) => {
      await deleteColumn(columnId);
    })(column.id);

    removeColumn(column);
    hidePopover();
  });

  if (columns.value.length <= 1) {
    return null;
  }

  return (
    <Popover.Root
      id={popoverId}
      bind:anchor={anchorRef}
      floating="bottom"
      flip
      manual
    >
      <Button
        ref={anchorRef}
        class="p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full w-full justify-start"
        look="ghost"
        size="sm"
        onClick$={() => {
          showPopover();
        }}
      >
        <LuTrash class="text-sm text-neutral" />
        Delete column
      </Button>
      <Popover.Panel>
        <div class="flex flex-col gap-2 p-1">
          <p>
            Are you sure you want to delete the column{' '}
            <span class="font-semibold">{column.name}</span>?
          </p>
          <div class="flex justify-end w-full gap-2">
            <Button look="alert" onClick$={onDeleteColumn}>
              Delete
            </Button>
            <Button
              look="secondary"
              onClick$={() => {
                hidePopover();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Popover.Panel>
    </Popover.Root>
  );
});
