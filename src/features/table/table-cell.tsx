import {
  $,
  component$,
  useComputed$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuThumbsUp } from '@qwikest/icons/lucide';
import { Button, Skeleton, Textarea } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { getColumnCellById } from '~/services';
import { type Cell, useColumnsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

const loadCell = server$(async (cellId: string) => {
  const persistedCell = await getColumnCellById(cellId);
  if (!persistedCell) return;

  return {
    error: persistedCell.error,
    value: persistedCell.value,
    validated: persistedCell.validated,
  };
});

export const TableCell = component$<{
  cell: Cell;
}>(({ cell }) => {
  const { replaceCell, columns } = useColumnsStore();
  const validateCell = useValidateCellUseCase();

  // Determine if the column is static
  const isStatic = useComputed$(() => {
    const column = columns.value.find((col) => col.id === cell.column?.id);
    return column?.kind === 'static';
  });

  const isEditing = useSignal(false);
  const originalValue = useSignal(cell.value);
  const newCellValue = useSignal(cell.value);
  const isTruncated = useSignal(false);

  const editCellValueInput = useSignal<HTMLElement>();
  const contentRef = useSignal<HTMLElement>();
  const modalHeight = useSignal('200px');

  useVisibleTask$(async () => {
    if (cell.generating) return;
    if (cell.error || cell.value) return;

    const persistedCell = await loadCell(cell.id);

    if (!persistedCell) return;

    replaceCell({
      ...cell,
      ...persistedCell,
    });
  });

  useTask$(({ track }) => {
    track(isEditing);
    track(() => cell.value);
    const scrollable = document.querySelector('.scrollable');

    originalValue.value = cell.value;

    if (isEditing.value) {
      newCellValue.value = originalValue.value;
    }

    if (scrollable) {
      if (isEditing.value) {
        scrollable.classList.add('overflow-hidden');
      } else {
        scrollable.classList.remove('overflow-hidden');
      }
    }
  });

  useVisibleTask$(({ track }) => {
    track(editCellValueInput);
    if (!editCellValueInput.value) return;
    track(isEditing);

    if (isEditing.value) {
      editCellValueInput.value.focus();
      // Position cursor at the beginning of the text
      if (editCellValueInput.value instanceof HTMLTextAreaElement) {
        editCellValueInput.value.setSelectionRange(0, 0);
        // Scroll to the top of the textarea
        editCellValueInput.value.scrollTop = 0;
      }
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

  useTask$(({ track }) => {
    track(() => newCellValue.value);

    if (!newCellValue.value) {
      modalHeight.value = '200px';
      return;
    }

    // Calculate height based on content
    const content = newCellValue.value;
    const lines = content.split('\n');
    const lineHeight = 20; // Line height in pixels
    const padding = 64; // 32px padding top + bottom
    const charsPerLine = 80; // Approximate chars that fit in 660px width with padding

    // Calculate height for each line considering wrapping
    let totalLines = 0;
    for (const line of lines) {
      if (line.length === 0) {
        totalLines += 1; // Empty lines
      } else {
        totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
    }

    // For very short content (single line with few characters), use minimal height
    if (lines.length === 1 && content.length < 50) {
      modalHeight.value = '100px';
      return;
    }

    const calculatedHeight = Math.min(
      totalLines * lineHeight + padding,
      window.innerHeight * 0.85,
    );
    modalHeight.value = `${Math.max(100, calculatedHeight)}px`;
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
          updatedAt: new Date(),
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

  return (
    <td
      class={cn(
        'relative min-w-80 w-80 max-w-80 cursor-pointer border-[0.5px] border-t-0 border-r-0 break-words align-top group',
        {
          'bg-green-50 border-green-300': cell.validated,
          'border-neutral-300': !cell.validated,
          'min-h-[100px] h-[100px]': true,
        },
      )}
      onDblClick$={(e) => {
        e.stopPropagation();
        isEditing.value = true;
      }}
      onClick$={() => {
        if (isEditing.value) {
          onUpdateCell();
        }
      }}
      ref={ref}
    >
      <div class="relative h-full">
        <div
          ref={contentRef}
          class="relative flex flex-col h-full overflow-hidden"
          style={{
            maxHeight: '8.5rem',
          }}
        >
          {cell.generating && (
            <div class="absolute inset-0 flex items-center justify-center">
              <Skeleton />
            </div>
          )}

          {cell.error ? (
            <span class="mt-2 p-4 text-red-500 text-xs flex items-center gap-1">
              <span>⚠</span>
              <span>{cell.error}</span>
            </span>
          ) : (
            <>
              {/* Only show validation button for non-static columns */}
              {!isStatic.value && (
                <Button
                  look="ghost"
                  hover={false}
                  size="sm"
                  class={cn(
                    'absolute z-10 text-base top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    cell.validated
                      ? 'bg-green-50/50 text-green-400 hover:bg-green-100'
                      : 'hover:bg-gray-100 text-gray-400',
                  )}
                  onClick$={(e) => {
                    e.stopPropagation();
                    onValidateCell(originalValue.value!, !cell.validated);
                  }}
                >
                  <LuThumbsUp class="text-sm" />
                </Button>
              )}
              <div class="h-full mt-2 p-4">{originalValue.value}</div>
            </>
          )}

          {isEditing.value && (
            <>
              {/* Backdrop */}
              <div class="fixed inset-0 bg-neutral-700/40 z-30" />

              <div
                class="fixed z-40 bg-white border border-neutral-500 shadow-sm"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '660px',
                  height: modalHeight.value,
                  borderWidth: '1px',
                }}
                onClick$={(e) => {
                  e.stopPropagation();
                  if (editCellValueInput.value) {
                    editCellValueInput.value.focus();
                  }
                }}
              >
                <Textarea
                  ref={editCellValueInput}
                  bind:value={newCellValue}
                  preventEnterNewline
                  look="ghost"
                  class="w-full h-full p-8 text-sm resize-none whitespace-pre-wrap break-words overflow-auto"
                  onKeyDown$={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) return;
                      e.preventDefault();
                      onUpdateCell();
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </td>
  );
});
