import { $, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { Skeleton } from '~/components/ui/skeleton/skeleton';
import { Textarea } from '~/components/ui/textarea/textarea';
import type { Cell } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

export const TableCell = component$<{ cell: Cell }>(({ cell }) => {
  const isEditing = useSignal(false);
  const originalValue = useSignal(cell.value);
  const newCellValue = useSignal(cell.value);

  const elementRef = useSignal<HTMLElement>();
  const editCellValueInput = useSignal<HTMLElement>();

  const validateCell = useValidateCellUseCase();

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

  if (!cell.value && !cell.error) {
    return (
      <td class="border-2 border-purple-200 px-2">
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
