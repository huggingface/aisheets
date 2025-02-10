import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { LuArrowRightFromLine, LuXCircle } from '@qwikest/icons/lucide';

import { Button, Checkbox, Input, Label, Sidebar } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { TEMPORAL_ID, useDatasetsStore } from '~/state';
import { useExportDataset } from '~/usecases/export-to-hub.usecase';

const exportDataset = useExportDataset();

export const ExportToHubSidebar = component$(() => {
  const { openExportToHubSidebar, closeExportToHubSidebar } =
    useModals('exportToHubSidebar');

  const { activeDataset } = useDatasetsStore();

  const owner = useSignal<string | undefined>(undefined); // TODO: Read the default owner from the session.
  const name = useSignal<string>(activeDataset.value.name.replace(/\s/g, '_'));
  const isPrivate = useSignal<boolean>(true);
  const exportedRepoId = useSignal<string | undefined>(undefined);

  const exportedUrl = useComputed$(
    () => `https://huggingface.co/datasets/${exportedRepoId.value}`,
  );

  const onButtonClick = $(async () => {
    const repoId = await exportDataset({
      dataset: activeDataset.value,
      owner: owner.value,
      name: name.value,
      private: isPrivate.value,
    });

    exportedRepoId.value = repoId;
  });

  const handleOpenExportToHubSidebar = $(() => {
    openExportToHubSidebar();
  });

  return (
    <>
      <Button
        look="primary"
        size="sm"
        class="flex gap-1 font-light w-32 justify-evenly"
        onClick$={handleOpenExportToHubSidebar}
        disabled={
          activeDataset.value.columns.filter((c) => c.id !== TEMPORAL_ID)
            .length === 0
        }
      >
        <LuArrowRightFromLine />
        Export
      </Button>

      <Sidebar
        name="exportToHubSidebar"
        class="fixed !right-0 !top-2 h-1/3 shadow-md"
      >
        <div class="flex h-full flex-col justify-between p-4">
          <div class="h-full">
            <Button
              size="sm"
              look="ghost"
              class="absolute top-0 right-0 m-2"
              onClick$={closeExportToHubSidebar}
            >
              <LuXCircle class="text-lg text-primary-foreground" />
            </Button>
            <div class="flex flex-col gap-4">
              {exportedRepoId.value ? (
                <div class="flex h-16 w-full items-center justify-center">
                  <span class="text-sm">
                    Exported to{' '}
                    <a
                      href={exportedUrl.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500"
                    >
                      {exportedRepoId.value}
                    </a>
                  </span>
                </div>
              ) : null}

              <div class="flex items-center justify-between">
                <Label for="dataset-owner">Owner</Label>
              </div>
              <Input
                id="dataset-owner"
                class="h-10"
                placeholder="Enter the dataset owner"
                bind:value={owner}
              />

              <Label for="dataset-name">Name</Label>
              <Input
                id="dataset-name"
                class="h-10"
                placeholder="Enter the dataset name"
                bind:value={name}
              />

              <div class="flex items-center space-x-2">
                <div>
                  <Label for="dataset-private">Private</Label>
                </div>
                <Checkbox id="dataset-private" bind:checked={isPrivate} />
              </div>
            </div>
          </div>

          <div class="flex h-16 w-full items-center justify-center">
            <Button
              size="sm"
              class="w-full rounded-sm p-2"
              onClick$={onButtonClick}
            >
              Export to Hub
            </Button>
          </div>
        </div>
      </Sidebar>
    </>
  );
});
