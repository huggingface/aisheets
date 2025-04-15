import { $, Fragment, component$, useStore, useTask$ } from '@builder.io/qwik';
import { nextTick } from '~/components/hooks/tick';
import { ExecutionForm, useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import {
  TableAddCellHeaderPlaceHolder,
  TableCellHeader,
} from '~/features/table/components/header';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableHeader = component$(() => {
  const { columns } = useColumnsStore();

  const indexToAlphanumeric = $((index: number): string => {
    let result = '';
    while (index > 0) {
      index--;
      result = String.fromCharCode('A'.charCodeAt(0) + (index % 26)) + result;
      index = Math.floor(index / 26);
    }
    return result;
  });

  return (
    <thead class="sticky top-0 bg-white z-20">
      <tr>
        <th
          class="min-w-1 w-1 max-w-1 min-h-[50px] h-[50px] px-4 py-2 border-[0.5px] rounded-tl-sm bg-neutral-100"
          rowSpan={2}
        />

        {columns.value.map(
          (column, i) =>
            column.visible && (
              <Fragment key={column.id}>
                <th
                  key={column.id}
                  class="min-w-80 w-80 max-w-80 h-[30px] border-[0.5px] border-l-0 bg-neutral-100 text-primary-600"
                >
                  {indexToAlphanumeric(i + 1)}
                </th>

                <ExecutionFormDebounced column={column} />
              </Fragment>
            ),
        )}

        {columns.value.filter((c) => c.id !== TEMPORAL_ID).length >= 1 && (
          <TableAddCellHeaderPlaceHolder />
        )}
      </tr>
      <tr>
        {columns.value
          .filter((c) => c.visible)
          .map((column) => (
            <Fragment key={column.id}>
              <TableCellHeader column={column} />

              <ExecutionHeaderDebounced column={column} />
            </Fragment>
          ))}
      </tr>
    </thead>
  );
});

const ExecutionFormDebounced = component$<{ column: Column }>(({ column }) => {
  const { onGenerateColumn } = useGenerateColumn();
  const { columnId } = useExecution();

  const state = useStore({
    isVisible: columnId.value === column.id,
  });

  useTask$(({ track }) => {
    track(() => columnId.value);
    const isVisible = columnId.value === column.id;

    nextTick(() => {
      state.isVisible = isVisible;
    }, 100);
  });

  if (!state.isVisible) return null;

  return <ExecutionForm column={column} onGenerateColumn={onGenerateColumn} />;
});

const ExecutionHeaderDebounced = component$<{ column: Column }>(
  ({ column }) => {
    const { columnId } = useExecution();

    const state = useStore({
      isVisible: columnId.value === column.id,
    });

    useTask$(({ track }) => {
      track(() => columnId.value);
      const isVisible = columnId.value === column.id;

      nextTick(() => {
        state.isVisible = isVisible;
      }, 100);
    });

    if (!state.isVisible) return null;

    return (
      <th class="min-w-[660px] w-[660px] bg-neutral-100 border-[0.5px] border-l-0" />
    );
  },
);
