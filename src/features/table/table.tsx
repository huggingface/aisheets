import { component$ } from '@builder.io/qwik';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';
import { TableView } from '~/features/table/table-view';

export const Table = component$(() => {
  return (
    <ExecutionProvider>
      <div class="flex flex-col flex-grow h-0">
        <TableView />
        <div class="sticky top-0">
          <table class="border-separate border-spacing-0 text-sm">
            <TableHeader />
          </table>
        </div>
        <div class="flex overflow-y-auto overflow-hidden scrollable">
          <table class="text-sm border-separate border-spacing-0">
            <TableBody />
          </table>
        </div>
      </div>
    </ExecutionProvider>
  );
});
