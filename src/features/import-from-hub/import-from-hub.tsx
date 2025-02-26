import {
  $,
  type QRL,
  Resource,
  component$,
  useComputed$,
  useResource$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { LuCheck, LuLoader, LuTerminalSquare } from '@qwikest/icons/lucide';

import { Button, Input, Label, Select } from '~/components';
import { useSession } from '~/loaders';
import { listHubDatasetDataFiles } from '~/services/repository/hub/list-hub-dataset-files';
import { useImportFromHub } from '~/usecases/import-from-hub.usecase';

export const ImportFromHub = component$(() => {
  const session = useSession();
  const importFromHub = useImportFromHub();
  const nav = useNavigate();

  const showFileSelection = useSignal(false);
  const isImportingData = useSignal(false);

  const repoId = useSignal<string | undefined>(undefined);
  const filePath = useSignal<string | undefined>(undefined);

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
    <div class="flex flex-col justify-between gap-4">
      <h1 class="text-3xl font-bold w-full">Import you dataset from the hub</h1>

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <Label for="dataset-repo-id">Repo id</Label>
        </div>
        <div class="flex w-full max-w-sm items-center space-x-2">
          <Input
            id="dataset-repo-id"
            class="h-10"
            placeholder="Enter the repo id"
            bind:value={repoId}
            onChange$={(e) => {
              showFileSelection.value = false;
              filePath.value = undefined;
            }}
          />
          <Button
            id="explore-dataset"
            size="sm"
            class="h-10 rounded-sm"
            onClick$={() => {
              showFileSelection.value = true;
            }}
          >
            Explore files
          </Button>
        </div>

        {showFileSelection.value ? (
          <div>
            <FileSelection
              repoId={repoId.value!}
              accessToken={session.value!.token}
              onSelectedFile$={(file) => {
                filePath.value = file;
              }}
            />
          </div>
        ) : (
          <div />
        )}
      </div>

      <div class="w-full flex flex-col gap-2">
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
        <p class="text-sm">Only the first 1000 rows will be imported.</p>
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
    const listDatasetFiles = useResource$(async () => {
      return await listHubDatasetDataFiles({
        repoId: props.repoId,
        accessToken: props.accessToken,
      });
    });

    const selectedFile = useSignal<string | undefined>(undefined);

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
          if (!selectedFile.value) selectedFile.value = files[0];

          return (
            <div class="flex flex-col gap-4">
              <Label for="dataset-file">Select a file to import</Label>

              <Select.Root value={selectedFile.value} class="relative">
                <Select.Trigger class="px-4 bg-primary rounded-base border-secondary-foreground">
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
            </div>
          );
        }}
      />
    );
  },
);
