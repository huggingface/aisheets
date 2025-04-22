import {
  $,
  component$,
  useComputed$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { Popover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import { LuArrowRightFromLine, LuChevronRight } from '@qwikest/icons/lucide';

import { Button, Checkbox, Input, Label, buttonVariants } from '~/components';
import { HFLogo } from '~/components/ui/logo/logo';
import { useSession } from '~/loaders';
import { useDatasetsStore } from '~/state';
import { useExportDataset } from '~/usecases/export-to-hub.usecase';

export const ExportToHub = component$(() => {
  const exportDataset = useExportDataset();
  const session = useSession();

  const { activeDataset } = useDatasetsStore();
  const defaultExportName = useComputed$(() =>
    activeDataset.value.name.replace(/[\W_]+/g, '_'),
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

  return (
    <div class="flex flex-col gap-2 md:flex-row md:items-center">
      <Popover.Root gutter={14} flip={false} floating="right-start">
        <Popover.Trigger
          class={cn(
            buttonVariants({ look: 'ghost', size: 'md' }),
            'hover:bg-neutral-100 w-full flex justify-start items-center',
          )}
        >
          <div class="flex items-center justify-start gap-4">
            <HFLogo class="w-4 h-4 flex-shrink-0" />
            Save to Hugginface Hub
            <LuChevronRight class="w-4 h-4" />
          </div>
        </Popover.Trigger>
        <Popover.Panel class="shadow-lg p-4 rounded-md">
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
                      🥳 Saved at{' '}
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
                isGenerating={isSubmitting.value}
                onClick$={onButtonClick}
                disabled={isSubmitting.value}
                class="min-w-[180px]"
              >
                {isSubmitting.value ? (
                  <div class="flex items-center justify-between w-full px-2">
                    <span>Saving</span>
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
                    <LuArrowRightFromLine class="text-xl" />
                    <span>Save</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </Popover.Panel>
      </Popover.Root>
    </div>
  );
});
