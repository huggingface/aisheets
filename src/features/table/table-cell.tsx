import {
  $,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
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
    track(isEditing);
    track(() => cell.value);

    originalValue.value = cell.value;

    if (isEditing.value) {
      newCellValue.value = originalValue.value;
    }
  });

  useVisibleTask$(({ track }) => {
    track(editCellValueInput);
    if (!editCellValueInput.value) return;
    track(newCellValue);

    editCellValueInput.value.focus();
    editCellValueInput.value.style.height = 'auto';
    editCellValueInput.value.style.height = `${editCellValueInput.value?.scrollHeight}px`;
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

  const onValidateCell = $(
    async (validatedContent: string, validated: boolean) => {
      const ok = await validateCell({
        id: cell.id,
        value: validatedContent,
        validated,
      });

      if (ok) {
        replaceCell({
          ...cell,
          value: validatedContent,
          validated,
        });
      }

      return ok;
    },
  );

  const onUpdateCell = $(async () => {
    const valueToUpdate = newCellValue.value;

    if (!!newCellValue.value && newCellValue.value !== originalValue.value) {
      const success = await onValidateCell(newCellValue.value, true);

      if (success) {
        originalValue.value = valueToUpdate;
      }
    }

    isEditing.value = false;
  });

  const ref = useClickOutside(
    $(() => {
      if (!isEditing.value) return;

      onUpdateCell();
    }),
  );

  if (!cell.value && !cell.error) {
    return (
      <td class="min-w-80 w-80 max-w-80 p-4 min-h-[100px] h-[100px] border last:border-r-0 border-secondary">
        <Skeleton />
      </td>
    );
  }

  return (
    <td
      class={cn(
        'relative min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] cursor-pointer border-[0.5px]',
        {
          'bg-green-50 border-green-200': cell.validated,
          'border-secondary': !cell.validated,
        },
      )}
      onDblClick$={() => {
        isEditing.value = true;
      }}
      ref={ref}
    >
      <div class="h-full relative">
        <div ref={contentRef} class="relative flex flex-col h-full">
          {originalValue.value ? (
            <>
              <Button
                look="ghost"
                hover={false}
                size="sm"
                class={`absolute text-base top-0 right-0 ${
                  cell.validated ? 'text-green-200' : 'text-primary-foreground'
                }`}
                onClick$={() =>
                  onValidateCell(originalValue.value!, !cell.validated)
                }
              >
                <LuThumbsUp />
              </Button>
              <div class="h-full flex items-start mt-2 p-4">
                <Markdown class="text-gray-900" content={originalValue.value} />
              </div>
            </>
          ) : (
            <span class="mt-2 p-4 text-red-500 text-xs flex items-center gap-1">
              <span>⚠</span>
              <span>{cell.error}</span>
            </span>
          )}

          {isEditing.value && (
            <div
              class="absolute top-1/2 w-[45rem] h-[calc(100%+50px)] left-0 transform -translate-y-1/2 z-10 flex items-center justify-center bg-white border border-green-200 focus:border-green-200 focus:outline-none shadow-lg cursor-text"
              onClick$={() => {
                editCellValueInput.value!.focus();
              }}
            >
              <Textarea
                ref={editCellValueInput}
                bind:value={newCellValue}
                preventEnterNewline
                class="w-full h-full overflow-hidden p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none"
                onKeyDown$={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) return;
                    e.preventDefault();
                    onUpdateCell();
                  }
                }}
              />
            </div>
          )}
        </div>

        {isTruncated.value && (
          <div class="absolute bottom-0 left-0 h-6 w-full bg-gradient-to-t from-white/75 to-transparent pointer-events-none" />
        )}
      </div>
    </td>
  );
});
