import {
  $,
  component$,
  type QRL,
  Resource,
  useComputed$,
  useResource$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { LuCheck, LuChevronRightSquare } from '@qwikest/icons/lucide';

import { Button, Select } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useSession } from '~/loaders';
import { useConfigContext } from '~/routes/home/layout';

import { useImportFromHub } from '~/usecases/import-from-hub.usecase';

import { DatasetSearch } from './dataset-search';

import {
  useListDatasetDataFiles,
  useListHubDatasets,
} from '~/usecases/list-hub-datasets.usecase';


export const ImportFromHub = component$(() => {
  const session = useSession();
  const { MAX_ROWS_IMPORT } = useConfigContext();
  const importFromHub = useImportFromHub();

  const nav = useNavigate();

  const isImportingData = useSignal(false);

  const repoId = useSignal<string | undefined>(undefined);
  const filePath = useSignal<string | undefined>(undefined);

  const importError = useSignal<string | null>(null);

  useVisibleTask$(({ track }) => {
    track(repoId);

    filePath.value = undefined;
  });

  const handleOnClickImportFromHub = $(async () => {
    try {
      isImportingData.value = true;
      importError.value = null;

      const { dataset, error } = await importFromHub({
        repoId: repoId.value!,
        filePath: filePath.value!,
      });

      if (error) {
        importError.value = error;
        isImportingData.value = false;
        return;
      }

      await nav('/home/dataset/' + dataset!.id);
    } finally {
      isImportingData.value = false;
    }
  });

  const enableImportButton = useComputed$(() => {
    return repoId.value && filePath.value && !isImportingData.value;
  });

  return (
    <div class="w-full flex items-center justify-evenly">
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

        <div class="flex flex-col w-full gap-4 mt-4">
          {repoId.value && filePath.value && (
            <div class="text-foreground text-sm">
              <span>
                Only the first {MAX_ROWS_IMPORT} rows will be imported.
              </span>
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
          {importError.value && (
            <div class="text-sm text-red-500">{importError.value}</div>
          )}
        </div>
      </div>
    </div>
  );
});

const FileSelection = component$(
  (props: {
    repoId: string;
    accessToken: string;
    onSelectedFile$: QRL<(file: string) => void>;
  }) => {
    const listDatasetDataFiles = useListDatasetDataFiles();
    const selectedFile = useSignal<string>('');

    const listDatasetFiles = useResource$(async ({ track }) => {
      const newRepo = track(() => props.repoId);

      const files = await listDatasetDataFiles(newRepo);

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
