import {
  $,
  component$,
  useComputed$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { Label, Popover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import {
  LuArrowRightFromLine,
  LuChevronRight,
  LuEgg,
} from '@qwikest/icons/lucide';

import { Button, Input, buttonVariants } from '~/components';
import { HFLogo } from '~/components/ui/logo/logo';
import { useSession } from '~/loaders';
import { useDatasetsStore } from '~/state';
import { useRunAugmentDatasetJob } from '~/usecases/run-augment-dataset-job.usecase';

export const AugmentDataset = component$(() => {
  const session = useSession();
  const augmentDatasetJob = useRunAugmentDatasetJob();

  const { activeDataset } = useDatasetsStore();

  const defaultSourceRepoId = useComputed$(
    () => activeDataset.value.fromRepoId || '',
  );

  const isRunning = useSignal(false);
  const jobURL = useSignal<string | undefined>(undefined);

  const error = useSignal<string | null>(null);

  const sourceRepoId = useSignal<string>('');
  const targetRepoId = useSignal<string>('');

  useTask$(({ track }) => {
    track(defaultSourceRepoId);

    sourceRepoId.value = defaultSourceRepoId.value;

    const [_, datasetName] = sourceRepoId.value.split('/');
    targetRepoId.value = session.value.user.username + '/' + datasetName;
  });

  const onButtonClick = $(async () => {
    error.value = null;
    isRunning.value = true;

    try {
      jobURL.value = await augmentDatasetJob({
        source: {
          repoId: sourceRepoId.value,
        },
        target: {
          repoId: targetRepoId.value!,
        },
        dataset: activeDataset.value,
      });
    } catch (e: any) {
      error.value = `${e.message || 'Unknown error'}`;
      console.error('Export error:', e);
    } finally {
      isRunning.value = false;
    }
  });

  return (
    <div class="flex flex-col gap-2 w-full">
      <Popover.Root gutter={14} flip={false} floating="right-start">
        <Popover.Trigger
          class={cn('w-full', buttonVariants({ look: 'ghost' }))}
        >
          <div class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2 p-2 rounded-none rounded-tl-md rounded-tr-md">
            <span class="flex items-center gap-1">
              <LuEgg class="w-4 h-4 text-primary flex-shrink-0" />
              <HFLogo class="w-3 h-3 flex-shrink-0" />
            </span>
            Generate whole dataset
            <LuChevronRight class="w-4 h-4" />
          </div>
        </Popover.Trigger>
        <Popover.Panel class="shadow-lg p-12 rounded-md min-w-[500px]">
          <div class="flex flex-col gap-10">
            <div class="flex flex-col gap-6">
              <div class="flex flex-col flex-1">
                <Label class="px-2 py-1.5 text-sm" for="target-dataset">
                  Push to dataset repo
                </Label>
                <Input
                  id="target-dataset"
                  class="h-10"
                  placeholder="Target repo id"
                  bind:value={targetRepoId}
                />
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 h-fit min-h-[1.5rem] text-sm text-center break-words">
                {error.value ? (
                  <div class="text-sm text-red-500 text-center break-words">
                    {error.value}
                  </div>
                ) : (
                  jobURL.value && (
                    <div class="text-sm text-center">
                      🚀 A new job has been launched{' '}
                      <a
                        href={jobURL.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-500 hover:underline"
                      >
                        here
                      </a>
                    </div>
                  )
                )}
              </div>

              <Button
                look="primary"
                isGenerating={isRunning.value}
                onClick$={onButtonClick}
                disabled={isRunning.value}
                class="min-w-[180px]"
              >
                {isRunning.value ? (
                  <div class="flex items-center justify-between w-full px-2">
                    <span>Running job</span>
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
                    <span>Run</span>
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
