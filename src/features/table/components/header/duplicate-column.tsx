import { $, component$ } from '@builder.io/qwik';
import { LuLayers2 } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { useExecution } from '~/features/add-column';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const DuplicateColumn = component$<{
  column: Column;
}>(({ column }) => {
  const { open } = useExecution();
  const { columns, addTemporalColumn } = useColumnsStore();

  const onDuplicateColumn = $(async () => {
    await addTemporalColumn(column.type, `${column.name} copy`);

    open(TEMPORAL_ID, 'add', {
      prompt: column.process?.prompt,
      modelName: column.process?.modelName,
      modelProvider: column.process?.modelProvider,
      task: column.process?.task,
    });
  });

  if (
    column.id === TEMPORAL_ID ||
    columns.value.length <= 1 ||
    column.kind === 'static'
  ) {
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
