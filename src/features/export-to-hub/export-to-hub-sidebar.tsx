import {
  $,
  component$,
  useComputed$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { LuArrowRightFromLine, LuXCircle } from '@qwikest/icons/lucide';

import { Button, Checkbox, Input, Label, Sidebar } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { useSession } from '~/routes';
import { TEMPORAL_ID, useDatasetsStore } from '~/state';
import { useExportDataset } from '~/usecases/export-to-hub.usecase';

const exportDataset = useExportDataset();

export const ExportToHubSidebar = component$(() => {
  const { openExportToHubSidebar, closeExportToHubSidebar } =
    useModals('exportToHubSidebar');

  const { activeDataset } = useDatasetsStore();
  const defaultExportName = useComputed$(() =>
    activeDataset.value.name.replace(/\s/g, '_'),
  );
  const session = useSession();

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
    openExportToHubSidebar();
  });

  return (
    <>
      <Button
        look="primary"
        size="sm"
        class="flex w-32 justify-between px-3 text-muted-foreground hover:text-foreground transition-colors"
        onClick$={handleOpenExportToHubSidebar}
        disabled={
          activeDataset.value.columns.filter((c) => c.id !== TEMPORAL_ID)
            .length === 0
        }
      >
        <LuArrowRightFromLine />
        Push to Hub
      </Button>

      <Sidebar
        name="exportToHubSidebar"
        class="fixed !right-4 !top-[6.5rem] h-[320px] shadow-md"
      >
        <div class="flex h-full flex-col justify-between p-4">
          <div class="flex flex-col gap-2">
            <div class="h-12 relative">
              <Button
                size="sm"
                look="ghost"
                class="absolute top-0 right-0"
                onClick$={closeExportToHubSidebar}
              >
                <LuXCircle class="text-lg text-primary-foreground" />
              </Button>
            </div>

            <div class="flex flex-col gap-4">
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

            <div class="h-6 text-sm text-left max-w-full">
              {error.value ? (
                <div class="text-sm text-red-500 text-left max-w-full overflow-x-auto">
                  {error.value}
                </div>
              ) : (
                exportedRepoId.value && (
                  <div class="text-sm text-left">
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
          </div>

          <div class="flex h-12 w-full items-center -ml-2">
            <Button
              look="ghost"
              class="h-10 bg-ring hover:bg-indigo-300 text-white w-fit select-none ml-2 rounded-2xl"
              onClick$={onButtonClick}
              disabled={isSubmitting.value}
            >
              {isSubmitting.value ? 'Pushing...' : 'Push to Hub'}
            </Button>
          </div>
        </div>
      </Sidebar>
    </>
  );
});
