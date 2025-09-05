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
  const columnsWidths = useStore<{ [key: string]: number }>({});
  const observers = useSignal(new Map());
  const draggedColId = useSignal<string | null>(null);
  const targetColId = useSignal<string | null>(null);

  const handleManualDragStart = $((e: MouseEvent, columnId: string) => {
    e.preventDefault();
    draggedColId.value = columnId;

    const move = (ev: MouseEvent) => {
      const el = document.elementFromPoint(
        ev.clientX,
        ev.clientY,
      ) as HTMLElement | null;
      if (el?.dataset.columnId && el.dataset.columnId !== columnId) {
        targetColId.value = el.dataset.columnId;
      } else {
        targetColId.value = null;
      }
    };

    const up = () => {
      if (
        draggedColId.value &&
        targetColId.value &&
        draggedColId.value !== targetColId.value
      ) {
        const newOrder = columns.value.map((col) => col.id);
        const fromIndex = newOrder.indexOf(draggedColId.value);
        const toIndex = newOrder.indexOf(targetColId.value);
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedColId.value);

        replaceColumns(
          columns.value.sort(
            (a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id),
          ),
        );
      }

      draggedColId.value = null;
      targetColId.value = null;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
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
      return Math.ceil(context.measureText(text).width);
    }

    for (const cell of bodyCells) {
      const cellElement = cell as HTMLElement;
      maxContentWidth = Math.max(
        maxContentWidth,
        measureTextWidth(cellElement.innerText, cellElement),
      );
    }

    maxContentWidth = Math.max(
      maxContentWidth,
      measureTextWidth(headerElement.innerText, headerElement),
    );
    const finalWidth = Math.min(maxContentWidth, MAX_WIDTH);

    headerElement.style.width = `${finalWidth}px`;
    for (const cell of bodyCells) {
      (cell as HTMLElement).style.width = `${finalWidth}px`;
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
          (cell as HTMLElement).style.width = `${newWidth}px`;
          (cell as HTMLElement).style.minWidth = headerElement.style.minWidth;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    cleanup(() => window.removeEventListener('resize', handleResize));
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

  const prevTargetColId = useSignal<string | null>(null);
  useVisibleTask$(({ track }) => {
    track(targetColId);

    const addBorder = (el: Element | null, isDraggingRight: boolean) => {
      if (isDraggingRight) {
        el?.classList.add('border-r-2', 'border-r-blue-500');
      } else {
        el?.classList.add('border-l-2', 'border-l-blue-500');
      }
    };

    const removeBorder = (el: Element | null) => {
      el?.classList.remove(
        'border-l-2',
        'border-l-blue-500',
        'border-r-2',
        'border-r-blue-500',
      );
    };

    if (prevTargetColId.value && prevTargetColId.value !== targetColId.value) {
      const prevTh = document.getElementById(`index-${prevTargetColId.value}`);
      removeBorder(prevTh);

      const prevHeader = document.getElementById(prevTargetColId.value);
      removeBorder(prevHeader);

      for (const cell of document.querySelectorAll(
        `td[data-column-id="${prevTargetColId.value}"]`,
      )) {
        removeBorder(cell);
      }
    }

    prevTargetColId.value = targetColId.value;

    if (targetColId.value && draggedColId.value) {
      const draggedIndex = columns.value.findIndex(
        (c) => c.id === draggedColId.value,
      );
      const targetIndex = columns.value.findIndex(
        (c) => c.id === targetColId.value,
      );

      const isDraggingRight = draggedIndex < targetIndex;

      const th = document.getElementById(`index-${targetColId.value}`);
      addBorder(th, isDraggingRight);

      const header = document.getElementById(targetColId.value);
      addBorder(header, isDraggingRight);

      for (const cell of document.querySelectorAll(
        `td[data-column-id="${targetColId.value}"]`,
      )) {
        addBorder(cell, isDraggingRight);
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
                  data-column-id={column.id}
                  class={cn(
                    'min-w-[142px] w-[326px] h-[38px] border bg-neutral-100 text-primary-600 font-normal relative select-none cursor-grab',
                    {
                      'border-r-0': column.id === TEMPORAL_ID,
                      'opacity-50 shadow-lg bg-primary-50':
                        draggedColId.value === column.id,
                      'cursor-grabbing':
                        draggedColId.value === column.id ||
                        targetColId.value === column.id,
                    },
                  )}
                  style={{ width: `${columnsWidths[column.id] || 326}px` }}
                  onMouseDown$={(e) => handleManualDragStart(e, column.id)}
                >
                  {indexToAlphanumeric(i + 1)}
                  <span
                    class="absolute top-0 -right-[3px] w-[4px] h-full cursor-col-resize bg-transparent hover:bg-primary-100 z-10"
                    onMouseDown$={(e) => handleResizeStart(e, column.id)}
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

  const state = useStore({ isVisible: columnId.value === column.id });

  useTask$(({ track }) => {
    track(() => columnId.value);
    nextTick(() => {
      state.isVisible = columnId.value === column.id;
    }, 100);
  });

  if (!state.isVisible) return null;

  return <ExecutionForm column={column} onGenerateColumn={onGenerateColumn} />;
});

const ExecutionHeaderDebounced = component$<{ column: Column }>(
  ({ column }) => {
    const { columnId } = useExecution();
    const state = useStore({ isVisible: columnId.value === column.id });

    useTask$(({ track }) => {
      track(() => columnId.value);
      nextTick(() => {
        state.isVisible = columnId.value === column.id;
      }, 100);
    });

    if (!state.isVisible) return null;

    return (
      <th class="min-w-[660px] w-[660px] h-[38px] bg-neutral-100 border" />
    );
  },
);
