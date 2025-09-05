import {
  $,
  Fragment,
  component$,
  useSignal,
  useStore,
  useTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { nextTick } from '~/components/hooks/tick';
import { ExecutionForm, useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import { useColumnsSizeContext } from '~/features/table/components/context/colunm-preferences.context';
import {
  TableAddCellHeaderPlaceHolder,
  TableCellHeader,
} from '~/features/table/components/header';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableHeader = component$(() => {
  const MAX_WIDTH = 1000;
  const { columns } = useColumnsStore();

  const resizingColumn = useSignal<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const { columnSize, update } = useColumnsSizeContext();

  const handleResizeStart = $(async (event: MouseEvent, columnId: string) => {
    const handleResize = (event: MouseEvent) => {
      if (resizingColumn.value) {
        const deltaX = event.clientX - resizingColumn.value.startX;
        const newWidth = Math.min(
          MAX_WIDTH,
          resizingColumn.value.startWidth + deltaX,
        );
        update(resizingColumn.value.columnId, newWidth);
      }
    };

    const handleResizeEnd = () => {
      resizingColumn.value = null;
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    resizingColumn.value = {
      columnId,
      startX: event.clientX,
      startWidth: columnSize.value[columnId] || 326,
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  });

  const autoResize = $((column: Column) => {
    const headerElement = document.getElementById(`index-${column.id}`)!;
    const bodyCells = document.querySelectorAll(
      `td[data-column-id="${column.id}"]`,
    );

    let maxContentWidth = 0;

    function measureTextWidth(text: string, element: HTMLElement): number {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      const style = window.getComputedStyle(element);

      context.font = `${style.fontSize} ${style.fontFamily}`;
      const width = context.measureText(text).width;

      return Math.ceil(width);
    }

    for (const cell of bodyCells) {
      const cellElement = cell as HTMLElement;

      const contentWidth = measureTextWidth(cellElement.innerText, cellElement);
      maxContentWidth = Math.max(maxContentWidth, contentWidth);
    }

    const headerContentWidth = measureTextWidth(
      headerElement.innerText,
      headerElement,
    );
    maxContentWidth = Math.max(maxContentWidth, headerContentWidth);

    const finalWidth = Math.min(maxContentWidth, MAX_WIDTH);
    update(column.id, finalWidth);
  });

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
    <thead class="sticky top-0 bg-white z-50">
      <tr>
        <th
          class="sticky left-0 z-[10] min-w-10 w-10 min-h-[50px] h-[50px] p-2 border rounded-tl-sm bg-neutral-100"
          rowSpan={2}
        />

        {columns.value.map(
          (column, i) =>
            column.visible && (
              <Fragment key={column.id}>
                <th
                  id={`index-${column.id}`}
                  key={column.id}
                  class={cn(
                    'min-w-[142px] w-[326px] h-[38px] border bg-neutral-100 text-primary-600 font-normal relative select-none',
                    {
                      'border-r-0': column.id === TEMPORAL_ID,
                    },
                  )}
                  style={{
                    width: `${columnSize.value[column.id] || 326}px`,
                  }}
                >
                  {indexToAlphanumeric(i + 1)}
                  <span
                    class="absolute top-0 -right-[3px] w-[4px] h-full cursor-col-resize bg-transparent hover:bg-primary-100 z-10"
                    onMouseDown$={$((e) => handleResizeStart(e, column.id))}
                    onDblClick$={() => autoResize(column)}
                  />
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
      <th class="min-w-[660px] w-[660px] h-[38px] bg-neutral-100 border" />
    );
  },
);
