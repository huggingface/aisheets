import { component$, useStore, useTask$ } from '@builder.io/qwik';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

import { useColumnsStore } from '~/state';

export const Table = component$(() => {
  const { state: columns } = useColumnsStore();

  const state = useStore<{
    selectedColumns: Record<string, number[] | undefined>;
    columnWidths: Record<string, number>;
  }>({
    selectedColumns: {},
    columnWidths: {},
  });

  useTask$(({ track }) => {
    track(columns);

    state.columnWidths = columns.value.reduce(
      (acc, column) => {
        acc[column.name] = 750;
        return acc;
      },
      {} as Record<string, number>,
    );
  });

  return (
    <div class="w-full overflow-x-auto">
      <table class="mt-8 w-full border-collapse bg-white text-sm">
        <TableHeader />
        <TableBody />
      </table>
    </div>
  );
});
