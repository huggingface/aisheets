import {
  $,
  type QRL,
  Resource,
  component$,
  useComputed$,
  useResource$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { LuCheck, LuChevronRightSquare } from '@qwikest/icons/lucide';

import { Button, Select } from '~/components';
import { useDebounce } from '~/components/hooks/debounce/debounce';
import { nextTick } from '~/components/hooks/tick';
import { useSession } from '~/loaders';
import { listDatasets } from '~/services/repository/hub/list-datasets';
import { listHubDatasetDataFiles } from '~/services/repository/hub/list-hub-dataset-files';
import { useImportFromHub } from '~/usecases/import-from-hub.usecase';

export const ImportFromHub = component$(() => {
  const session = useSession();
  const importFromHub = useImportFromHub();
  const nav = useNavigate();

  const isImportingData = useSignal(false);

  const repoId = useSignal<string | undefined>(undefined);
  const filePath = useSignal<string | undefined>(undefined);

  useVisibleTask$(({ track }) => {
    track(repoId);

    filePath.value = undefined;
  });

  const handleOnClickImportFromHub = $(async () => {
    try {
      isImportingData.value = true;

      const { id } = await importFromHub({
        repoId: repoId.value!,
        filePath: filePath.value!,
      });
      nav('/dataset/' + id);
    } catch (error) {
      console.error(error);
    } finally {
      isImportingData.value = false;
    }
  });

  const enableImportButton = useComputed$(() => {
    return repoId.value && filePath.value && !isImportingData.value;
  });

  return (
    <div class="flex flex-col w-full max-w-2xl mt-8 gap-12">
      <div class="flex flex-col justify-between gap-4">
        <h1 class="text-3xl font-bold w-full">
          Import your dataset from the hub
        </h1>

        <div class="flex flex-col gap-12 w-full">
          <DatasetSearch
            onSelectedDataset$={(dataset) => {
              repoId.value = dataset;
            }}
          />

          {repoId.value && (
            <div class="w-full">
              <FileSelection
                repoId={repoId.value!}
                accessToken={session.value!.token}
                onSelectedFile$={(file) => {
                  filePath.value = file;
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div class="flex flex-col w-full gap-4 mt-8">
        {repoId.value && filePath.value && (
          <div class="text-foreground text-sm">
            <span>Only the first 1000 rows will be imported.</span>
          </div>
        )}
        <Button
          look="primary"
          isGenerating={isImportingData.value}
          disabled={!enableImportButton.value || isImportingData.value}
          onClick$={handleOnClickImportFromHub}
          class="min-w-[180px]"
        >
          {isImportingData.value ? (
            <div class="flex items-center justify-between w-full px-2">
              <span>Importing</span>
              <div class="animate-spin">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-labelledby="loadingSpinnerTitle"
                >
                  <title id="loadingSpinnerTitle">Loading spinner</title>
                  <path
                    d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <div class="flex items-center gap-4">
              <LuChevronRightSquare class="text-xl" />
              <span>Import dataset</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
});

const DatasetSearch = component$(
  ({
    onSelectedDataset$,
  }: {
    onSelectedDataset$: QRL<(dataset: string) => void>;
  }) => {
    const isOpen = useSignal(false);
    const session = useSession();
    const searchQuery = useSignal('');
    const searchQueryDebounced = useSignal('');
    const selectedDataset = useSignal<string | undefined>(undefined);
    const inputRef = useSignal<Element>();
    const isSearching = useSignal(false);

    const focusInput = $(() => {
      const input = inputRef.value as HTMLInputElement;
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    });

    // Track input ref and query changes to maintain focus
    useTask$(({ track }) => {
      track(() => inputRef.value);
      if (inputRef.value) {
        focusInput();
      }
    });

    useTask$(({ track }) => {
      track(() => searchQuery.value);
      if (inputRef.value) {
        focusInput();
      }
    });

    // Add a task to maintain focus when dropdown opens/closes
    useTask$(({ track }) => {
      track(() => isOpen.value);
      nextTick(() => focusInput());
    });

    useDebounce(
      searchQuery,
      $(() => {
        searchQueryDebounced.value = searchQuery.value;
        if (searchQuery.value.trim().length >= 3) {
          isSearching.value = true;
        }
      }),
      300,
    );

    const searchResults = useResource$(async ({ track }) => {
      track(searchQueryDebounced);
      const query = searchQueryDebounced.value.trim();

      if (query === '' || query.length < 3) {
        nextTick(() => {
          isOpen.value = false;
          isSearching.value = false;
          focusInput();
        });
        return [];
      }

      try {
        const datasets = await listDatasets({
          query,
          accessToken: session.value!.token,
          limit: 10,
        });

        // Force the dropdown to open when we have results
        nextTick(() => {
          isSearching.value = false;

          // Always force open the dropdown if we have results
          if (datasets.length > 0) {
            // First close it to reset any potential stale state
            isOpen.value = false;

            // Then reopen it after a small delay to ensure the UI updates properly
            setTimeout(() => {
              isOpen.value = true;
              focusInput();
            }, 10);
          } else {
            selectedDataset.value = undefined;
            isOpen.value = false;
            focusInput();
          }
        });

        return datasets.map((dataset) => dataset.name);
      } catch (error) {
        isSearching.value = false;
        nextTick(() => focusInput());
        throw error;
      }
    });

    // Add an explicit handler to ensure the dropdown opens when typing
    useTask$(({ track }) => {
      const query = track(() => searchQuery.value);

      if (query.trim().length >= 3 && searchResults.value?.length > 0) {
        // Force the dropdown open when we have a valid query and results
        isOpen.value = true;
      }
    });

    const handleChangeDataset$ = $((value: string | string[]) => {
      selectedDataset.value = value as string;
      nextTick(() => focusInput());
    });

    useTask$(({ track }) => {
      track(selectedDataset);
      if (selectedDataset.value) {
        searchQuery.value = selectedDataset.value;

        onSelectedDataset$(selectedDataset.value);
      } else {
        searchQuery.value = '';
        onSelectedDataset$('');
      }
    });

    return (
      <Resource
        value={searchResults}
        onRejected={() => {
          return (
            <div class="flex items-center justify-center h-32 background-primary rounded-base">
              <span class="text-foreground warning">
                Failed to fetch datasets. Please, try again.
              </span>
            </div>
          );
        }}
        onResolved={(datasets) => (
          <div class="flex flex-col gap-2 w-full">
            <Select.Root
              onChange$={handleChangeDataset$}
              bind:open={isOpen}
              class="w-full"
            >
              <Select.Label>Dataset id</Select.Label>
              <Select.Trigger class="w-full relative">
                <input
                  ref={inputRef}
                  class="w-full h-8 outline-none pr-8"
                  placeholder="Type at least 3 characters to search datasets"
                  value={searchQuery.value}
                  onInput$={(e) => {
                    searchQuery.value = (e.target as HTMLInputElement).value;
                  }}
                  onFocus$={() => {
                    // When focusing the input, open the dropdown if we have results
                    if (
                      searchResults.value?.length > 0 &&
                      searchQuery.value.trim().length >= 3
                    ) {
                      isOpen.value = true;
                    }
                  }}
                  onClick$={() => {
                    // Also handle clicks to ensure the dropdown opens
                    if (
                      searchResults.value?.length > 0 &&
                      searchQuery.value.trim().length >= 3
                    ) {
                      isOpen.value = true;
                    }
                  }}
                  onBlur$={(e) => {
                    const target = e.relatedTarget as HTMLElement;
                    if (!target?.closest('.select-item')) {
                      // Short delay to allow click events to process first
                      setTimeout(() => focusInput(), 10);
                    }
                  }}
                />
                {isSearching.value && (
                  <div class="absolute right-8 top-1/2 -translate-y-1/2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-labelledby="searchSpinnerTitle"
                      class="animate-spin"
                    >
                      <title id="searchSpinnerTitle">Searching</title>
                      <path
                        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12"
                        stroke="var(--primary-300, #6366f1)"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </div>
                )}
              </Select.Trigger>
              {!!datasets.length && (
                <Select.Popover gutter={8} class="w-full">
                  {datasets.map((dataset) => (
                    <Select.Item
                      value={dataset}
                      key={dataset}
                      class="select-item w-full"
                    >
                      <Select.ItemLabel class="truncate max-w-xl">
                        {dataset}
                      </Select.ItemLabel>
                      <Select.ItemIndicator>
                        <LuCheck class="h-4 w-4 flex-shrink-0" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Popover>
              )}
            </Select.Root>
          </div>
        )}
      />
    );
  },
);

const FileSelection = component$(
  (props: {
    repoId: string;
    accessToken: string;
    onSelectedFile$: QRL<(file: string) => void>;
  }) => {
    const selectedFile = useSignal<string>('');

    const listDatasetFiles = useResource$(async ({ track }) => {
      const newRepo = track(() => props.repoId);

      const files = await listHubDatasetDataFiles({
        repoId: newRepo,
        accessToken: props.accessToken,
      });

      // Always select the first file when files change
      nextTick(() => {
        selectedFile.value = files.length > 0 ? files[0] : '';
      });

      return files;
    });

    useTask$(({ track }) => {
      const newValue = track(selectedFile);
      props.onSelectedFile$(newValue);
    });

    return (
      <Resource
        value={listDatasetFiles}
        onRejected={() => {
          return (
            <div class="flex items-center justify-center h-32 background-primary rounded-base">
              <span class="text-foreground warning">
                Failed to fetch dataset files. Please, provide another repo id
              </span>
            </div>
          );
        }}
        onResolved={(files) => {
          return (
            <div class="flex flex-col gap-4 w-full">
              {files.length === 0 ? (
                <span class="text-foreground warning">
                  No compatible files found in this dataset. Only jsonl, csv,
                  and parquet files are supported.
                </span>
              ) : (
                <Select.Root bind:value={selectedFile} class="w-full">
                  <Select.Label>File</Select.Label>
                  <Select.Trigger class="px-4 rounded-base border-neutral-300-foreground w-full">
                    <Select.DisplayValue class="truncate" />
                  </Select.Trigger>
                  <Select.Popover class="w-full">
                    {files.map((file, idx) => (
                      <Select.Item
                        key={idx}
                        class="text-foreground hover:bg-accent w-full"
                        value={file}
                      >
                        <Select.ItemLabel class="truncate max-w-xl">
                          {file}
                        </Select.ItemLabel>
                        <Select.ItemIndicator>
                          <LuCheck class="h-4 w-4 flex-shrink-0" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Popover>
                </Select.Root>
              )}
            </div>
          );
        }}
      />
    );
  },
);
