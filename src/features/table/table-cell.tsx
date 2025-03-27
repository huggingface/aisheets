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
import { getColumnCellById } from '~/services';
import { type Cell, type Column, useColumnsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';
import {
  AudioRenderer,
  ErrorContent,
  ImageRenderer,
  UnsupportedContent,
  VideoRenderer,
} from './components/cell-media-renderer';
import { processMediaContent } from './utils/binary-content';
import { detectMimeType, getMimeTypeCategory } from './utils/mime-types';

const loadCell = server$(async (cellId: string) => {
  const persistedCell = await getColumnCellById(cellId);
  if (!persistedCell) return;

  return {
    error: persistedCell.error,
    value: persistedCell.value,
    validated: persistedCell.validated,
  };
});

export const hasBlobContent = (column: Column): boolean => {
  return column.type.includes('BLOB');
};

export const isArrayType = (column: Column): boolean => {
  return column.type.includes('[]');
};

export const isObjectType = (column: Column): boolean => {
  return column.type.includes('STRUCT');
};

export const isEditableValue = (column: Column): boolean => {
  return (
    !hasBlobContent(column) && !isArrayType(column) && !isObjectType(column)
  );
};

export const CellContentRenderer = component$<{
  content: any;
  column: Column;
  isExpanded?: boolean;
}>(({ content, column, isExpanded = false }) => {
  if (!content && !column) {
    return null;
  }

  if (hasBlobContent(column)) {
    if (typeof content === 'string' && content.startsWith('<')) {
      const doc = new DOMParser().parseFromString(content, 'text/html');
      const mediaElement = doc.body.firstElementChild;

      if (mediaElement?.classList.contains('unsupported-content')) {
        return <UnsupportedContent content={content} />;
      }

      if (mediaElement?.classList.contains('error-content')) {
        return <ErrorContent content={content} />;
      }

      const src =
        mediaElement?.querySelector('img, video, audio')?.getAttribute('src') ||
        undefined;
      const path =
        mediaElement?.querySelector('.text-xs')?.textContent || undefined;

      if (content.includes('<video')) {
        return <VideoRenderer src={src} path={path} isExpanded={isExpanded} />;
      }

      if (content.includes('<audio')) {
        return <AudioRenderer src={src} path={path} isExpanded={isExpanded} />;
      }

      if (content.includes('<img')) {
        return <ImageRenderer src={src} path={path} isExpanded={isExpanded} />;
      }
    }

    return <div class="text-gray-500">Invalid media content</div>;
  }

  if (isObjectType(column)) {
    return <pre>{content}</pre>;
  }

  if (isArrayType(column)) {
    return <pre>{content}</pre>;
  }

  return <p>{content}</p>;
});

export const TableCell = component$<{
  cell: Cell;
}>(({ cell }) => {
  const { replaceCell, columns } = useColumnsStore();
  const validateCell = useValidateCellUseCase();

  const cellColumn: Signal<Column | undefined> = useComputed$(() =>
    columns.value.find((col) => col.id === cell.column?.id),
  );

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
      if (editCellValueInput.value instanceof HTMLTextAreaElement) {
        editCellValueInput.value.setSelectionRange(0, 0);
        editCellValueInput.value.scrollTop = 0;
      }
    }
  });

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

    if (hasBlobContent(column)) {
      return await processMediaContent(rawContent, isEditing.value);
    }

    if (isObjectType(column) || isArrayType(column)) {
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

        if (hasBlobContent(cellColumn.value!)) {
          const mimeType =
            cell.value?.mimeType ??
            detectMimeType(cell.value?.bytes, cell.value?.path);
          const category = getMimeTypeCategory(mimeType);

          if (category !== 'IMAGE') {
            return;
          }
        }

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
                <CellContentRenderer
                  content={content.value}
                  column={cellColumn.value!}
                  isExpanded={false}
                />
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
              {hasBlobContent(cellColumn.value!) ? (
                <div class="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-neutral-50">
                  <div class="max-w-full max-h-full overflow-auto">
                    <CellContentRenderer
                      content={content.value}
                      column={cellColumn.value!}
                      isExpanded={true}
                    />
                  </div>
                </div>
              ) : !isEditableValue(cellColumn.value!) ? (
                <div class="absolute inset-0 w-full h-full p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none overflow-auto whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <CellContentRenderer
                    content={content.value}
                    column={cellColumn.value!}
                  />
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
