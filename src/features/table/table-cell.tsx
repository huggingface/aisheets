import {
  $,
  type Signal,
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
import { Markdown } from '~/components/ui/markdown/markdown';
import { getColumnCellById } from '~/services';
import { type Cell, type Column, useColumnsStore } from '~/state';
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

  const cellColumn: Signal<Column | undefined> = useComputed$(() =>
    columns.value.find((col) => col.id === cell.column?.id),
  );

  // Determine if the column is static
  const isStatic = useComputed$(() => cellColumn.value?.kind === 'static');

  const isEditing = useSignal(false);
  const originalValue = useSignal(cell.value);
  const newCellValue = useSignal(cell.value);
  const isTruncated = useSignal(false);

  const editCellValueInput = useSignal<HTMLElement>();
  const contentRef = useSignal<HTMLElement>();

  useVisibleTask$(async () => {
    if (cell.generating) return;
    if (cell.error || cell.value) return;
    if (!cell.id) return;

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

  const onValidateCell = $(
    async (validatedContent: string, validated: boolean) => {
      const updatedCell = await validateCell({
        id: cell.id,
        idx: cell.idx,
        value: validatedContent,
        validated,
        column: cell.column!,
      });

      replaceCell({
        ...updatedCell,
        value: validatedContent,
        updatedAt: new Date(),
        validated,
      });
    },
  );

  const onUpdateCell = $(async () => {
    const valueToUpdate = newCellValue.value;

    if (!!newCellValue.value && newCellValue.value !== originalValue.value) {
      await onValidateCell(newCellValue.value, true);

      originalValue.value = valueToUpdate;
    }

    isEditing.value = false;
  });

  const content = useComputed$(async () => {
    if (!originalValue.value || !cellColumn.value) return undefined;

    const rawContent = originalValue.value;
    const column = cellColumn.value;

    if (isBinaryType(column)) {
      return await valueAsDataURI(rawContent);
    }

    if (isObjectType(column)) {
      return JSON.stringify(rawContent, null, 2);
    }

    if (isArrayType(column)) {
      return JSON.stringify(rawContent, null, 2);
    }

    return rawContent.toString();
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
              <div class="h-full mt-2 p-4">
                <CellContentRenderer content={content.value} />
              </div>
            </>
          )}

          {isEditing.value && (
            <div
              class="fixed z-20 bg-white border border-neutral-500 focus:border-secondary-300 focus:outline-none shadow-lg cursor-text"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '55rem',
                height: '700px',
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderWidth: '1px',
              }}
              onClick$={(e) => {
                e.stopPropagation();
                if (editCellValueInput.value) {
                  editCellValueInput.value.focus();
                }
              }}
            >
              {!isEditableValue(cellColumn.value!) ? (
                <div class="absolute inset-0 w-full h-full p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none overflow-auto whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <CellContentRenderer content={content.value} />
                </div>
              ) : (
                <Textarea
                  ref={editCellValueInput}
                  bind:value={newCellValue}
                  preventEnterNewline
                  class="absolute inset-0 w-full h-full p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none overflow-auto whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                  onKeyDown$={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) return;
                      e.preventDefault();
                      onUpdateCell();
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </td>
  );
});

export const isBinaryType = (column: Column): boolean => {
  return column.type.includes('BLOB');
};

export const isArrayType = (column: Column): boolean => {
  return column.type.includes('[]') && !isBinaryType(column);
};

export const isObjectType = (column: Column): boolean => {
  return column.type.includes('STRUCT') && !isBinaryType(column);
};

export const isEditableValue = (column: Column): boolean => {
  return !isBinaryType(column) && !isArrayType(column) && !isObjectType(column);
};

export const valueAsDataURI = async (
  value: any,
): Promise<string | undefined> => {
  if (Array.isArray(value)) return value.map(valueAsDataURI).join('\n');

  for (const key in value) {
    if (value[key] instanceof Uint8Array) {
      const bytes = value[key];
      const path = value.path ?? '';

      const blob = new Blob([bytes]);
      const reader = new FileReader();

      const dataURI = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      return `![${path}](${dataURI})`;
    }
  }

  throw new Error('No binary data found in object');
};

export const CellContentRenderer = component$<{
  content: any;
}>(({ content }) => {
  if (!content) {
    return null;
  }

  return <Markdown content={content} />;
});
