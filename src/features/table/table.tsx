import { component$ } from '@builder.io/qwik';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';
import { TableView } from '~/features/table/table-view';

export const Table = component$(() => {
  return (
    <ExecutionProvider>
      <div class="flex flex-col h-full">
        <div class="flex justify-end w-full">
          <TableView />
        </div>
        <div class="sticky -top-4 z-30 bg-white">
          <table class="border-separate border-spacing-0 text-sm">
            <TableHeader />
          </table>
        </div>

        <div class="flex-grow">
          <table class="overflow-x-auto overflow-y-hidden border-separate border-spacing-0 text-sm">
            <TableBody />
          </table>
        </div>
      </div>
    </ExecutionProvider>
  );
});
