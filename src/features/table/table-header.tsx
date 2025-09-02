import {
  $,
  Fragment,
  component$,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { nextTick } from '~/components/hooks/tick';
import { ExecutionForm, useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import {
  TableAddCellHeaderPlaceHolder,
  TableCellHeader,
} from '~/features/table/components/header';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableHeader = component$(() => {
  const MAX_WIDTH = 1000;
  const { columns, replaceColumns } = useColumnsStore();

  const resizingColumn = useSignal<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const columnsWidths = useStore<{
    [key: string]: number;
  }>({});
  const observers = useSignal(new Map());
  const draggedColId = useSignal<string | null>(null);
  const targetColId = useSignal<string | null>(null);

  const handleDragStart = $((e: DragEvent, id: string) => {
    draggedColId.value = id;
  });

  const handleDragOver = $((e: DragEvent, id: string) => {
    e.preventDefault();
    targetColId.value = id;
  });

  const handleDragLeave = $(() => {
    targetColId.value = null;
  });

  const handleDrop = $((e: DragEvent, targetId: string) => {
    e.preventDefault();

    const draggedId = draggedColId.value;
    if (!draggedId || draggedId === targetId) {
      draggedColId.value = null;
      targetColId.value = null;

      return;
    }

    const newOrder = columns.value.map((col) => col.id);

    const fromIndex = newOrder.indexOf(draggedId);
    const toIndex = newOrder.indexOf(targetId);

    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedId);

    draggedColId.value = null;
    replaceColumns(
      columns.value.sort(
        (a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id),
      ),
    );
    targetColId.value = null;
  });

  const handleResizeStart = $((event: MouseEvent, columnId: string) => {
    const handleResize = (event: MouseEvent) => {
      if (resizingColumn.value) {
        const deltaX = event.clientX - resizingColumn.value.startX;
        const newWidth = Math.min(
          MAX_WIDTH,
          resizingColumn.value.startWidth + deltaX,
        );
        columnsWidths[resizingColumn.value.columnId] = newWidth;
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
      startWidth: columnsWidths[columnId] || 326,
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
    headerElement.style.width = `${finalWidth}px`;

    for (const cell of bodyCells) {
      const cellElement = cell as HTMLElement;
      cellElement.style.width = `${finalWidth}px`;
    }
  });

  const setupMutationObserver = $(() => {
    for (const column of columns.value.filter((c) => c.visible)) {
      const headerElement = document.getElementById(`index-${column.id}`);
      if (headerElement && !observers.value.has(column.id)) {
        const observer = new MutationObserver(() => {
          const bodyCells = document.querySelectorAll(
            `td[data-column-id="${column.id}"]`,
          );

          const newWidth = headerElement.getBoundingClientRect().width;

          for (const cell of bodyCells) {
            const cellElement = cell as HTMLElement;

            cellElement.style.width = `${newWidth}px`;
            cellElement.style.minWidth = headerElement.style.minWidth;
          }
        });

        observer.observe(headerElement, {
          attributes: true,
          attributeFilter: ['style'],
        });

        observers.value.set(column.id, observer);
      }
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => columns.value);
    setupMutationObserver();
  });

  useVisibleTask$(({ cleanup }) => {
    const handleResize = () => {
      for (const column of columns.value.filter((c) => c.visible)) {
        const headerElement = document.getElementById(`index-${column.id}`);
        if (!headerElement) continue;

        const bodyCells = document.querySelectorAll(
          `td[data-column-id="${column.id}"]`,
        );

        const newWidth = headerElement.getBoundingClientRect().width;
        columnsWidths[column.id] = newWidth;

        for (const cell of bodyCells) {
          const cellElement = cell as HTMLElement;

          cellElement.style.width = `${newWidth}px`;
          cellElement.style.minWidth = headerElement.style.minWidth;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    cleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  useVisibleTask$(({ track }) => {
    track(draggedColId);

    if (draggedColId.value) {
      document
        .getElementById(draggedColId.value)
        ?.classList.add('opacity-50', 'bg-primary-50', 'dragging');
      for (const cell of document.querySelectorAll(
        `td[data-column-id="${draggedColId.value}"]`,
      )) {
        const cellElement = cell as HTMLElement;
        cellElement.classList.add('opacity-50', 'bg-primary-50', 'dragging');
      }
    } else {
      for (const cell of document.getElementsByClassName('dragging')) {
        const cellElement = cell as HTMLElement;
        cellElement.classList.remove('opacity-50', 'bg-primary-50');
      }
    }
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
                    'min-w-[142px] w-[326px] h-[38px] border bg-neutral-100 text-primary-600 font-normal relative select-none cursor-pointer',
                    {
                      'border-r-0': column.id === TEMPORAL_ID,
                      'border-2 border-blue-400':
                        targetColId.value === column.id &&
                        draggedColId.value !== targetColId.value,
                      'opacity-50 shadow-lg bg-primary-50':
                        draggedColId.value === column.id,
                    },
                  )}
                  style={{
                    width: `${columnsWidths[column.id] || 326}px`,
                  }}
                  draggable={true}
                  onDragStart$={(e) => handleDragStart(e, column.id)}
                  onDrop$={(e) => handleDrop(e, column.id)}
                  onDragOver$={(e) => handleDragOver(e, column.id)}
                  onDragLeave$={handleDragLeave}
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
