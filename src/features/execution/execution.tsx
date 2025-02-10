import { component$ } from '@builder.io/qwik';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { useGenerateColumn } from '~/features/execution/useGenerateColumn';
import { ExportToHubSidebar } from '~/features/export-to-hub';

export const Execution = component$(() => {
  const onGenerateColumn = useGenerateColumn();

  return (
    <div class="h-4 flex w-full items-center justify-between">
      <div class="flex">{/* Left side empty for now */}</div>

      <AddDynamicColumnSidebar onGenerateColumn={onGenerateColumn} />

      <ExportToHubSidebar />
    </div>
  );
});
