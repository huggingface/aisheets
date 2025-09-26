import {
  $,
  component$,
  Fragment,
  type Signal,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Popover, usePopover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import { useClickOutside } from '~/components/hooks/click/outside';
import { nextTick } from '~/components/hooks/tick';

import { useExecution } from '~/features/add-column';
import { useColumnsPreference } from '~/features/table/components/context/colunm-preferences.context';
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
  const { columnId } = useExecution();
  const { columnPreferences, resize } = useColumnsPreference();
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
    event.preventDefault();
    event.stopPropagation();

    const handleResize = (event: MouseEvent) => {
      if (resizingColumn.value) {
        const deltaX = event.clientX - resizingColumn.value.startX;
        const newWidth = Math.min(
          MAX_WIDTH,
          resizingColumn.value.startWidth + deltaX,
        );

        resize(resizingColumn.value.columnId, newWidth);
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
      startWidth: columnPreferences.value[columnId]?.width || 326,
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  });

  const autoResize = $((event: MouseEvent, column: Column) => {
    event.preventDefault();
    event.stopPropagation();

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

    resize(column.id, finalWidth);
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

  return (
    <thead class="box-border sticky top-0 bg-white z-50">
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
                  class={cn(
                    'min-w-[142px] w-[326px] max-h-[38px] h-[38px] border bg-neutral-100 text-primary-600 font-normal relative select-none cursor-grab group',
                    {
                      'opacity-50 shadow-lg bg-primary-50':
                        draggedColId.value === column.id,
                      'cursor-grabbing':
                        draggedColId.value === column.id ||
                        targetColId.value === column.id,
                      'bg-blue-50': column.id == columnId.value,
                      'shadow-[inset_2px_0_0_theme(colors.primary.400),inset_-2px_0_0_theme(colors.primary.400),inset_0_2px_0_theme(colors.primary.400)] rounded-tl-[6px] rounded-tr-[6px]':
                        columnPreferences.value[column.id]?.aiTooltipOpen,
                    },
                  )}
                  style={{
                    width: `${columnPreferences.value[column.id]?.width || 326}px`,
                  }}
                  onMouseDown$={(e) => handleManualDragStart(e, column.id)}
                >
                  <TableIndexTableHeader
                    column={column}
                    index={i}
                    draggedColId={draggedColId}
                  />

                  <span
                    class="absolute top-0 -right-[3px] w-[4px] h-full cursor-col-resize bg-transparent hover:bg-primary-100 z-10"
                    onMouseDown$={(e) => handleResizeStart(e, column.id)}
                    onDblClick$={(e) => autoResize(e, column)}
                  />
                </th>
              </Fragment>
            ),
        )}
      </tr>
      <tr>
        {columns.value
          .filter((c) => c.visible)
          .map((column) => (
            <TableCellHeader key={column.id} column={column} />
          ))}
      </tr>
    </thead>
  );
});

export const TableIndexTableHeader = component$<{
  column: Column;
  index: number;
  draggedColId: Signal<string | null>;
}>(({ column, index, draggedColId }) => {
  const popoverId = `ai-column-${column.id}-popover`;
  const anchorRef = useSignal<HTMLElement | undefined>();
  const { showPopover, hidePopover } = usePopover(popoverId);
  const { columnPreferences, openAiColumn, closeAiColumn } =
    useColumnsPreference();
  const { columnId } = useExecution();

  const indexToAlphanumeric = $((index: number): string => {
    let result = '';
    while (index > 0) {
      index--;
      result = String.fromCharCode('A'.charCodeAt(0) + (index % 26)) + result;
      index = Math.floor(index / 26);
    }
    return result;
  });

  const clickOutsideRef = useClickOutside(
    $(() => {
      nextTick(() => {
        hidePopover();
      });
    }),
  );

  const isAnyAiPromptOpen = useComputed$(() => {
    return (
      columnPreferences.value &&
      Object.values(columnPreferences.value).some((pref) => !!pref.aiPromptOpen)
    );
  });

  return (
    <Popover.Root
      ref={clickOutsideRef}
      flip={false}
      class="h-[38px]"
      gutter={-10}
      floating="top"
      id={popoverId}
      bind:anchor={anchorRef}
      manual
      onMouseLeave$={() => {
        if (isAnyAiPromptOpen.value) return;

        nextTick(() => {
          hidePopover();
        });
      }}
    >
      <div
        data-column-id={column.id}
        ref={anchorRef}
        class="h-[38px] w-full flex items-center justify-center"
        onMouseOver$={() => {
          if (draggedColId.value) return;
          if (isAnyAiPromptOpen.value) return;
          if (columnId.value === TEMPORAL_ID) return;

          showPopover();
        }}
      >
        {indexToAlphanumeric(index + 1)}
      </div>
      <Popover.Panel
        class="p-0"
        preventdefault:mousedown
        stoppropagation:mousedown
        onToggle$={(e) => {
          if (e.newState === 'open') {
            openAiColumn(column.id);
          } else {
            closeAiColumn(column.id);
          }
        }}
      >
        <TableAddCellHeaderPlaceHolder column={column} />
      </Popover.Panel>
    </Popover.Root>
  );
});
