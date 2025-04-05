import {
  $,
  type NoSerialize,
  type QRL,
  Resource,
  component$,
  noSerialize,
  sync$,
  useComputed$,
  useResource$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuCheck, LuChevronRightSquare } from '@qwikest/icons/lucide';

import { Button, Select, triggerLooks } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
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
    <div class="flex flex-col w-full max-w-2xl mt-8 gap-4">
      <div class="flex flex-col justify-between gap-4">
        <h1 class="text-3xl font-bold w-full">
          Import your dataset from the hub
        </h1>

        <div class="flex flex-col gap-2 w-full">
          <DatasetSearch
            onSelectedDataset$={(dataset) => {
              repoId.value = dataset;
            }}
          />

          {repoId.value && (
            <div class="w-full">
              <FileSelection
                repoId={repoId.value}
                accessToken={session.value.token}
                onSelectedFile$={(file) => {
                  filePath.value = file;
                }}
              />
            </div>
          )}
        </div>
      </div>

      <DragAndDrop />

      <div class="flex flex-col w-full gap-4 mt-4">
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
    const isFocusing = useSignal(false);
    const containerRef = useClickOutside(
      $(() => {
        isFocusing.value = false;
        isOpen.value = false;
      }),
    );
    const session = useSession();
    const searchQuery = useSignal('');
    const searchQueryDebounced = useSignal('');
    const selectedDataset = useSignal('');
    const datasets = useSignal<string[]>([]);

    useDebounce(
      searchQuery,
      $(() => {
        searchQueryDebounced.value = searchQuery.value;
      }),
      300,
    );

    const onSearch = $(async (searchQuery: string) => {
      const query = searchQuery.trim();

      const datasets = await listDatasets({
        query,
        accessToken: session.value.token,
        limit: 10,
      });

      return datasets.map((dataset) => dataset.name);
    });

    const handleChangeDataset$ = $((value: string | string[]) => {
      const selected = value as string;
      selectedDataset.value = selected ?? '';

      searchQuery.value = selectedDataset.value;

      onSelectedDataset$(selectedDataset.value);
    });

    useTask$(async ({ track }) => {
      track(searchQueryDebounced);
      if (searchQueryDebounced.value.length < 3) return;

      if (searchQueryDebounced.value === selectedDataset.value) return;

      const result = await onSearch(searchQuery.value);
      datasets.value = result;

      nextTick(() => {
        isOpen.value = datasets.value.length > 0;
      }, 200);
    });

    useTask$(({ track }) => {
      track(searchQuery);

      if (
        searchQuery.value !== selectedDataset.value &&
        datasets.value.length
      ) {
        datasets.value = [];
        isOpen.value = false;
        onSelectedDataset$('');
      }
    });

    return (
      <div class="flex flex-col w-full" ref={containerRef}>
        <Select.Root
          onChange$={handleChangeDataset$}
          bind:open={isOpen}
          class="w-full"
        >
          <Select.Label>Dataset id</Select.Label>
          <div
            class={cn(
              'w-full flex flex-row justify-between items-center',
              triggerLooks('default'),
              {
                'ring-1 ring-ring': isFocusing.value,
              },
            )}
          >
            <input
              class="h-8 w-full outline-none"
              placeholder="Type at least 3 characters to search datasets"
              bind:value={searchQuery}
              onClick$={(e) => {
                isFocusing.value = true;
                e.stopPropagation();
              }}
            />
            <Select.Trigger look="headless" />
          </div>
          <Select.Popover
            floating="bottom-end"
            gutter={8}
            class={cn('w-full ml-3', {
              'opacity-0 hidden': !datasets.value.length,
            })}
          >
            {datasets.value.map((dataset) => (
              <Select.Item
                key={dataset}
                value={dataset}
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
        </Select.Root>
      </div>
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
                  <Select.Popover class="w-full max-h-72 overflow-y-auto">
                    {files.map((file) => (
                      <Select.Item
                        key={file}
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

const DragAndDrop = component$(() => {
  const file = useSignal<NoSerialize<File>>();
  const isDragging = useSignal(false);
  const navigate = useNavigate();

  const uploadErrorMessage = useSignal<string | null>(null);

  const handleUploadFile$ = $(async () => {
    if (!file.value) return;

    const stream = file.value.stream();
    const reader = stream.getReader();
    const fileName = `${file.value.name}`;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Chunk-Size': value.byteLength.toString(),
          'X-File-Name': encodeURIComponent(fileName),
        },
        body: value,
      });

      if (!response.ok) {
        uploadErrorMessage.value =
          'Failed to upload file. Please try again or provide another file.';
        return;
      }

      const { id } = await response.json();
      navigate('/dataset/' + id);
    }
  });

  return (
    <>
      <label
        preventdefault:dragover
        preventdefault:drop
        for="fileInput"
        class={`relative border-2 p-6 border-dashed text-center cursor-pointer transition z-10 ${
          isDragging.value
            ? 'bg-blue-200 border-blue-500'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
        onDragOver$={() => {
          isDragging.value = true;
        }}
        onDragLeave$={() => {
          isDragging.value = false;
        }}
        onDrop$={sync$((e: DragEvent) => {
          isDragging.value = false;

          if (e.dataTransfer?.files?.length) {
            file.value = noSerialize(e.dataTransfer.files[0]);

            handleUploadFile$();
          }
        })}
      >
        <input
          type="file"
          id="fileInput"
          class="hidden"
          onChange$={sync$((e: Event) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.length) {
              file.value = noSerialize(input.files[0]);

              handleUploadFile$();
            }
          })}
        />

        <span>
          {!file.value
            ? isDragging.value
              ? 'Drag and drop your file here'
              : 'Drag and drop your file here or click to select'
            : file.value.name}
        </span>
      </label>

      {uploadErrorMessage.value && (
        <div class="text-red-500 text-sm mt-2">{uploadErrorMessage.value}</div>
      )}
    </>
  );
});
