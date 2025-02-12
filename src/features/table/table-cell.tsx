import {
  $,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { LuThumbsUp } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { Markdown } from '~/components/ui/markdown/markdown';
import { Skeleton } from '~/components/ui/skeleton/skeleton';
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
    track(originalValue);
    track(contentRef);

    if (contentRef.value) {
      const lineHeight = Number.parseInt(
        window.getComputedStyle(contentRef.value).lineHeight,
      );
      const maxHeight = lineHeight * 6;
      isTruncated.value = contentRef.value.scrollHeight > maxHeight;
    }
  });

  const onValidateCell = $(async (validatedContent: string) => {
    const response = await validateCell({
      id: cell.id,
      value: validatedContent,
    });

    if (response?.ok) {
      replaceCell({
        ...cell,
        value: validatedContent,
        validated: response.validated,
      });
    }

    return response?.ok;
  });

  const onUpdateCell = $(async () => {
    const valueToUpdate = newCellValue.value;

    if (!!newCellValue.value && newCellValue.value !== originalValue.value) {
      const success = await onValidateCell(newCellValue.value);

      if (success) {
        originalValue.value = valueToUpdate;
      }
    }

    isEditing.value = false;
  });

  const ref = useClickOutside(onUpdateCell);

  if (!cell.value && !cell.error) {
    return (
      <td class="min-w-80 w-80 max-w-80 p-4 min-h-[100px] h-[100px] border last:border-r-0 border-secondary">
        <Skeleton />
      </td>
    );
  }

  if (isEditing.value) {
    return (
      <td class="relative min-h-[60px]" ref={ref}>
        <Textarea
          ref={editCellValueInput}
          bind:value={newCellValue}
          preventEnterNewline
          class="absolute z-10 left-0 top-0 min-w-[400px] w-[200%] min-h-[127px] h-[127px] resize border-0 rounded-none bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary shadow-lg text-sm"
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
      class={`min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] cursor-pointer border-[0.5px] ${cell.validated ? 'bg-green-50 border-green-200' : 'border-secondary'}`}
      onDblClick$={() => {
        isEditing.value = true;
      }}
    >
      <div class="text-sm h-full">
        <div ref={contentRef} class="relative flex flex-col h-full">
          {originalValue.value ? (
            <>
              <Button
                look="ghost"
                hover={false}
                size="sm"
                class={`absolute text-base top-0 right-0 ${cell.validated ? 'text-green-200' : 'text-primary-foreground'}`}
                onClick$={() => onValidateCell(originalValue.value!)}
              >
                <LuThumbsUp />
              </Button>
              <div class="h-full flex items-start mt-2 p-4">
                <Markdown class="text-gray-900" content={originalValue.value} />
              </div>
            </>
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
