import { $, component$, useSignal, useStore } from '@builder.io/qwik';
import { server$, useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { Login } from '~/components/ui/login/Login';
import { MainLogo, SecondLogo } from '~/components/ui/logo/logo';
import { BigTips } from '~/components/ui/tips/big-tips';
import { Tips } from '~/components/ui/tips/tips';
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
        'List of idioms in Spanish speaking countries, with the country where they are used',
    },
    {
      title: 'Climate-related disasters',
      prompt:
        'Recent climate related disasters with one column including the name/type of disaster, location and year',
    },
    {
      title: 'Endangered Plants',
      prompt: 'Endangered plant species. Include scientific name and habitat',
    },
    {
      title: 'Customer sentiment climbing shoes',
      prompt:
        'Sentiment dataset about real climbing shoe models, including a summary of positive and negative aspects',
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
            currentStep.value = `Searching the web: ${data.queries.map((q: string) => `"${q}"`).join(', ')}`;
            break;

          case 'sources.process':
            creationFlow.queries.done = true;
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

        <div class="flex items-center gap-2">
          <BigTips>
            <h1 class="font-semibold text-xl">What is Sheets?</h1>
            <p>
              Sheets is an AI-native app that builds structured tables from
              prompts, web information, or existing data. The table is fully
              dynamic and modular, so you can make it evolve in multiple ways,
              including:
            </p>
            <ul class="list-disc pl-5">
              <li>Expanding the number of examples by column</li>
              <li>Translating, extracting, or summarizing specific columns</li>
              <li>Edit the model used at the column level</li>
              <li>Edit the output at the cell level</li>
            </ul>
            <h1 class="font-semibold text-xl">How can Sheets help you?</h1>
            <ul class="space-y-3">
              <li>
                <b>Conduct Deeper Research:</b> Build structured knowledge bases
                from web sources and your data, facilitating analysis and
                synthesis.
              </li>
              <li>
                <b>Supercharge Brainstorming:</b> Capture and organize
                free-flowing ideas into structured tables.
              </li>
              <li>
                <b>Enrich Datasets with AI and the Web:</b> Automatically
                identify and add relevant information, synthesize, extract, fill
                in missing data, or restructure existing and expand datasets.
              </li>
            </ul>
            <h2 class="font-semibold text-lg">Use cases:</h2>
            <ul class="space-y-1">
              <li>Build a curated dataset</li>
              <li>Explore and brainstorm topics</li>
              <li>
                Select the Open Source model that works better for your case
              </li>
              <li>Improve the quality of prompt over your own data</li>
            </ul>
            <h1 class="font-semibold text-xl">We made it for you.</h1>
            <ul class="space-y-3">
              <li>
                <b>Researchers:</b> Systematically organize information from
                diverse sources (web, documents, datasets) for analysis,
                literature reviews, and knowledge synthesis.
              </li>
              <li>
                <b>Data Analysts and Scientists:</b> Require efficient ways to
                enrich, restructure, and explore data for insights, valuing
                control over column definitions and scalable data organization.
              </li>
              <li>
                <b>Knowledge Workers & Strategists:</b> Benefit from quickly
                structuring ideas, market intelligence, and other information
                for clarity and decision-making.
              </li>
              <li>
                <b>Content Creators & Writers:</b> Need a structured way to
                organize research, brainstorming, outlines, keywords, and
                supporting information, emphasizing factual accuracy.
              </li>
              <li>
                <b>AI Builders & Early Adopters:</b> Interested in leveraging AI
                for AI development and data management.
              </li>
            </ul>
            <h1 class="font-semibold text-xl">Why should you try it?</h1>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <b>Save time:</b> Significantly faster than purely agentic deep
                research tools for generating structured data.
              </li>
              <li>
                <b>Stay in control:</b> Offers per-column prompt configuration
                and in-context learning using validated cell data, surpassing
                the limitations of chat-based UIs for precise table creation and
                refinement.
              </li>
              <li>
                <b>Scale with ease:</b> Capable of building and expanding tables
                beyond the size constraints of typical AI assistants, with a
                familiar interface for managing larger datasets.
              </li>
              <li>
                <b>Get accurate results:</b> Grounds table content using web
                search to mitigate hallucinated information and ensure data is
                sourced and verifiable.
              </li>
            </ul>
            <p class="italic mt-4">
              For questions or feedback, join the community tab.
            </p>
            <p class="mt-4">
              <b>Tip:</b> Use the search feature to find relevant information
              online and enhance your dataset.
            </p>
            <p>
              <b>Note:</b> You can also import existing data files to kickstart
              your dataset creation.
            </p>
          </BigTips>
          {session.value.anonymous ? <Login /> : <Username />}
        </div>
      </div>
      <div class="w-full min-h-screen flex flex-col items-center justify-center">
        <div class="flex flex-col justify-between min-h-screen w-full items-center">
          {/* Show top section only when not loading */}
          {!isLoading.value && (
            <div class="flex flex-col items-center justify-center space-y-4 mb-6">
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
                    class={cn(
                      'p-4 max-h-40 resize-none overflow-auto text-base placeholder:text-neutral-500',
                      {
                        'opacity-50 pointer-events-none': isLoading.value,
                      },
                    )}
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
      <Tips>
        <p>
          <b>Write a good prompt:</b> Be detailed about the topic and content
          you want.
        </p>
        <p>
          <b>Activate "Search the web":</b> For deep research, fact-checking and
          up-to-date info.
        </p>
        <p>
          <b>Start with existing data:</b> Generating new content from
          structured data helps improve accuracy. Import a file, then transform,
          augment, or enrich its content to suit your use case.
        </p>
      </Tips>
    </ActiveDatasetProvider>
  );
});
