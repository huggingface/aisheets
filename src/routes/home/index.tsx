import { $, component$, useSignal, useStore } from '@builder.io/qwik';
import { server$, useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { MainLogo, SecondLogo } from '~/components/ui/logo/logo';
import { Skeleton } from '~/components/ui/skeleton/skeleton';
import { DragAndDrop } from '~/features/import/drag-n-drop';
import { MainSidebarButton } from '~/features/main-sidebar';
import { ActiveDatasetProvider } from '~/state';
import { populateDataset } from '~/usecases/populate-dataset';
import { runAutoDataset } from '~/usecases/run-autodataset';

// Server action to run the autodataset action
const runAutoDatasetAction = server$(async function (
  instruction: string,
  searchEnabled: boolean,
) {
  return await runAutoDataset.call(this, {
    instruction,
    searchEnabled,
    maxSearchQueries: 1,
  });
});

// Server action to populate the dataset
const populateDatasetAction = server$(async function (
  datasetId: string,
  datasetName: string,
) {
  return await populateDataset.call(this, datasetId, datasetName);
});

export default component$(() => {
  const nav = useNavigate();
  const searchOnWeb = useSignal(false);
  const prompt = useSignal('');
  const currentStep = useSignal('');
  const startingPrompts = [
    'Motown songs by artist with lyrics, release date, and label',
    'Recent climate-related disasters with description and location',
  ];

  const isLoading = useSignal(false);
  const response = useStore<{
    text?: string;
    error?: string;
  }>({});

  const handleAssistant = $(async () => {
    if (!prompt.value.trim()) {
      console.warn('Prompt is empty');
      return;
    }

    isLoading.value = true;
    currentStep.value = searchOnWeb.value
      ? 'Configuring dataset, searching web sources, visiting URLs'
      : 'Configuring dataset';
    response.text = undefined;
    response.error = undefined;

    try {
      const result = await runAutoDatasetAction(
        prompt.value,
        searchOnWeb.value,
      );

      if (typeof result === 'string') {
        response.text = result;
      } else if ('dataset' in result && result.dataset) {
        currentStep.value = `Populating dataset "${result.datasetName}"`;
        await populateDatasetAction(result.dataset, result.datasetName);
        currentStep.value = 'Redirecting to dataset';
        await nav(`/home/dataset/${result.dataset}/`);
        return;
      }
    } catch (error) {
      console.error('Error running assistant:', error);
      response.error = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading.value = false;
      currentStep.value = '';
    }
  });

  return (
    <ActiveDatasetProvider>
      <MainSidebarButton />
      <div class="w-full h-full flex flex-col items-center justify-center">
        <div class="flex flex-col items-center justify-center space-y-14">
          <div class="flex flex-col items-center justify-center space-y-4">
            <MainLogo class="w-[70px] h-[70px]" />
            <h1 class="text-neutral-600 text-2xl font-semibold">
              Design your data in a sheet
            </h1>
            <h2 class="text-neutral-500 font-medium">From a simple idea</h2>
          </div>

          <div class="flex flex-col items-center justify-center space-y-3">
            <div
              class="relative w-[700px]"
              onClick$={() => document.getElementById('prompt')?.focus()}
            >
              {isLoading.value && currentStep.value && (
                <div class="px-4 text-sm text-neutral-600 mb-2 flex items-center gap-2">
                  <Skeleton />
                  <span>{currentStep.value}</span>
                </div>
              )}
              <div class="w-full bg-white border border-secondary-foreground rounded-xl pb-14 shadow-[0px_4px_6px_rgba(0,0,0,0.1)]">
                <Textarea
                  id="prompt"
                  look="ghost"
                  value={prompt.value}
                  placeholder="Create a dataset about recent open source news"
                  class="p-4 max-h-40 resize-none overflow-auto text-base placeholder:text-neutral-400"
                  onInput$={(e, el) => {
                    prompt.value = el.value;

                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              </div>
              <div
                class="w-full absolute bottom-0 p-4 flex flex-row items-center justify-between cursor-text"
                onClick$={() => document.getElementById('prompt')?.focus()}
              >
                <div class="flex w-full justify-between items-center h-[30px]">
                  <Button
                    look="secondary"
                    class={cn(
                      'flex px-[10px] py-[8px] gap-[10px] bg-white text-neutral-600 hover:bg-neutral-100 h-[30px] rounded-[8px]',
                      {
                        'border-primary-100 outline-primary-100 bg-primary-50 hover:bg-primary-50 text-primary-500 hover:text-primary-400':
                          searchOnWeb.value,
                      },
                    )}
                    onClick$={() => {
                      searchOnWeb.value = !searchOnWeb.value;
                    }}
                  >
                    <LuGlobe class="text-lg" />
                    Search the web
                  </Button>

                  <Button
                    look="primary"
                    class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                    onClick$={handleAssistant}
                    disabled={isLoading.value || !prompt.value.trim()}
                  >
                    <LuEgg class="text-lg" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center space-y-8">
              <div class="w-[700px] flex flex-col justify-between items-start gap-2">
                {startingPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    look="secondary"
                    class="flex gap-2 text-xs px-2 rounded-xl bg-transparent hover:bg-neutral-100"
                  >
                    <SecondLogo class="w-4" />
                    {prompt}
                  </Button>
                ))}
              </div>

              <div class="w-[697px] flex justify-center items-center">
                <hr class="w-full border-t" />
                <span class="mx-10 text-neutral-500">OR</span>
                <hr class="w-full border-t" />
              </div>

              <div class="w-[530px] h-[230px]">
                <DragAndDrop />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
