import { component$, useStore, useTask$ } from '@builder.io/qwik';
import {
  TbAlignJustified,
  TbBraces,
  TbBrackets,
  TbHash,
  TbSparkles,
  TbToggleLeft,
} from '@qwikest/icons/tablericons';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';

import {
  type Column,
  type ColumnKind,
  type ColumnType,
  useColumnsStore,
} from '~/state';

const Icons: Record<Column['type'], any> = {
  text: TbAlignJustified,
  number: TbHash,
  boolean: TbToggleLeft,
  object: TbBraces,
  array: TbBrackets,
};
export const ColumnIcon = component$<{ type: ColumnType; kind: ColumnKind }>(
  ({ type, kind }) => {
    if (kind === 'dynamic') return <TbSparkles />;

    const Icon = Icons[type];

    return <Icon />;
  },
);

export const Table = component$(() => {
  const { state: columns } = useColumnsStore();

  const state = useStore<{
    selectedColumns: Record<string, number[] | undefined>;
    selectedRows: string[];
    columnWidths: Record<string, number>;
  }>({
    selectedColumns: {},
    selectedRows: [],
    columnWidths: {},
  });

  useTask$(({ track }) => {
    track(() => columns);

    state.columnWidths = columns.value.reduce(
      (acc, column) => {
        acc[column.name] = 750;
        return acc;
      },
      {} as Record<string, number>,
    );
  });

  if (columns.value.length === 0) {
    return (
      <div class="overflow-x-auto">
        <div class="flex items-center justify-center p-4">
          <p class="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white text-sm">
        <TableHeader />
        <TableBody />
      </table>
    </div>
  );
});
