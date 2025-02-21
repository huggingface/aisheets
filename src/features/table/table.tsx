import { component$ } from '@builder.io/qwik';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

export const Table = component$(() => {
  return (
    <ExecutionProvider>
      <div class="overflow-x-auto">
        <table class="min-w-max border-separate border-spacing-0 mt-4 text-sm">
          <TableHeader />
          <TableBody />
        </table>
      </div>
    </ExecutionProvider>
  );
});
