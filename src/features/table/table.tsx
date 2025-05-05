import { component$ } from '@builder.io/qwik';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';
import { TableView } from '~/features/table/table-view';

export const Table = component$(() => {
  return (
    <ExecutionProvider>
      <div class="flex justify-end w-full mt-2">
        <TableView />
      </div>

      <div class="overflow-auto max-h-full scrollable -mr-6 rounded-tl-sm">
        <table class="text-sm border-separate border-spacing-0">
          <TableHeader />
          <TableBody />
        </table>
      </div>
    </ExecutionProvider>
  );
});
