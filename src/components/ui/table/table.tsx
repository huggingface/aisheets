import { component$, type Signal, useStore, useTask$ } from '@builder.io/qwik';
import {
  TbAlignJustified,
  TbBraces,
  TbBrackets,
  TbToggleLeft,
  TbHash,
  TbSparkles,
} from '@qwikest/icons/tablericons';

import type { Column, ColumnKind, ColumnType } from '~/state';

interface Props {
  columns: Signal<Column[]>;
}

const Icons: Record<Column['type'], any> = {
  text: TbAlignJustified,
  number: TbHash,
  boolean: TbToggleLeft,
  object: TbBraces,
  array: TbBrackets,
};
const ColumnIcon = component$<{ type: ColumnType; kind: ColumnKind }>(
  ({ type, kind }) => {
    if (kind === 'dynamic') return <TbSparkles />;

    const Icon = Icons[type];

    return <Icon />;
  },
);

export const Table = component$<Props>(({ columns }) => {
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
        <TableHeader columns={columns.value} />
        <TableBody columns={columns.value} />
      </table>
    </div>
  );
});

const TableHeader = component$<{ columns: Column[] }>(({ columns }) => (
  <thead>
    <tr>
      <th class="max-w-8 border bg-gray-50 px-2 py-2 text-center hover:bg-sky-100">
        <input type="checkbox" />
      </th>

      {columns.map((column) => (
        <th
          key={column.id}
          class="bg-purple-200 text-left font-light hover:bg-purple-50"
        >
          <div class="flex flex-row items-center justify-between">
            <div class="flex w-full items-center gap-1 px-2">
              <ColumnIcon type={column.type} kind={column.kind} />
              {column.name}
            </div>
            <div class="h-8  w-2 cursor-col-resize" />
          </div>
        </th>
      ))}
    </tr>
  </thead>
));

const TableBody = component$<{ columns: Column[] }>(({ columns }) => {
  const rowCount = columns[0]?.cells.length || 0;

  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} class="hover:bg-gray-100">
          <td class="max-w-6 border px-2 py-2 text-center">
            <input type="checkbox" />
          </td>
          {columns.map((column) => {
            const cell = column.cells[rowIndex];
            return (
              <td
                class="cursor-pointer text-wrap border-2 border-purple-200 px-2"
                key={`${column.id}-${rowIndex}`}
              >
                {cell.value}
                {cell.error && (
                  <span style={{ color: 'red', marginLeft: '8px' }}>
                    ⚠ {cell.error}
                  </span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});
