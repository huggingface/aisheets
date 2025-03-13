import {
  $,
  component$,
  useComputed$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { LuArrowRightFromLine } from '@qwikest/icons/lucide';

import { Button, Checkbox, Input, Label, Modal } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { useSession } from '~/loaders';
import { TEMPORAL_ID, useDatasetsStore } from '~/state';
import { useExportDataset } from '~/usecases/export-to-hub.usecase';

export const ExportToHub = component$(() => {
  const exportDataset = useExportDataset();
  const session = useSession();

  const { openExportToHub } = useModals('exportToHub');

  const { activeDataset } = useDatasetsStore();
  const defaultExportName = useComputed$(() =>
    activeDataset.value.name.replace(/\s/g, '_'),
  );

  const isSubmitting = useSignal(false);
  const isPrivate = useSignal<boolean>(true);

  const error = useSignal<string | null>(null);

  const owner = useSignal<string>(session.value.user.username);
  const name = useSignal<string>(defaultExportName.value);
  const exportedRepoId = useSignal<string | undefined>(undefined);

  useTask$(({ track }) => {
    track(() => defaultExportName.value);
    name.value = defaultExportName.value;
  });

  const exportedUrl = useComputed$(
    () => `https://huggingface.co/datasets/${exportedRepoId.value}`,
  );

  const onButtonClick = $(async () => {
    error.value = null;
    isSubmitting.value = true;
    try {
      const repoId = await exportDataset({
        dataset: activeDataset.value,
        owner: owner.value,
        name: name.value ? name.value : defaultExportName.value,
        private: isPrivate.value,
      });

      exportedRepoId.value = repoId;
    } catch (e: any) {
      error.value = `${e.message || 'Unknown error'}`;
      console.error('Export error:', e);
    } finally {
      isSubmitting.value = false;
    }
  });

  const handleOpenExportToHubSidebar = $(() => {
    openExportToHub();
  });

  return (
    <>
      <Button
        look="secondary"
        onClick$={handleOpenExportToHubSidebar}
        disabled={
          activeDataset.value.columns.filter((c) => c.id !== TEMPORAL_ID)
            .length === 0
        }
      >
        <div class="flex items-center gap-4">
          <LuArrowRightFromLine class="text-md" />
          Push to Hub
        </div>
      </Button>

      <Modal
        name="exportToHub"
        title="Push your dataset to the Hub"
        class="fixed !right-4 !top-[4rem] w-[480px] shadow-md z-50"
      >
        <div class="flex flex-col gap-10">
          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <div class="flex flex-col flex-1">
                  <Label for="dataset-owner">Owner</Label>
                  <Input
                    id="dataset-owner"
                    class="h-10"
                    placeholder="Owner"
                    bind:value={owner}
                  />
                </div>
                <span class="text-lg mt-6">/</span>
                <div class="flex flex-col flex-1">
                  <Label for="dataset-name">Dataset name</Label>
                  <Input
                    id="dataset-name"
                    class="h-10"
                    placeholder="Dataset name"
                    bind:value={name}
                  />
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <div>
                <Label for="dataset-private">Private</Label>
              </div>
              <Checkbox id="dataset-private" bind:checked={isPrivate} />
            </div>
          </div>

          <div class="flex items-center justify-between gap-4">
            <div class="flex-1 h-fit min-h-[1.5rem] text-sm text-center break-words">
              {error.value ? (
                <div class="text-sm text-red-500 text-center break-words">
                  {error.value}
                </div>
              ) : (
                exportedRepoId.value && (
                  <div class="text-sm text-center">
                    🥳 Published at{' '}
                    <a
                      href={exportedUrl.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500 hover:underline"
                    >
                      {exportedRepoId.value}
                    </a>
                  </div>
                )
              )}
            </div>

            <Button
              look="primary"
              onClick$={onButtonClick}
              disabled={isSubmitting.value}
            >
              {isSubmitting.value ? 'Pushing...' : 'Push to Hub'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});
