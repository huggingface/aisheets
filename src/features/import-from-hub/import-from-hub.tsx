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
import { LuCheck, LuLoader } from '@qwikest/icons/lucide';

import { Button, Input, Label, Select } from '~/components';
import { listHubDatasetDataFiles } from '~/services/repository/hub/list-hub-dataset-files';
import { useSession } from '~/state';
import { useImportFromHub } from '~/usecases/import-from-hub.usecase';

const importFromHub = useImportFromHub();

export const ImportFromHub = component$(() => {
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

  const session = useSession();

  return (
    <>
      <div class="flex h-full flex-col justify-between p-4">
        <div class="h-full">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <Label for="dataset-repoid">Repo id</Label>
            </div>
            <div class="flex w-full max-w-sm items-center space-x-2">
              <Input
                id="dataset-repoid"
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
        </div>

        <div class="flex h-16 w-full items-center justify-center">
          <Button
            id="import-dataset"
            size="sm"
            class="w-full rounded-sm p-2"
            disabled={!enableImportButton.value}
            onClick$={handleOnClickImportFromHub}
          >
            {isImportingData.value ? (
              <div class="flex items -center space-x-2">
                <LuLoader class="h-6 w-6 animate-spin" />
                <span>Importing dataset...</span>
              </div>
            ) : (
              'Import dataset'
            )}
          </Button>
        </div>
      </div>
    </>
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
