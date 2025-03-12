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
import { LuCheck, LuLoader, LuTerminalSquare } from '@qwikest/icons/lucide';

import { Button, Input, Label, Select } from '~/components';
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
    <div class="flex flex-col w-fit mt-8 gap-4">
      <div class="flex flex-col justify-between gap-4">
        <h1 class="text-3xl font-bold w-full">
          Import your dataset from the hub
        </h1>

        <div class="flex flex-row gap-4">
          <div class="flex-1 max-w-xl">
            <DatasetSearch
              onSelectedDataset$={(dataset) => {
                repoId.value = dataset;
              }}
            />
          </div>

          {repoId.value ? (
            <div class="flex-1 max-w-md">
              <FileSelection
                repoId={repoId.value!}
                accessToken={session.value!.token}
                onSelectedFile$={(file) => {
                  filePath.value = file;
                }}
              />
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>

      <div class="flex flex-col w-full gap-4 items-end">
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
              <LuTerminalSquare class="text-xl" />
              <span>Import dataset</span>
            </div>
          )}
        </Button>
        {repoId.value && filePath.value && (
          <div class="text-foreground text-sm">
            <span>Only the first 1000 rows will be imported</span>
          </div>
        )}
      </div>
    </div>
  );
});

const DatasetSearch = component$(
  (props: {
    onSelectedDataset$: QRL<(dataset: string) => void>;
  }) => {
    const session = useSession();
    const searchQuery = useSignal('');
    const selectedDataset = useSignal<string | undefined>(undefined);

    const searchResults = useResource$(async ({ track }) => {
      track(searchQuery);
      if (searchQuery.value.trim() === '') return [];
      return (
        await listDatasets({
          query: searchQuery.value,
          accessToken: session.value!.token,
          limit: 5,
        })
      ).map((dataset) => dataset.name);
    });

    useTask$(({ track }) => {
      track(selectedDataset);
      if (selectedDataset.value) {
        searchQuery.value = selectedDataset.value;
        props.onSelectedDataset$(selectedDataset.value);
      }
    });

    return (
      <div class="flex flex-col gap-4">
        <Label for="dataset-search">Dataset id</Label>
        <Input
          id="dataset-search"
          class="h-10"
          placeholder="Type to search datasets"
          bind:value={searchQuery}
        />
        <Resource
          value={searchResults}
          onRejected={(error) => {
            console.error(error);
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
              {searchQuery.value.trim() !== '' && datasets.length === 0 ? (
                <></>
              ) : (
                datasets.map((dataset, idx) => (
                  <Button
                    key={idx}
                    class="text-left"
                    onClick$={() => {
                      selectedDataset.value = dataset;
                    }}
                  >
                    {dataset}
                  </Button>
                ))
              )}
            </div>
          )}
        />
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
        onRejected={(error) => {
          console.error(error);

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
              <Label for="dataset-file">File</Label>

              {files.length === 0 ? (
                <span class="text-foreground warning">
                  No compatible files found in this dataset. Only jsonl, csv,
                  and parquet files are supported.
                </span>
              ) : (
                <Select.Root bind:value={selectedFile} class="relative">
                  <Select.Trigger class="px-4 bg-primary rounded-base border-neutral-300-foreground">
                    <Select.DisplayValue />
                  </Select.Trigger>
                  <Select.Popover class="bg-primary border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
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
