import { $, component$, useSignal, useStore } from '@builder.io/qwik';
import { server$, useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuCheck, LuEgg, LuGlobe, LuX } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { MainLogo, SecondLogo } from '~/components/ui/logo/logo';
import { Skeleton } from '~/components/ui/skeleton/skeleton';
import { DragAndDrop } from '~/features/import/drag-n-drop';
import { MainSidebarButton } from '~/features/main-sidebar';
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
              {isLoading.value && currentStep.value ? (
                <div class="mb-8">
                  {searchOnWeb.value && (
                    <div>
                      {/* Step: Configuring dataset */}
                      {currentStep.value === 'Configuring dataset...' && (
                        <div
                          class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                          style="min-height:24px"
                        >
                          <Skeleton />
                          <span>Configuring dataset...</span>
                        </div>
                      )}
                      {creationFlow.datasetName.name &&
                        !creationFlow.datasetName.done && (
                          <div
                            class="px-4 text-sm text-neutral-600 font-medium flex items-center gap-2"
                            style="min-height:24px"
                          >
                            Configured dataset
                          </div>
                        )}
                      {/* Only show spacing if next step is present */}
                      {(currentStep.value === 'Creating dataset...' ||
                        creationFlow.datasetName.done) &&
                        (currentStep.value === 'Configuring dataset...' ||
                          (creationFlow.datasetName.name &&
                            !creationFlow.datasetName.done)) && (
                          <div class="h-4" />
                        )}

                      {/* Step: Creating dataset configuration */}
                      {currentStep.value === 'Creating dataset...' && (
                        <div
                          class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                          style="min-height:24px"
                        >
                          <Skeleton />
                          <span>Creating dataset configuration...</span>
                        </div>
                      )}
                      {creationFlow.datasetName.done && (
                        <div
                          class="px-4 text-sm text-neutral-600 font-medium flex items-center gap-2"
                          style="min-height:24px"
                        >
                          Created dataset configuration
                        </div>
                      )}
                      {/* Only show spacing if next step is present */}
                      {(currentStep.value.startsWith('Searching the web') ||
                        creationFlow.queries.done) &&
                        (currentStep.value === 'Creating dataset...' ||
                          creationFlow.datasetName.done) && <div class="h-4" />}

                      {/* Step: Searching the web */}
                      {currentStep.value.startsWith('Searching the web') && (
                        <div
                          class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                          style="min-height:24px"
                        >
                          <Skeleton />
                          <span>{currentStep.value}</span>
                        </div>
                      )}
                      {creationFlow.queries.done &&
                        !currentStep.value.startsWith('Searching the web') && (
                          <div
                            class="px-4 text-sm text-neutral-600 font-medium flex items-center gap-2"
                            style="min-height:24px"
                          >
                            Searched the web
                          </div>
                        )}
                      {/* Only show spacing if next step is present */}
                      {(currentStep.value.startsWith('Processing URLs') ||
                        (creationFlow.visitUrls.urls.length > 0 &&
                          creationFlow.visitUrls.urls.every(
                            (item) => item.status === 'completed',
                          ))) &&
                        (currentStep.value.startsWith('Searching the web') ||
                          creationFlow.queries.done) && <div class="h-4" />}

                      {/* Step: Processing URLs */}
                      {currentStep.value.startsWith('Processing URLs') && (
                        <div
                          class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                          style="min-height:24px"
                        >
                          <Skeleton />
                          <span>{currentStep.value}</span>
                        </div>
                      )}
                      {creationFlow.visitUrls.urls.length > 0 &&
                        creationFlow.visitUrls.urls.every(
                          (item) => item.status === 'completed',
                        ) &&
                        !currentStep.value.startsWith('Processing URLs') && (
                          <div
                            class="px-4 text-sm text-neutral-600 font-medium flex items-center gap-2"
                            style="min-height:24px"
                          >
                            Processed URLs
                          </div>
                        )}
                      {creationFlow.visitUrls.urls.length > 0 && (
                        <div class="px-4 text-sm text-neutral-600 flex flex-col gap-2">
                          {creationFlow.visitUrls.urls.map((item, index) => (
                            <div key={index} class="flex items-center gap-2">
                              {item.status === 'completed' && item.ok && (
                                <span class="text-green-500">
                                  <LuCheck class="text-lg" />
                                </span>
                              )}
                              {item.status === 'completed' && !item.ok && (
                                <span class="text-red-500">
                                  <LuX class="text-lg" />
                                </span>
                              )}
                              {item.status === 'pending' && (
                                <span
                                  class="flex items-center"
                                  style="width:1.25em;height:1.25em;"
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-labelledby="loadingSpinnerTitle"
                                    class="animate-spin"
                                  >
                                    <title id="loadingSpinnerTitle">
                                      Loading spinner
                                    </title>
                                    <path
                                      d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12"
                                      stroke="currentColor"
                                      stroke-width="2"
                                      stroke-linecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              <span>
                                {item.url.slice(0, 80)}{' '}
                                {item.url.length > 80 && '...'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Only show spacing if next step is present */}
                      {(currentStep.value.startsWith('Indexing sources') ||
                        (creationFlow.indexSources.done &&
                          creationFlow.indexSources.ok)) &&
                        (currentStep.value.startsWith('Processing URLs') ||
                          (creationFlow.visitUrls.urls.length > 0 &&
                            creationFlow.visitUrls.urls.every(
                              (item) => item.status === 'completed',
                            ))) && <div class="h-4" />}

                      {/* Step: Indexing sources */}
                      {currentStep.value.startsWith('Indexing sources') && (
                        <div
                          class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                          style="min-height:24px"
                        >
                          <Skeleton />
                          <span>Indexing sources...</span>
                        </div>
                      )}
                      {creationFlow.indexSources.done &&
                        creationFlow.indexSources.ok &&
                        !currentStep.value.startsWith('Indexing sources') && (
                          <div
                            class="px-4 text-sm text-neutral-600 font-medium flex items-center gap-2"
                            style="min-height:24px"
                          >
                            Indexed sources
                          </div>
                        )}
                      {/* Only show spacing if next step is present */}
                      {(currentStep.value.startsWith('Populating dataset') ||
                        creationFlow.populateDataset.done) &&
                        (currentStep.value.startsWith('Indexing sources') ||
                          (creationFlow.indexSources.done &&
                            creationFlow.indexSources.ok)) && (
                          <div class="h-4" />
                        )}

                      {/* Step: Populating dataset */}
                      {currentStep.value.startsWith('Populating dataset') && (
                        <div
                          class="px-4 text-sm text-neutral-600 flex items-center gap-2"
                          style="min-height:24px"
                        >
                          <Skeleton />
                          <span>{currentStep.value}</span>
                        </div>
                      )}
                      {creationFlow.populateDataset.done &&
                        !currentStep.value.startsWith('Populating dataset') && (
                          <div
                            class="px-4 text-sm text-neutral-600 font-medium flex items-center gap-2"
                            style="min-height:24px"
                          >
                            Populated dataset
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ) : null}

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
