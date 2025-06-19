import { $, component$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { LuTrash } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { deleteColumn } from '~/services';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const DeleteColumn = component$<{
  column: Column;
}>(({ column }) => {
  const { columns, removeColumn } = useColumnsStore();

  const onDeleteColumn = $(async () => {
    await server$(async (columnId: string) => {
      await deleteColumn(columnId);
    })(column.id);

    removeColumn(column);
  });

  if (column.id === TEMPORAL_ID || columns.value.length <= 1) {
    return null;
  }

  return (
    <Button
      class="p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full w-full justify-start"
      look="ghost"
      size="sm"
      onClick$={onDeleteColumn}
    >
      <LuTrash class="text-sm text-neutral" />
      Delete column
    </Button>
  );
});
