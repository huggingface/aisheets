import { component$ } from '@builder.io/qwik';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

export const Table = component$(() => {
  return (
    <div class="overflow-x-auto">
      <table class="max-w-screen min-w-screen table-auto mt-4 border-collapse bg-white text-sm">
        <TableHeader />
        <TableBody />
      </table>
    </div>
  );
});
