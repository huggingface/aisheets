import { $, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { Skeleton } from '~/components/ui/skeleton/skeleton';
import { Textarea } from '~/components/ui/textarea/textarea';
import { type Cell, useColumnsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

export const TableCell = component$<{ cell: Cell; class?: string }>(
  ({ cell, class: className }) => {
    const isEditing = useSignal(false);
    const originalValue = useSignal(cell.value);
    const newCellValue = useSignal(cell.value);
    const { replaceCell } = useColumnsStore();

    const elementRef = useSignal<HTMLElement>();
    const editCellValueInput = useSignal<HTMLElement>();

    const validateCell = useValidateCellUseCase();

    useTask$(({ track }) => {
      track(() => isEditing.value);
      track(() => cell.value);

      originalValue.value = cell.value;

      if (isEditing.value) {
        newCellValue.value = originalValue.value;
        editCellValueInput.value?.focus();
      }
    });

    const onUpdateCell = $(async () => {
      originalValue.value = newCellValue.value;

      const success = await validateCell({
        id: cell.id,
        value: newCellValue.value!,
      });

      if (success) {
        replaceCell({
          ...cell,
          value: newCellValue.value,
          validated: true,
        });
      }

      isEditing.value = false;
    });

    // First check: Show skeleton for empty cells
    if (!cell.value && !cell.error) {
      return (
        <td class={`px-3 py-1 ${className}`}>
          <div class="flex flex-col gap-2">
            <Skeleton class="h-6 w-full" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-3 w-full" />
          </div>
        </td>
      );
    }

    // Second check: Show editing state
    if (isEditing.value) {
      return (
        <td ref={elementRef} class={`px-3 py-1 ${className}`}>
          <Textarea
            ref={editCellValueInput}
            bind:value={newCellValue}
            class="w-full min-h-[32px] resize-y border-0 rounded-none bg-transparent p-0 focus:outline-none focus:ring-0 text-sm"
            onKeyDown$={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) return;
                e.preventDefault();
                onUpdateCell();
              }
            }}
          />
        </td>
      );
    }

    // Default state: Show value or error
    return (
      <td
        class={`px-3 py-1 cursor-pointer ${className}`}
        onDblClick$={() => {
          isEditing.value = true;
        }}
      >
        {originalValue.value ? (
          <span class="text-gray-900 text-sm">{originalValue.value}</span>
        ) : (
          <span class="text-red-500 text-xs flex items-center gap-1">
            <span>⚠</span>
            <span>{cell.error}</span>
          </span>
        )}
      </td>
    );
  },
);
