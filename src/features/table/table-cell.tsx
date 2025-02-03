import { $, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { Markdown } from '~/components/ui/markdown/markdown';
import { Skeleton } from '~/components/ui/skeleton/skeleton';
import { Textarea } from '~/components/ui/textarea/textarea';
import { type Cell, useColumnsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

export const TableCell = component$<{ cell: Cell }>(({ cell }) => {
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

  if (!cell.value && !cell.error) {
    return (
      <td class="px-3 h-[60px] border-r border-gray-200 last:border-r-0">
        <div class="flex flex-col gap-2">
          <Skeleton class="h-6 w-full" />
          <Skeleton class="h-3 w-full" />
        </div>
      </td>
    );
  }

  if (isEditing.value) {
    return (
      <td ref={elementRef} class="px-3 min-h-[60px]">
        <Textarea
          ref={editCellValueInput}
          bind:value={newCellValue}
          class="w-full resize-y border-0 rounded-none bg-transparent p-0 focus:outline-none focus:ring-0 text-sm"
          style={{
            height: `${editCellValueInput.value?.scrollHeight || 60}px`,
          }}
          onKeyDown$={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onUpdateCell();
            }
          }}
        />
      </td>
    );
  }

  return (
    <td
      class="px-3 h-[60px] cursor-pointer border-r border-gray-200 last:border-r-0 max-w-[300px]"
      onDblClick$={() => {
        isEditing.value = true;
      }}
    >
      <div class="line-clamp-6 text-sm overflow-hidden text-ellipsis">
        {originalValue.value ? (
          <Markdown class="text-gray-900" content={originalValue.value} />
        ) : (
          <span class="text-red-500 text-xs flex items-center gap-1">
            <span>⚠</span>
            <span>{cell.error}</span>
          </span>
        )}
      </div>
    </td>
  );
});
