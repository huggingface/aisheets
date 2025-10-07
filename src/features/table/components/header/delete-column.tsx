import { $, component$, useComputed$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { LuTrash } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column';
import { deleteColumn } from '~/services';
import { type Column, useColumnsStore } from '~/state';

export const DeleteColumn = component$<{
  column: Column;
}>(({ column }) => {
  const { columns, removeColumn } = useColumnsStore();
  const { close } = useExecution();
  const references = useComputed$(() => {
    return columns.value.filter((c) =>
      c.process?.columnsReferences?.includes(column.id),
    );
  });

  const isReferenced = useComputed$(() => {
    return references.value.length > 0;
  });

  const onDeleteColumn = $(async () => {
    await server$(async (columnId: string) => {
      await deleteColumn(columnId);
    })(column.id);

    await close();
    await removeColumn(column);
  });

  if (columns.value.length <= 1) {
    return null;
  }

  if (isReferenced.value) {
    return (
      <Tooltip
        class="max-w-64"
        text={`Referenced in ${references.value.map((c) => '{{' + c.name + '}}').join(', ')}`}
      >
        <Button
          class={
            'p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full w-full justify-start disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
          }
          look="ghost"
          size="sm"
          disabled
        >
          <LuTrash class="text-sm text-neutral" />
          Delete column
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      class={
        'p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full w-full justify-start'
      }
      look="ghost"
      size="sm"
      onClick$={onDeleteColumn}
    >
      <LuTrash class="text-sm text-neutral" />
      Delete column
    </Button>
  );
});
