import { component$ } from '@builder.io/qwik';
import { LuCheckCircle, LuClock7 } from '@qwikest/icons/lucide';

interface StepStatusProps {
  isLoading: boolean;
  currentStep: string;
  creationFlow: {
    datasetName: {
      name: string;
      done: boolean;
    };
    queries: {
      queries: string[];
      done: boolean;
    };
    visitUrls: {
      urls: {
        url: string;
        status: string;
        ok?: boolean;
      }[];
      done: boolean;
    };
    indexSources: {
      count: number;
      done: boolean;
      ok: boolean;
    };
    populateDataset: {
      done: boolean;
    };
  };
  searchEnabled: boolean;
}

const LoadingSpinner = component$(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-loader-circle-icon lucide-loader-circle animate-spin"
  >
    <title>Loading...</title>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
));

const SmallLoadingSpinner = component$(() => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="animate-spin text-neutral-500"
    style="min-width:18px;min-height:18px;"
  >
    <title>Loading...</title>
    <path
      d="M21 12a9 9 0 1 1-6.219-8.56"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
));

interface StepItemProps {
  isActive: boolean;
  isDone: boolean;
  text: string;
}

const StepItem = component$<StepItemProps>(({ isActive, isDone, text }) => {
  if (!isActive && !isDone) return null;

  return (
    <div
      class="px-4 py-2 text-base flex items-center gap-2"
      style="min-height:24px"
    >
      {isActive ? (
        <>
          <LoadingSpinner />
          <span class="text-neutral-600">{text}</span>
        </>
      ) : (
        <>
          <LuCheckCircle
            class="text-primary-600"
            style="width:18px;height:18px;"
          />
          <span class="text-primary-600">{text}</span>
        </>
      )}
    </div>
  );
});

interface UrlItemProps {
  url: string;
  status: string;
}

const UrlItem = component$<UrlItemProps>(({ url, status }) => (
  <div class="flex items-center gap-2">
    {status === 'pending' ? (
      <>
        <SmallLoadingSpinner />
        <span class="text-neutral-500 text-sm">
          {url.slice(0, 80)}
          {url.length > 80 && '...'}
        </span>
      </>
    ) : (
      <span class="text-neutral-700 text-sm">
        {url.slice(0, 80)}
        {url.length > 80 && '...'}
      </span>
    )}
  </div>
));

export const StepsStatus = component$<StepStatusProps>(
  ({ isLoading, currentStep, creationFlow, searchEnabled }) => {
    if (!isLoading || !currentStep) return null;

    return (
      <>
        {/* Show the message above the status box when loading */}
        <div class="flex items-center gap-2 px-4 pt-4 pb-2">
          <LuClock7 class="text-lg text-primary-500" />
          <span class="font-semibold text-base text-primary-500">
            The dataset will be ready very soon
          </span>
        </div>
        <div
          style={`height: ${isLoading && currentStep ? '510px' : '0'}; transition: height 0.75s cubic-bezier(0.4,0,0.2,1);`}
          class="w-full overflow-hidden mb-8"
        >
          <div class="bg-neutral-100 rounded-md w-full pt-2 pb-4 border border-neutral-200 mt-2">
            <StepItem
              isActive={currentStep === 'Configuring dataset...'}
              isDone={creationFlow.datasetName.done}
              text={
                creationFlow.datasetName.done
                  ? 'Created dataset configuration'
                  : 'Configuring dataset...'
              }
            />
            {creationFlow.datasetName.name &&
              !creationFlow.datasetName.done && (
                <div
                  class="px-4 py-2 text-base text-neutral-600 flex items-center gap-2"
                  style="min-height:24px"
                >
                  Configured dataset
                </div>
              )}

            {/* Search steps - only shown if search is enabled */}
            {searchEnabled && (
              <>
                <StepItem
                  isActive={currentStep.startsWith('Searching the web')}
                  isDone={creationFlow.queries.done}
                  text={
                    creationFlow.queries.done
                      ? `Searched the web: ${creationFlow.queries.queries.map((q: string) => `"${q}"`).join(', ')}`
                      : currentStep
                  }
                />

                <StepItem
                  isActive={currentStep.startsWith('Processing URLs')}
                  isDone={
                    creationFlow.visitUrls.urls.length > 0 &&
                    creationFlow.visitUrls.urls.every(
                      (item) => item.status === 'completed',
                    )
                  }
                  text="Processed URLs"
                />

                {creationFlow.visitUrls.urls.length > 0 && (
                  <div class="px-4 text-base text-neutral-600 flex flex-col gap-2 ml-8 mt-3">
                    {creationFlow.visitUrls.urls.map((item, index) => (
                      <UrlItem
                        key={index + '-' + item.status}
                        url={item.url}
                        status={item.status}
                      />
                    ))}
                  </div>
                )}

                <StepItem
                  isActive={currentStep.startsWith('Indexing sources')}
                  isDone={
                    creationFlow.indexSources.done &&
                    creationFlow.indexSources.ok
                  }
                  text="Indexed sources"
                />
              </>
            )}
            <StepItem
              isActive={currentStep.startsWith('Populating dataset')}
              isDone={creationFlow.populateDataset.done}
              text={
                creationFlow.populateDataset.done
                  ? 'Populated dataset'
                  : currentStep
              }
            />
          </div>
        </div>
      </>
    );
  },
);
