import { $, component$, useSignal, useStore } from '@builder.io/qwik';
import { server$, useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { Login } from '~/components/ui/login/Login';
import { MainLogo, SecondLogo } from '~/components/ui/logo/logo';
import { StepsStatus } from '~/features/autodataset/steps-status';
import { DragAndDrop } from '~/features/import/drag-n-drop';
import { MainSidebarButton } from '~/features/main-sidebar';
import { Username } from '~/features/user/username';
import { useSession } from '~/loaders';
import { ActiveDatasetProvider } from '~/state';
import { runAutoDataset } from '~/usecases/run-autodataset';

const runAutoDatasetAction = server$(async function* (
  instruction: string,
  searchEnabled: boolean,
): AsyncGenerator<{
  event: string;
  error?: any;
  data?: any;
}> {
  yield* runAutoDataset.call(this, {
    instruction,
    searchEnabled,
    maxSearchQueries: 1,
  });
});

export default component$(() => {
  const session = useSession();
  const nav = useNavigate();
  const searchOnWeb = useSignal(false);
  const prompt = useSignal('');
  const currentStep = useSignal('');

  const creationFlow = useStore({
    datasetName: {
      name: '',
      done: false,
    },

    queries: {
      queries: [],
      done: false,
    },

    visitUrls: {
      urls: [] as {
        url: string;
        status: string;
        ok?: boolean;
      }[],
      done: false,
    },

    indexSources: {
      count: 0,
      done: false,
      ok: false,
    },

    populateDataset: {
      done: false,
    },
  });

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
    if (!prompt.value.trim()) return;
    if (isLoading.value) return;

    isLoading.value = true;

    try {
      for await (const { event, error, data } of await runAutoDatasetAction(
        prompt.value,
        searchOnWeb.value,
      )) {
        if (error) throw new Error(error);

        switch (event) {
          case 'dataset.config':
            currentStep.value = 'Configuring dataset...';
            break;

          case 'dataset.create':
            creationFlow.datasetName.name = data.name;
            creationFlow.datasetName.done = true;
            currentStep.value = 'Creating dataset...';
            break;

          case 'dataset.search':
            creationFlow.queries.queries = data.queries;
            creationFlow.queries.done = true;
            currentStep.value = `Searching the web: ${data.queries.map((q: string) => `"${q}"`).join(', ')}`;
            break;

          case 'sources.process':
            creationFlow.visitUrls.urls = data.urls.map((url: string) => ({
              url,
              status: 'pending',
            }));

            currentStep.value = 'Processing URLs...';
            break;

          case 'source.process.completed':
            creationFlow.visitUrls.urls = creationFlow.visitUrls.urls.map(
              (item) => {
                if (item.url === data.url)
                  return {
                    ...item,
                    status: 'completed',
                    ok: Boolean(data.ok),
                  };

                return item;
              },
            );

            break;

          case 'sources.index':
            currentStep.value = 'Indexing sources...';
            break;

          case 'sources.index.success':
            creationFlow.indexSources.count = data.count;
            creationFlow.indexSources.done = true;
            creationFlow.indexSources.ok = true;
            currentStep.value = 'Sources indexed';
            break;

          case 'sources.index.error':
            creationFlow.indexSources.count = 0;
            creationFlow.indexSources.done = true;
            break;

          case 'dataset.populate': {
            const { dataset } = data;
            currentStep.value = `Populating dataset ${dataset.name}...`;
            break;
          }

          case 'dataset.populate.success': {
            const { dataset } = data;
            currentStep.value = 'Redirecting to dataset...';
            await nav(`/home/dataset/${dataset.id}`);
            break;
          }

          default:
            currentStep.value = event;
            break;
        }
      }
    } catch (error: unknown) {
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
      <div class="flex justify-between w-full">
        <MainSidebarButton />
        {session.value.anonymous ? <Login /> : <Username />}
      </div>
      <div class="w-full min-h-screen flex flex-col items-center justify-center">
        <div class="flex flex-col justify-between min-h-screen w-full items-center">
          {/* Show top section only when not loading */}
          {!isLoading.value && (
            <div class="flex flex-col items-center justify-center space-y-4">
              <MainLogo class="w-[70px] h-[70px]" />
              <h1 class="text-neutral-600 text-2xl font-semibold">
                Design your data in a sheet
              </h1>
              <h2 class="text-neutral-500 font-medium">From a simple idea</h2>
            </div>
          )}

          <div class="flex flex-col justify-between w-full h-full items-center">
            <form
              class="relative w-[700px] flex flex-col h-full justify-between"
              preventdefault:submit
              onSubmit$={onSubmitHandler}
            >
              {/* Status/progress section */}
              <StepsStatus
                isLoading={isLoading.value}
                currentStep={currentStep.value}
                creationFlow={creationFlow}
                searchEnabled={searchOnWeb.value}
              />
              <div>
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
                      type="button"
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
              </div>
            </form>

            {/* Show examples and drag-and-drop only when not loading */}
            {!isLoading.value && (
              <div class="flex flex-col items-center justify-center space-y-8 mt-8">
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
            )}
          </div>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
