import { component$ } from '@builder.io/qwik';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

export const Table = component$(() => {
  return (
    <ExecutionProvider>
      <div class="flex flex-col h-full">
        <div class="sticky top-0 z-10 bg-white shadow-sm">
          <table class="border-separate border-spacing-0 text-sm">
            <TableHeader />
          </table>
        </div>

        <div class="overflow-x-auto overflow-y-auto flex-grow">
          <table class="border-separate border-spacing-0 text-sm">
            <TableBody />
          </table>
        </div>
      </div>
    </ExecutionProvider>
  );
});
