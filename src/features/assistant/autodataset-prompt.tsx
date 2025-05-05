import { $, component$, useSignal, useStore } from '@builder.io/qwik';
import { server$, useNavigate } from '@builder.io/qwik-city';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { runAutoDataset } from '~/usecases/run-autodataset';

// Server action to run the autodataset action
const runAutoDatasetAction = server$(async function (
  instruction: string,
  searchEnabled: boolean,
) {
  return await runAutoDataset.call(this, {
    instruction,
    searchEnabled,
    maxSearchQueries: 2,
  });
});

export const AutoDatasetPrompt = component$(() => {
  const prompt = useSignal('');
  const searchEnabled = useSignal(true);
  const isLoading = useSignal(false);
  const response = useStore<{
    text?: string;
    error?: string;
  }>({});
  const nav = useNavigate();

  // Run the assistant
  const handleAssistant = $(async () => {
    if (!prompt.value.trim()) return;

    isLoading.value = true;
    response.text = undefined;
    response.error = undefined;

    try {
      const result = await runAutoDatasetAction(
        prompt.value,
        searchEnabled.value,
      );

      if (typeof result === 'string') {
        response.text = result;
      } else if ('dataset' in result && result.dataset) {
        // Navigate to the dataset page
        await nav(`/home/dataset/${result.dataset}/`);
        return;
      }
    } catch (error) {
      response.error = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <div class="relative w-[600px] mt-6">
      <div class="w-full h-52 min-h-52 max-h-52 bg-white border border-secondary-foreground rounded-sm pt-2">
        <Textarea
          id="prompt"
          look="ghost"
          value={prompt.value}
          onInput$={(_, el) => (prompt.value = el.value)}
          placeholder="Create customer claims. Categorize them as formal, humorous, neutral, or injurious, and respond to each in a neutral tone."
          class="px-4 h-32 min-h-32 max-h-32 resize-none overflow-auto text-base rounded-sm text-neutral-500 placeholder:text-neutral-400"
        />
      </div>
      <div class="w-full absolute bottom-2 px-4 flex flex-row items-center justify-between cursor-text">
        <div class="flex w-full justify-between items-center">
          <Button
            look="secondary"
            class={`flex gap-1 p-2 h-9 ${searchEnabled.value ? 'text-blue-600 bg-blue-50' : 'text-neutral-700'}`}
            onClick$={() => (searchEnabled.value = !searchEnabled.value)}
          >
            <LuGlobe class="text-lg" />
            Search the web
          </Button>

          <Button
            look="primary"
            onClick$={handleAssistant}
            disabled={isLoading.value || !prompt.value.trim()}
          >
            <LuEgg class="text-2xl" />
          </Button>
        </div>
      </div>

      {response.error && (
        <div class="mt-4 text-red-500 p-4 bg-red-50 rounded-sm">
          {response.error}
        </div>
      )}

      {response.text && (
        <div class="mt-4 p-4 whitespace-pre-wrap bg-white border border-secondary-foreground rounded-sm">
          {response.text}
        </div>
      )}
    </div>
  );
});
