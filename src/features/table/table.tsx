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

      <div class="overflow-auto w-full max-h-full h-screen scrollable -mr-6 rounded-tl-sm relative">
        <table class="grid text-sm border-separate border-spacing-0 mr-2 min-w-max">
          <TableHeader />
          <TableBody />
        </table>
      </div>
    </ExecutionProvider>
  );
});
