import { $, component$, useSignal, useStore } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import {
  LuEgg,
  LuExternalLink,
  LuFileText,
  LuGlobe,
} from '@qwikest/icons/lucide';
import { Button, Label } from '~/components';
import type { SearchResultWithContent } from '~/usecases/run-assistant';
import { runAssistant } from '~/usecases/run-assistant';

export interface AssistantResult {
  columns?: string[];
  queries?: string[];
  sources?: SearchResultWithContent[];
}

// Server action to run the assistant
const runAssistantAction = server$(async function (
  instruction: string,
  searchEnabled: boolean,
  maxSearchQueries: number,
  enableScraping: boolean,
) {
  console.log('🚀 [Assistant Component] Server action called with:', {
    instruction:
      instruction.substring(0, 100) + (instruction.length > 100 ? '...' : ''),
    searchEnabled,
    maxSearchQueries,
    enableScraping,
  });

  try {
    // Call runAssistant with this context - it will get the session internally
    const result = await runAssistant.call(this, {
      instruction,
      searchEnabled,
      maxSearchQueries,
      enableScraping,
    });

    console.log(
      '✅ [Assistant Component] Server action completed successfully',
    );
    if (typeof result === 'string') {
      console.log('📝 [Assistant Component] Returning text response');
    } else {
      console.log('🔍 [Assistant Component] Returning result:', {
        columns: result.columns?.length || 0,
        queries: result.queries?.length || 0,
        sources: result.sources?.length || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('❌ [Assistant Component] Error in server action:', error);
    throw error;
  }
});

export const Assistant = component$(() => {
  const instruction = useSignal('');
  const searchEnabled = useSignal(true);
  const maxSearchQueries = useSignal(2);
  const enableScraping = useSignal(false);
  const isLoading = useSignal(false);
  const response = useStore<{
    text?: string;
    result?: AssistantResult;
    error?: string;
  }>({});

  // Run the assistant
  const handleAssistant = $(async () => {
    if (!instruction.value.trim()) return;

    console.log('▶️ [Assistant Component] Running assistant with:', {
      instruction:
        instruction.value.substring(0, 100) +
        (instruction.value.length > 100 ? '...' : ''),
      searchEnabled: searchEnabled.value,
      maxSearchQueries: maxSearchQueries.value,
      enableScraping: enableScraping.value,
    });

    isLoading.value = true;
    response.text = undefined;
    response.result = undefined;
    response.error = undefined;

    try {
      const result = await runAssistantAction(
        instruction.value,
        searchEnabled.value,
        maxSearchQueries.value,
        enableScraping.value,
      );

      console.log('✅ [Assistant Component] Got response from server action');

      // Handle the different response types
      if (typeof result === 'string') {
        console.log('📝 [Assistant Component] Setting text response');
        response.text = result;
      } else {
        console.log('🔍 [Assistant Component] Setting structured result');
        response.result = result as AssistantResult;
      }
    } catch (error: any) {
      console.error('❌ [Assistant Component] Error running assistant:', error);
      response.error = error.message || 'An error occurred';
    } finally {
      isLoading.value = false;
      console.log('⏹️ [Assistant Component] Assistant run completed');
    }
  });

  return (
    <div class="w-full h-[calc(100vh-32px)] overflow-y-auto">
      <h2 class="text-2xl font-bold mb-4">Dataset builder</h2>

      <div>
        <div class="flex flex-col gap-4">
          <Label class="text-left font-light">
            Enter your instructions for the assistant
          </Label>

          <textarea
            class="w-full h-40 p-4 border border-secondary-foreground rounded-sm resize-none"
            value={instruction.value}
            onInput$={(e, el) => (instruction.value = el.value)}
            placeholder="Enter your instructions here..."
          />
        </div>
        <div class="mt-4 flex flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <div
                class={`p-1.5 rounded-full hover:bg-neutral-100 cursor-pointer ${searchEnabled.value ? 'bg-blue-100 text-blue-600' : ''}`}
                onClick$={$(() => {
                  console.log(
                    '🔍 [Assistant Component] Toggle search:',
                    !searchEnabled.value,
                  );
                  searchEnabled.value = !searchEnabled.value;
                })}
                role="button"
                tabIndex={0}
                aria-label={
                  searchEnabled.value
                    ? 'Disable web search'
                    : 'Enable web search'
                }
              >
                <LuGlobe class="text-lg" />
              </div>
              <span
                class="text-sm font-medium cursor-pointer"
                onClick$={$(() => {
                  searchEnabled.value = !searchEnabled.value;
                })}
              >
                Search the web
              </span>
            </div>

            {searchEnabled.value && (
              <>
                <div class="flex items-center gap-2">
                  <Label class="text-sm whitespace-nowrap">
                    Search queries:
                  </Label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    class="w-12 h-8 p-1 border border-secondary-foreground rounded-sm text-center"
                    value={maxSearchQueries.value}
                    onChange$={(e, el) => {
                      const val = Number.parseInt(el.value, 10);
                      if (!Number.isNaN(val) && val > 0 && val <= 5) {
                        maxSearchQueries.value = val;
                      }
                    }}
                  />
                </div>

                <div class="flex items-center gap-2">
                  <div
                    class={`p-1.5 rounded-full hover:bg-neutral-100 cursor-pointer ${enableScraping.value ? 'bg-blue-100 text-blue-600' : ''}`}
                    onClick$={$(() => {
                      console.log(
                        '📄 [Assistant Component] Toggle scraping:',
                        !enableScraping.value,
                      );
                      enableScraping.value = !enableScraping.value;
                    })}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      enableScraping.value
                        ? 'Disable content scraping'
                        : 'Enable content scraping'
                    }
                  >
                    <LuFileText class="text-lg" />
                  </div>
                  <span
                    class="text-sm font-medium cursor-pointer"
                    onClick$={$(() => {
                      enableScraping.value = !enableScraping.value;
                    })}
                  >
                    Scrape content (Raw)
                  </span>
                </div>
              </>
            )}
          </div>

          <div class="flex items-center">
            <Button
              look="primary"
              onClick$={handleAssistant}
              disabled={isLoading.value || !instruction.value.trim()}
            >
              <div class="flex items-center gap-4">
                <LuEgg class="text-2xl" />
                {isLoading.value ? 'Processing...' : 'Run Assistant'}
              </div>
            </Button>
            {isLoading.value && (
              <div class="ml-3">
                <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary-100 border-t-transparent" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div class="mt-4 pb-20">
        {response.error && (
          <div class="text-red-500 p-4 bg-red-50 rounded-sm mb-4">
            {response.error}
          </div>
        )}

        {response.text && (
          <div class="p-4 whitespace-pre-wrap bg-white border border-secondary-foreground rounded-sm mb-4">
            {response.text}
          </div>
        )}

        {response.result && (
          <div class="space-y-6">
            {response.result.columns && response.result.columns.length > 0 && (
              <div class="bg-white border border-secondary-foreground rounded-sm p-4 mb-4">
                <h3 class="text-xl font-semibold mb-3">Suggested Columns</h3>
                <ul class="list-disc pl-5 space-y-1">
                  {response.result.columns.map((column, i) => (
                    <li key={i} class="text-sm font-medium">
                      {column}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {response.result.queries && response.result.queries.length > 0 && (
              <div class="bg-white border border-secondary-foreground rounded-sm p-4 mb-4">
                <h3 class="text-xl font-semibold mb-3">Search Queries</h3>
                <ul class="list-disc pl-5 space-y-2">
                  {response.result.queries.map((query, i) => (
                    <li key={i} class="text-sm">
                      {query}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {response.result.sources && response.result.sources.length > 0 && (
              <div class="bg-white border border-secondary-foreground rounded-sm p-4">
                <h3 class="text-xl font-semibold mb-3">Search Results</h3>
                <div class="space-y-4">
                  {response.result.sources.map((source, i) => (
                    <div key={i} class="p-3 border border-gray-200 rounded-sm">
                      <h4 class="font-medium text-lg">{source.title}</h4>
                      {source.link && (
                        <a
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-blue-500 hover:underline flex items-center gap-1 mb-2 text-sm"
                        >
                          <span class="truncate">{source.link}</span>
                          <LuExternalLink class="h-3 w-3 flex-shrink-0" />
                        </a>
                      )}
                      <p class="text-sm text-gray-600">{source.snippet}</p>

                      {source.scrapedContent && (
                        <div class="mt-3 pt-3 border-t border-gray-100">
                          <details>
                            <summary class="text-sm font-medium cursor-pointer text-blue-500 hover:underline mb-2 flex items-center gap-1">
                              <LuFileText class="h-3 w-3" />
                              <span>View scraped content</span>
                              <span class="ml-1 text-xs text-gray-500">
                                ({source.scrapedContent.length.toLocaleString()}{' '}
                                chars)
                              </span>
                            </summary>
                            <div class="mt-2 text-sm text-gray-700 max-h-[400px] overflow-y-auto bg-gray-50 p-3 rounded-sm">
                              <pre class="whitespace-pre-wrap font-mono text-xs">
                                {source.scrapedContent}
                              </pre>
                              {source.scrapedContent.length > 10000 && (
                                <div class="mt-2 text-xs text-gray-500">
                                  (Content truncated for performance)
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
