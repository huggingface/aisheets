import { $, component$, useSignal } from '@builder.io/qwik';
import { TbX } from '@qwikest/icons/tablericons';

import { Button, Checkbox, Input, Label, Sidebar } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { useDatasetsStore } from '~/state';
import { useExportDataset } from '~/usecases/export-to-hub.usecase';

const exportDataset = useExportDataset();

export const ExportToHubSidebar = component$(() => {
  const { closeExportToHubSidebar } = useModals('exportToHubSidebar');

  const { activeDataset } = useDatasetsStore();

  const owner = useSignal<string | undefined>(undefined); // TODO: Read the default owner from the session.
  const name = useSignal<string>(activeDataset.value.name.replace(/\s/g, '_'));
  const isPrivate = useSignal<boolean>(true);

  const onButtonClick = $(() => {
    closeExportToHubSidebar();
    exportDataset({
      dataset: activeDataset.value,
      owner: owner.value,
      name: name.value,
      private: isPrivate.value,
    });
  });

  return (
    <Sidebar name="exportToHubSidebar">
      <div class="flex h-full flex-col justify-between p-4">
        <div class="h-full">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <Label for="dataset-owner">Owner</Label>
              <Button size="sm" look="ghost" onClick$={closeExportToHubSidebar}>
                <TbX />
              </Button>
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
  );
});
