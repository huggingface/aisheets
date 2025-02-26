import { component$ } from '@builder.io/qwik';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

export const Table = component$(() => {
  return (
    <ExecutionProvider>
      <div class="overflow-x-auto overflow-y-hidden h-full py-1">
        <table class="min-w-max h-full border-separate border-spacing-0 text-sm">
          <TableHeader />
          <TableBody />
        </table>
      </div>
    </ExecutionProvider>
  );
});
