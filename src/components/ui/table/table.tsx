import {
  $,
  component$,
  useOn,
  useSignal,
  useStore,
  useTask$,
} from '@builder.io/qwik';
import {
  TbAlignJustified,
  TbBraces,
  TbBrackets,
  TbHash,
  TbSparkles,
  TbToggleLeft,
} from '@qwikest/icons/tablericons';
import { useModals } from '~/components/hooks';
import { Textarea } from '~/components/ui/textarea/textarea';
import { RunExecutionSidebar } from '~/features/run-execution/run-execution-sidebar';

import {
  type Cell,
  type Column,
  type ColumnKind,
  type ColumnType,
  useColumnsStore,
} from '~/state';
import { useReRunExecution } from '~/usecases/run-execution.usecase';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

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

const TableHeader = component$(() => {
  const { state: columns, replaceCell } = useColumnsStore();
  const runExecution = useReRunExecution();
  const { openRunExecutionSidebar, closeRunExecutionSidebar } = useModals(
    'runExecutionSidebar',
  );
  const selectedColumnForExecution = useSignal<Column>();

  const handleHeaderClick = $((columnSelected: Column) => {
    selectedColumnForExecution.value = columnSelected;

    openRunExecutionSidebar();
  });

  const onRunExecution = $(async (columnId: string) => {
    closeRunExecutionSidebar();

    const response = await runExecution(columnId);

    for await (const { cell } of response) {
      replaceCell(cell);
    }
  });

  return (
    <thead>
      <tr>
        <th class="max-w-8 border bg-gray-50 px-2 py-2 text-center hover:bg-sky-100">
          <input type="checkbox" />
        </th>

        {columns.value.map((column) => (
          <th
            key={column.id}
            class="bg-purple-200 text-left font-light hover:bg-purple-50"
            onDblClick$={() => handleHeaderClick(column)}
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

      <RunExecutionSidebar
        column={selectedColumnForExecution}
        onRunExecution={onRunExecution}
      />
    </thead>
  );
});

const TableBody = component$(() => {
  const { state: columns } = useColumnsStore();
  const rowCount = columns.value[0]?.cells.length || 0;

  const getCell = (column: Column, rowIndex: number): Cell => {
    const cell = column.cells[rowIndex];

    if (!cell) {
      return {
        id: `${column.id}-${rowIndex}`,
        value: '',
        error: 'No data',
        validated: false,
        columnId: column.id,
        updatedAt: new Date(),
        idx: rowIndex,
      };
    }

    return cell;
  };

  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} class="hover:bg-gray-100">
          <td class="max-w-6 border px-2 py-2 text-center">
            <input type="checkbox" />
          </td>
          {columns.value.map((column) => {
            const cell = getCell(column, rowIndex);

            return (
              <TableCell key={`${cell.id}-${cell.updatedAt}`} cell={cell} />
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});

const TableCell = component$<{ cell: Cell }>(({ cell }) => {
  const isEditing = useSignal(false);
  const originalValue = useSignal(cell.value);
  const newCellValue = useSignal(cell.value);

  const elementRef = useSignal<HTMLElement>();
  const editCellValueInput = useSignal<HTMLElement>();

  const validateCell = useValidateCellUseCase();

  useOn(
    'click',
    $((event) => {
      const target = event.target as HTMLElement;
      if (elementRef.value && !elementRef.value.contains(target)) {
        isEditing.value = false;
      }
    }),
  );

  useTask$(({ track }) => {
    track(isEditing);

    if (isEditing.value) {
      originalValue.value = cell.value;

      newCellValue.value = originalValue.value;

      editCellValueInput.value?.focus();
    }
  });

  const onUpdateCell = $(async () => {
    originalValue.value = newCellValue.value;

    await validateCell({
      id: cell.id,

      value: newCellValue.value!,
    });

    isEditing.value = false;
  });

  if (isEditing.value) {
    return (
      <td
        ref={elementRef}
        class="cursor-pointer text-wrap border-2 border-purple-200 px-2"
      >
        <Textarea
          ref={editCellValueInput}
          bind:value={newCellValue}
          onKeyUp$={(e) => {
            if (e.key === 'Enter' && e.altKey) {
              onUpdateCell();
            }
          }}
        />
      </td>
    );
  }

  return (
    <td
      class="cursor-pointer text-wrap border-2 border-purple-200 px-2"
      onDblClick$={() => {
        isEditing.value = true;
      }}
    >
      {originalValue.value ? (
        originalValue.value
      ) : (
        <span class="text-red-500 ml-2">⚠ {cell.error}</span>
      )}
    </td>
  );
});
