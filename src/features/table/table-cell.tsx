import {
  $,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuThumbsUp } from '@qwikest/icons/lucide';
import { Button, Skeleton, Textarea } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { Markdown } from '~/components/ui/markdown/markdown';
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
  isExpanded: boolean;
  onToggleExpand$: () => void;
}>(({ cell, isExpanded, onToggleExpand$ }) => {
  const { replaceCell } = useColumnsStore();
  const validateCell = useValidateCellUseCase();

  const isEditing = useSignal(false);
  const originalValue = useSignal(cell.value);
  const newCellValue = useSignal(cell.value);
  const isTruncated = useSignal(false);

  const editCellValueInput = useSignal<HTMLElement>();
  const contentRef = useSignal<HTMLElement>();

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
    track(newCellValue);

    editCellValueInput.value.focus();
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
        'relative min-w-80 w-80 max-w-80 cursor-pointer border-[0.5px] break-words align-top group',
        {
          'bg-green-50 border-green-300': cell.validated,
          'border-secondary': !cell.validated,
          'min-h-[100px] h-[100px]': !isExpanded,
          'min-h-[100px]': isExpanded,
        },
      )}
      onClick$={() => {
        if (isEditing.value) return;
        onToggleExpand$();
      }}
      onDblClick$={(e) => {
        e.stopPropagation();

        isEditing.value = true;
      }}
      ref={ref}
    >
      <div class={cn('relative', { 'h-full': !isExpanded })}>
        <div
          ref={contentRef}
          class={cn('relative flex flex-col', {
            'h-full': !isExpanded,
            'max-h-none': isExpanded,
            'overflow-hidden': !isExpanded,
          })}
          style={{
            maxHeight: isExpanded ? 'none' : '8.5rem',
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
              <div class="h-full mt-2 p-4">
                <Markdown
                  class="text-gray-900"
                  content={originalValue.value ?? ''}
                />
              </div>
            </>
          )}

          {isEditing.value && (
            <div
              class="fixed z-20 bg-white border border-green-300 focus:border-green-200 focus:outline-none shadow-lg cursor-text"
              style={{
                left:
                  Math.min(
                    ref.value?.getBoundingClientRect().left ?? 0,
                    window.innerWidth - 720, // 45rem = 720px
                  ) + 'px',
                top: ref.value?.getBoundingClientRect().top + 'px',
                width: '45rem',
                height: '300px',
              }}
              onClick$={() => {
                editCellValueInput.value!.focus();
              }}
            >
              <Textarea
                ref={editCellValueInput}
                bind:value={newCellValue}
                preventEnterNewline
                class="absolute inset-0 w-full h-full p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none overflow-auto whitespace-pre-wrap break-words"
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

        {isTruncated.value && !isExpanded && (
          <div class="absolute bottom-0 left-0 h-6 w-full bg-gradient-to-t from-white/75 to-transparent pointer-events-none" />
        )}
      </div>
    </td>
  );
});
