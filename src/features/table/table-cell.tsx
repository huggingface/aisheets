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

    if (hasBlobContent(column)) {
      return await valueAsDataURI(rawContent, isEditing.value);
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

        // For blob content, only allow editing for images
        if (hasBlobContent(cellColumn.value!)) {
          const mimeType =
            cell.value?.mimeType ??
            detectMimeType(cell.value?.bytes, cell.value?.path);
          const category = getMimeTypeCategory(mimeType);

          // Only open editor for images
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
                <CellContentRenderer
                  content={content.value}
                  column={cellColumn.value!}
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

type SupportedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/ogg'
  | 'video/mp4'
  | 'video/webm'
  | 'video/ogg'
  | 'video/quicktime';

type MimeCategory = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'UNKNOWN';

// Define supported MIME type categories
const SUPPORTED_MIME_TYPES: Record<
  Exclude<MimeCategory, 'UNKNOWN'>,
  SupportedMimeType[]
> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
} as const;

const isMimeTypeSupported = (
  mimeType: string | undefined,
): mimeType is SupportedMimeType => {
  if (!mimeType) return false;
  return Object.values(SUPPORTED_MIME_TYPES)
    .flat()
    .includes(mimeType as SupportedMimeType);
};

const getMimeTypeCategory = (mimeType: string | undefined): MimeCategory => {
  if (!mimeType) return 'UNKNOWN';

  for (const [category, types] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (types.includes(mimeType as SupportedMimeType)) {
      return category as Exclude<MimeCategory, 'UNKNOWN'>;
    }
  }

  // If we have a mime type but it's not in our supported list
  const generalType = mimeType.split('/')[0].toUpperCase();
  return generalType as MimeCategory;
};

export const valueAsDataURI = async (
  value: any,
  isExpanded = false,
): Promise<string | undefined> => {
  if (!value) return undefined;

  // Handle array of binary content
  if (Array.isArray(value)) {
    const allValue = await Promise.all(
      value.map((v) => valueAsDataURI(v, isExpanded)),
    );
    return allValue.filter(Boolean).join('\n');
  }

  // Handle binary content
  for (const key in value) {
    if (value[key] instanceof Uint8Array) {
      const bytes = value[key];
      const path = value.path ?? '';
      const mimeType = value.mimeType ?? detectMimeType(bytes, path);
      const category = getMimeTypeCategory(mimeType);

      try {
        const blob = new Blob([bytes], { type: mimeType });
        const reader = new FileReader();

        const dataURI = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(blob);
        });

        if (!isMimeTypeSupported(mimeType)) {
          return `<div class="unsupported-content">
            <p class="text-gray-500">
              ${category} content type not supported yet
              <br/>
              <span class="text-xs">${mimeType || 'Unknown type'}</span>
              ${path ? `<br/><span class="text-xs">File: ${path}</span>` : ''}
            </p>
          </div>`;
        }

        // Add filename display for all media types
        const filenameDisplay = path
          ? `<div class="text-xs text-gray-500 mb-1">${path}</div>`
          : '';

        switch (category) {
          case 'VIDEO':
            return `<div class="flex flex-col">
              ${filenameDisplay}
              <video controls playsinline style="width: 100%; max-width: ${isExpanded ? '100%' : '600px'};">
                <source src="${dataURI}" type="${mimeType}">
                Your browser does not support the video tag.
              </video>
            </div>`;

          case 'AUDIO':
            return `<div class="flex flex-col">
              ${filenameDisplay}
              <audio controls src="${dataURI}" style="width: 100%; max-width: ${isExpanded ? '100%' : '400px'};"></audio>
            </div>`;

          case 'IMAGE':
            return `<div class="flex flex-col">
              ${filenameDisplay}
              <div class="relative w-full h-full flex items-center justify-center">
                <img 
                  src="${dataURI}" 
                  alt="${path}" 
                  class="${isExpanded ? 'max-w-full h-auto' : 'max-w-full max-h-[80px] object-contain'} rounded-sm"
                  style="width: auto;"
                />
              </div>
            </div>`;

          default:
            return `<div class="unsupported-content">
              <p class="text-gray-500">
                Unsupported content type
                <br/>
                <span class="text-xs">${mimeType || 'Unknown type'}</span>
                ${path ? `<br/><span class="text-xs">File: ${path}</span>` : ''}
              </p>
            </div>`;
        }
      } catch (error: unknown) {
        console.error('Error processing binary content:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return `<div class="error-content">
          <p class="text-red-500">
            Error processing content
            <br/>
            <span class="text-xs">${errorMessage}</span>
          </p>
        </div>`;
      }
    }
  }

  return undefined;
};

// Helper function to detect MIME type from file extension or magic numbers
const detectMimeType = (bytes: Uint8Array, path: string): string => {
  // Try to detect from file extension first
  if (path) {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext) {
      switch (ext) {
        // Video formats
        case 'mp4':
          return 'video/mp4';
        case 'webm':
          return 'video/webm';
        case 'ogv':
        case 'ogg':
          return 'video/ogg';
        case 'mov':
          return 'video/quicktime';
        // Audio formats
        case 'mp3':
          return 'audio/mpeg';
        case 'wav':
          return 'audio/wav';
        case 'oga':
          return 'audio/ogg';
        // Image formats
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'gif':
          return 'image/gif';
        case 'webp':
          return 'image/webp';
      }
    }
  }

  // Fallback to magic number detection for common formats
  const header = bytes.slice(0, 16); // Increased to 16 bytes for video detection

  // Check for MP4 (ftyp)
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return 'video/mp4';
  }

  // Check for WebM
  if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return 'video/webm';
  }

  // Check for QuickTime MOV
  if (
    header[4] === 0x6d &&
    header[5] === 0x6f &&
    header[6] === 0x6f &&
    header[7] === 0x76
  ) {
    return 'video/quicktime';
  }

  // Check for MP3 (ID3v2)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }

  // Check for WAV
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46
  ) {
    return 'audio/wav';
  }

  // Check for common image formats
  if (header[0] === 0xff && header[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return 'image/png';
  }

  return 'application/octet-stream';
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
        return (
          <div class="unsupported-content" dangerouslySetInnerHTML={content} />
        );
      }

      if (mediaElement?.classList.contains('error-content')) {
        return <div class="error-content" dangerouslySetInnerHTML={content} />;
      }

      const src =
        mediaElement?.querySelector('img, video, audio')?.getAttribute('src') ||
        undefined;
      const path =
        mediaElement?.querySelector('.text-xs')?.textContent || undefined;

      if (content.includes('<video')) {
        return (
          <div class="flex flex-col">
            {path && <div class="text-xs text-gray-500 mb-1">{path}</div>}
            <video
              controls
              playsInline
              style={{ width: '100%', maxWidth: isExpanded ? '100%' : '600px' }}
            >
              <source src={src} />
              <track kind="captions" />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      }

      if (content.includes('<audio')) {
        return (
          <div class="flex flex-col">
            {path && <div class="text-xs text-gray-500 mb-1">{path}</div>}
            <audio
              controls
              src={src}
              style={{ width: '100%', maxWidth: isExpanded ? '100%' : '400px' }}
            >
              <track kind="captions" />
            </audio>
          </div>
        );
      }

      if (content.includes('<img')) {
        return (
          <div class="flex flex-col">
            {path && <div class="text-xs text-gray-500 mb-1">{path}</div>}
            <div class="relative w-full h-full flex items-center justify-center">
              <img
                src={src}
                alt={path || ''}
                class={cn(
                  'rounded-sm',
                  isExpanded
                    ? 'max-w-full h-auto'
                    : 'max-w-full max-h-[80px] object-contain',
                )}
                style={{ width: 'auto' }}
              />
            </div>
          </div>
        );
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
