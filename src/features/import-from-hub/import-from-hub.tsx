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
import { LuCheck, LuChevronRightSquare, LuLoader } from '@qwikest/icons/lucide';

import { Button, Select, useToggle } from '~/components';
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
    <div class="flex flex-col w-fit mt-8 gap-12">
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
          disabled={!enableImportButton.value}
          onClick$={handleOnClickImportFromHub}
        >
          {isImportingData.value ? (
            <div class="flex items-center gap-4">
              <LuLoader class="text-xl animate-spin" />
              <span>Importing dataset...</span>
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
    const { isOpen } = useToggle();
    const session = useSession();
    const searchQuery = useSignal('');
    const searchQueryDebounced = useSignal('');
    const selectedDataset = useSignal<string | undefined>(undefined);

    useDebounce(
      searchQuery,
      $(() => {
        searchQueryDebounced.value = searchQuery.value;
      }),
      300,
    );

    const searchResults = useResource$(async ({ track }) => {
      track(searchQueryDebounced);
      if (searchQueryDebounced.value.trim() === '') return [];

      const datasets = await listDatasets({
        query: searchQueryDebounced.value,
        accessToken: session.value!.token,
        limit: 5,
      });

      nextTick(() => {
        if (datasets.length > 1) {
          isOpen.value = true;
        } else {
          selectedDataset.value = undefined;
          isOpen.value = false;
        }
      });

      return datasets.map((dataset) => dataset.name);
    });

    const handleChangeDataset$ = $((value: string | string[]) => {
      selectedDataset.value = value as string;
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
          <div class="flex flex-col gap-2">
            <Select.Root onChange$={handleChangeDataset$} bind:open={isOpen}>
              <Select.Label>Dataset id</Select.Label>
              <Select.Trigger>
                <input
                  class="w-full h-8 outline-none"
                  placeholder="Type to search datasets"
                  bind:value={searchQuery}
                />
              </Select.Trigger>
              {!!datasets.length && (
                <Select.Popover gutter={8}>
                  {datasets.map((dataset) => (
                    <Select.Item value={dataset} key={dataset}>
                      <Select.ItemLabel>{dataset}</Select.ItemLabel>
                      <Select.ItemIndicator>
                        <LuCheck class="h-4 w-4" />
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

      if (files.length === 0) selectedFile.value = '';
      else selectedFile.value = files[0];

      return files;
    });

    useTask$(({ track }) => {
      const newValue = track(selectedFile);
      props.onSelectedFile$(newValue!);
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
            <div class="flex flex-col gap-4">
              {files.length === 0 ? (
                <span class="text-foreground warning">
                  No compatible files found in this dataset. Only jsonl, csv,
                  and parquet files are supported.
                </span>
              ) : (
                <Select.Root bind:value={selectedFile}>
                  <Select.Label>File</Select.Label>
                  <Select.Trigger class="px-4 rounded-base border-neutral-300-foreground">
                    <Select.DisplayValue />
                  </Select.Trigger>
                  <Select.Popover>
                    {files.map((file, idx) => (
                      <Select.Item
                        key={idx}
                        class="text-foreground hover:bg-accent"
                        value={file}
                        onClick$={() => {
                          selectedFile.value = file;
                        }}
                      >
                        <Select.ItemLabel>{file}</Select.ItemLabel>
                        <Select.ItemIndicator>
                          <LuCheck class="h-4 w-4" />
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
