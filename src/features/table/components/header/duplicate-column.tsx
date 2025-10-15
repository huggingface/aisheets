import { $, component$ } from '@builder.io/qwik';
import { LuLayers2 } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { useExecution } from '~/features/add-column';
import { type Column, useColumnsStore } from '~/state';

export const DuplicateColumn = component$<{
  column: Column;
}>(({ column }) => {
  const { open } = useExecution();
  const { columns } = useColumnsStore();

  const onDuplicateColumn = $(async () => {
    open('add', {
      nextColumnId: column.id,
      name: `${column.name}_copy`,
      type: column.type,
      modelName: column.process?.modelName,
      modelProvider: column.process?.modelProvider,
      endpointUrl: column.process?.endpointUrl,
      prompt: column.process?.prompt,
      columnsReferences: column.process?.columnsReferences,
      imageColumnId: column.process?.imageColumnId,
      task: column.process?.task,
    });
  });

  if (columns.value.length <= 1 || column.kind === 'static') {
    return null;
  }

  return (
    <Button
      class={
        'p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full w-full justify-start'
      }
      look="ghost"
      size="sm"
      onClick$={onDuplicateColumn}
    >
      <LuLayers2 class="text-sm text-neutral" />
      Duplicate column
    </Button>
  );
});
