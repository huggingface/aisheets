import { component$ } from '@builder.io/qwik';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

export const Table = component$(() => {
  return (
    <div class="overflow-auto">
      <table class="min-w-full border-collapse mt-4 text-sm">
        <TableHeader />
        <TableBody />
      </table>
    </div>
  );
});
