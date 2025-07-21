import {
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import {
  LuArrowUpRight,
  LuGlobe,
  LuThumbsUp,
  LuX,
} from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { type Cell, useColumnsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

function getDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return url;
  }
}

export const CellActions = component$<{ cell: Cell }>(({ cell }) => {
  const { columns } = useColumnsStore();
  const validateCell = useValidateCellUseCase();
  const showSourcesModal = useSignal(false);
  const isStatic = useSignal(false);

  useTask$(({ track }) => {
    track(() => columns.value);
    const cellColumn = columns.value.find((col) => col.id === cell.column?.id);
    isStatic.value = cellColumn?.kind === 'static';
  });

  useVisibleTask$(() => {
    const handler = () => {
      showSourcesModal.value = false;
    };
    window.addEventListener('closeAllSourcesModals', handler);
    return () => window.removeEventListener('closeAllSourcesModals', handler);
  });

  if (isStatic.value) return null;

  return (
    <>
      <div class="absolute h-full w-full z-40 bottom-0 right-0">
        <div class="flex flex-col items-end justify-center w-full h-full">
          <div class="flex flex-col justify-end items-center gap-1 h-full p-2">
            <Button
              look="ghost"
              size="sm"
              class={cn(
                'opacity-0 group-hover:opacity-100 transition-opacity visible rounded-full w-[30px] h-fit text-white bg-neutral-600 p-2 hover:shadow-md shadow-neutral-700 hover:bg-neutral-700',
                {
                  hidden: !cell.value || !cell.sources?.length,
                },
              )}
              onClick$={() => {
                if (cell.sources?.length) {
                  window.dispatchEvent(
                    new CustomEvent('closeAllSourcesModals'),
                  );
                  showSourcesModal.value = true;
                }
              }}
            >
              <Tooltip text="View sources" floating="right" gutter={12}>
                <LuGlobe class="text-sm" />
              </Tooltip>
            </Button>
            <Button
              look="ghost"
              size="sm"
              class={cn(
                'opacity-0 group-hover:opacity-100 transition-opacity visible rounded-full w-[30px] h-fit text-white bg-neutral-600 p-2 hover:shadow-md shadow-neutral-700 hover:bg-neutral-700',
                {
                  'bg-secondary-400 shadow-secondary-400 hover:bg-secondary-400 hover:text-secondary-200 opacity-100':
                    cell.validated,
                  hidden: !cell.value,
                },
              )}
              onClick$={() => {
                validateCell(cell, cell.value, !cell.validated);
              }}
            >
              <Tooltip
                text="Mark as a good example"
                floating="right"
                gutter={12}
              >
                <LuThumbsUp class="text-sm" />
              </Tooltip>
            </Button>
          </div>
        </div>
      </div>

      {showSourcesModal.value && (
        <div
          stoppropagation:click
          class="fixed top-0 right-0 h-full w-[400px] z-[100] bg-white border-l border-neutral-300 shadow-lg flex flex-col sources-side-modal"
          style={{ minHeight: '100vh' }}
          window:onCloseSourcesModal$={() => {
            showSourcesModal.value = false;
          }}
        >
          <div class="flex justify-between items-center p-4 border-b border-neutral-200">
            <span class="font-semibold text-lg text-neutral-700">Sources</span>
            <Button
              look="ghost"
              class="p-1.5 rounded-full hover:bg-neutral-200 cursor-pointer"
              onClick$={() => {
                showSourcesModal.value = false;
              }}
              aria-label="Close"
            >
              <LuX class="text-lg text-neutral" />
            </Button>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <ul class="ml-2 mt-2 space-y-4">
              {(() => {
                if (!cell.sources) return null;
                // Group unique snippets by URL
                const grouped = cell.sources.reduce(
                  (acc, source) => {
                    const normalizedSnippet = source.snippet
                      .trim()
                      .replace(/\s+/g, ' ');
                    if (!acc[source.url]) acc[source.url] = [];
                    if (!acc[source.url].some((s) => s === normalizedSnippet)) {
                      acc[source.url].push(normalizedSnippet);
                    }
                    return acc;
                  },
                  {} as Record<string, string[]>,
                );
                return Object.entries(grouped).map(([url, snippets]) => {
                  const domain = getDomain(url);
                  return (
                    <div
                      key={url}
                      class="bg-white p-4 transition-colors cursor-pointer hover:bg-neutral-100 hover:rounded-sm source-group"
                      onClick$={() => window.open(url, '_blank')}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open source: ${domain}`}
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-600 font-medium text-xs source-domain">
                          {domain}
                        </span>
                        <LuArrowUpRight class="text-neutral text-base ml-2" />
                      </div>
                      <ul class="ml-2 mt-2 space-y-4">
                        {snippets.map((snippet, j) => {
                          if (!snippet) return null;
                          return (
                            <li
                              key={j}
                              class="block text-primary-600 whitespace-pre-line text-sm"
                            >
                              {snippet} ...
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                });
              })()}
            </ul>
          </div>
        </div>
      )}
    </>
  );
});
