import {
  $,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
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

  const editCellValueInput = useSignal<HTMLElement>();
  const contentRef = useSignal<HTMLElement>();
  const isTruncated = useSignal(false);

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

  // Check truncation after DOM is ready and content is rendered
  useVisibleTask$(({ track }) => {
    track(() => originalValue.value);
    track(() => contentRef.value);

    if (contentRef.value) {
      const lineHeight = Number.parseInt(
        window.getComputedStyle(contentRef.value).lineHeight,
      );
      const maxHeight = lineHeight * 6;
      isTruncated.value = contentRef.value.scrollHeight > maxHeight;
    }
  });

  const onUpdateCell = $(async () => {
    const valueToUpdate = newCellValue.value;

    if (valueToUpdate === originalValue.value) {
      isEditing.value = false;
      return;
    }

    originalValue.value = valueToUpdate;

    const success = await validateCell({
      id: cell.id,
      value: valueToUpdate!,
    });

    if (success) {
      replaceCell({
        ...cell,
        value: valueToUpdate,
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
      <td class="relative min-h-[60px]">
        <Textarea
          ref={editCellValueInput}
          bind:value={newCellValue}
          preventEnterNewline
          class="absolute z-10 left-0 top-0 min-w-[400px] w-[200%] resize border-0 
            rounded-none bg-white px-3 py-2 focus:outline-none focus:ring-1 
            focus:ring-primary shadow-lg text-sm"
          style={{
            height: `${editCellValueInput.value?.scrollHeight || 60}px`,
            maxWidth: 'max(800px, 200%)',
          }}
          onKeyDown$={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                return;
              }
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
      <div class="relative text-sm">
        <div ref={contentRef} class="line-clamp-6 overflow-hidden">
          {originalValue.value ? (
            <Markdown class="text-gray-900" content={originalValue.value} />
          ) : (
            <span class="text-red-500 text-xs flex items-center gap-1">
              <span>⚠</span>
              <span>{cell.error}</span>
            </span>
          )}
        </div>
        {isTruncated.value && (
          <div class="absolute bottom-0 left-0 h-6 w-full bg-gradient-to-t from-white/75 to-transparent pointer-events-none" />
        )}
      </div>
    </td>
  );
});
