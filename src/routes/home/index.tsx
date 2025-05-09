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
  const examples = [
    {
      title: 'Challenging medicine multi-choice questions',
      prompt:
        'Extremely challenging multiple-choice questions for the domain of medicine',
    },
    {
      title: 'Spanish-Speaking Countries & Regional Idioms',
      prompt:
        'List of Spanish speaking countries with an example of a regional idiom',
    },
    {
      title: 'Climate-related disasters',
      prompt:
        'Recent climate-related disasters worldwide. Include event and location, date, affected population, economic impact, and a detailed description of the event.',
    },
    {
      title: 'Endangered Plants',
      prompt:
        'Endangered plant species. Include scientific name, common name and habitat',
    },
    {
      title: 'Customer sentiment climbing shoes',
      prompt:
        'Sentiment dataset about real climbing shoe models, including positive, negative, and neutral reviews',
    },
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

  const onSubmitHandler = $(async (e: Event) => {
    e.preventDefault();
    await handleAssistant();
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

          <div class="flex flex-col items-center justify-center space-y-8">
            <form
              class="relative w-[700px]"
              preventdefault:submit
              onSubmit$={onSubmitHandler}
            >
              <div
                class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                style="min-height:24px"
              >
                {isLoading.value && currentStep.value ? (
                  <>
                    <Skeleton />
                    <span>{currentStep.value}</span>
                  </>
                ) : null}
              </div>
              <div class="w-full bg-white border border-secondary-foreground rounded-xl pb-14 shadow-[0px_4px_6px_rgba(0,0,0,0.1)]">
                <Textarea
                  id="prompt"
                  look="ghost"
                  value={prompt.value}
                  placeholder="Describe the dataset you want or try one of the examples below"
                  class="p-4 max-h-40 resize-none overflow-auto text-base placeholder:text-neutral-500"
                  onInput$={(e, el) => {
                    prompt.value = el.value;
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  onKeyDown$={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      await handleAssistant();
                    }
                    // Shift+Enter will insert a newline by default
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
                    type="submit"
                    class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                    disabled={isLoading.value || !prompt.value.trim()}
                  >
                    <LuEgg class="text-lg" />
                  </Button>
                </div>
              </div>
            </form>

            <div class="flex flex-col items-center justify-center space-y-8">
              <div class="w-[700px] flex flex-row flex-wrap justify-start items-center gap-2">
                {examples.map((example) => (
                  <Button
                    key={example.title}
                    look="secondary"
                    class="flex gap-2 text-xs px-2 rounded-xl bg-transparent hover:bg-neutral-100 whitespace-nowrap"
                    onClick$={() => {
                      prompt.value = example.prompt;
                      document.getElementById('prompt')?.focus();
                    }}
                  >
                    <SecondLogo class="w-4" />
                    {example.title}
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
