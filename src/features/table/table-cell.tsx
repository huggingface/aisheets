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

const loadCell = server$(async (cellId: string) => {
  const persistedCell = await getColumnCellById(cellId);
  if (!persistedCell) return;

  return {
    error: persistedCell.error,
    value: persistedCell.value,
    validated: persistedCell.validated,
  };
});

export const hasBlobContent = (column: Column | undefined): boolean => {
  return column?.type?.includes('BLOB') ?? false;
};

export const isArrayType = (column: Column): boolean => {
  return column?.type?.includes('[]');
};

export const isObjectType = (column: Column): boolean => {
  return column?.type?.startsWith('STRUCT') || column?.type?.startsWith('MAP');
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

  const cellColumn = useSignal<Column | undefined>();
  const isStatic = useSignal(false);
  const isEditing = useSignal(false);
  const originalValue = useSignal(cell.value);
  const newCellValue = useSignal(cell.value);
  const isTruncated = useSignal(false);
  const contentValue = useSignal<string | undefined>(undefined);
  const contentCategory = useSignal<string | undefined>(undefined);
  const isInViewport = useSignal(false);

  const editCellValueInput = useSignal<HTMLElement>();
  const contentRef = useSignal<HTMLElement>();
  const modalHeight = useSignal('200px');

  // Track viewport visibility
  useVisibleTask$(({ track }) => {
    track(contentRef);
    if (!contentRef.value) return;

    const observer = new IntersectionObserver(
      (entries) => {
        isInViewport.value = entries[0].isIntersecting;
      },
      { threshold: 0.1 },
    );

    observer.observe(contentRef.value);
    return () => observer.disconnect();
  });

  // Track column changes
  useTask$(({ track }) => {
    track(() => columns.value);
    cellColumn.value = columns.value.find((col) => col.id === cell.column?.id);
    isStatic.value = cellColumn.value?.kind === 'static';
  });

  // Process content
  useTask$(async ({ track }) => {
    track(originalValue);
    track(cellColumn);
    track(isEditing);
    track(isInViewport);

    // Skip processing if not in viewport and not being edited
    if (!isInViewport.value && !isEditing.value) {
      contentValue.value = undefined;
      return;
    }

    // Early return if cell or column is not properly initialized
    if (!cellColumn.value) {
      contentValue.value = undefined;
      return;
    }

    // Early return if no value to process
    if (originalValue.value === undefined || originalValue.value === null) {
      contentValue.value = undefined;
      return;
    }

    const rawContent = originalValue.value;
    const column = cellColumn.value;

    try {
      if (hasBlobContent(column)) {
        const processBlob = async (content: any): Promise<any> => {
          if (Array.isArray(content)) {
            const divs = await Promise.all(
              content.map((item) => processBlob(item)),
            );
            contentValue.value = `<div>${divs.join(' ')}</div>`;
          }
          // Only process if we have valid content
          if (!content || !content.bytes) {
            return contentValue.value;
          }

          const processedInfo = await processMediaContent(
            content,
            isEditing.value,
          );

          if (processedInfo) {
            contentValue.value = processedInfo.content;
            contentCategory.value = processedInfo.category;
          } else {
            contentValue.value =
              '<div class="error-content">Unable to process media content</div>';
          }

          return contentValue.value;
        };

        contentValue.value = await processBlob(rawContent);
      } else if (isObjectType(column) || isArrayType(column)) {
        contentValue.value = JSON.stringify(rawContent, null, 2);
      } else {
        contentValue.value = rawContent.toString();
      }
    } catch (error) {
      console.error('Error processing content:', error);
      contentValue.value =
        '<div class="error-content">Error processing content</div>';
    }
  });

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

  useTask$(({ track }) => {
    track(() => newCellValue.value);

    if (
      !newCellValue.value ||
      !isEditableValue(newCellValue.value) ||
      !(typeof newCellValue.value === 'string')
    ) {
      modalHeight.value = '320px';
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

        if (hasBlobContent(cellColumn.value)) {
          if (!contentValue.value) return;
          if (contentCategory.value !== 'IMAGE') return;
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
                {!contentValue.value && hasBlobContent(cellColumn.value) ? (
                  <div class="flex items-center justify-center h-full">
                    <div class="w-full h-full max-w-[120px] max-h-[80px] bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : (
                  <CellContentRenderer
                    content={contentValue.value}
                    column={cellColumn.value!}
                    isExpanded={false}
                  />
                )}
              </div>
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
                {hasBlobContent(cellColumn.value) ? (
                  <div class="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-neutral-50">
                    <div class="max-w-full max-h-full overflow-auto">
                      <CellContentRenderer
                        content={contentValue.value}
                        column={cellColumn.value!}
                        isExpanded={true}
                      />
                    </div>
                  </div>
                ) : !isEditableValue(cellColumn.value!) ? (
                  <div class="absolute inset-0 w-full h-full p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none overflow-auto whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    <CellContentRenderer
                      content={contentValue.value}
                      column={cellColumn.value!}
                    />
                  </div>
                ) : (
                  <Textarea
                    ref={editCellValueInput}
                    bind:value={newCellValue}
                    preventEnterNewline
                    look="ghost"
                    class="w-full h-full p-8 text-base resize-none whitespace-pre-wrap break-words overflow-auto"
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
            </>
          )}
        </div>
      </div>
    </td>
  );
});
