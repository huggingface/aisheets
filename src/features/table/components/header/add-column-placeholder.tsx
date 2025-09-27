import {
  $,
  component$,
  type QRL,
  useComputed$,
  useSignal,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuChevronDown, LuEgg, LuLoader2 } from '@qwikest/icons/lucide';
import { Button, buttonVariants, Popover, Textarea } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { IAColumn } from '~/components/ui/logo/logo';
import { useExecution } from '~/features/add-column/form';
import { useColumnsPreference } from '~/features/table/components/context/colunm-preferences.context';

import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

const COLUMN_PROMPTS = {
  extractKeywords: `Identify and extract the most salient keywords or key phrases representing the core topics from the provided text.

Return these as a single, comma-separated string. Prioritize relevance and conciseness, avoiding common stop words.

Text for keyword extraction: {{REPLACE_ME}}
`,

  summarize: `Condense the provided text, capturing its essential meaning and key points accurately and coherently.

If the text is already very short, return it as is. Use your own words where possible (abstractive summary).

Text to summarize: {{REPLACE_ME}}
`,

  textToImage: `Generate a detailed and visually rich image based on the provided text description.

Ensure the image captures the essence of the text, including key elements, colors, and overall mood. 

Description: {{REPLACE_ME}}`,

  custom: `

{{REPLACE_ME}}`,
} as const;

type ColumnPromptType = keyof typeof COLUMN_PROMPTS;

export const TableAddCellHeaderPlaceHolder = component$<{ column: Column }>(
  ({ column }) => {
    const { open, close } = useExecution();
    const { columns } = useColumnsStore();
    const isUsingTemplate = useSignal<boolean>();
    const prompt = useSignal<string>('');
    const { openAiPrompt, closeAiPrompt, closeAiColumn } =
      useColumnsPreference();
    const isGenerating = useSignal(false);
    const textAreaRef = useSignal<HTMLTextAreaElement>();

    const isAnyColumnTemporal = useComputed$(() =>
      columns.value.some((c) => c.id === TEMPORAL_ID),
    );

    const cleanUp = $(() => {
      isUsingTemplate.value = false;
      prompt.value = '';
      isGenerating.value = false;
    });

    const onCreateColumn = $(async (type: Column['type'], prompt: string) => {
      isGenerating.value = true;

      nextTick(async () => {
        await close();
        await open('add', {
          nextColumnId: column.id,
          type,
          prompt,
        });

        await closeAiColumn(column.id);
        await closeAiPrompt(column.id);
      }, 300);
    });

    const handleTemplate = $(async (promptType: ColumnPromptType) => {
      const initialPrompt = COLUMN_PROMPTS[promptType].replace(
        '{{REPLACE_ME}}',
        `{{${column.name}}}`,
      );

      await onCreateColumn(
        promptType === 'textToImage' ? 'image' : 'text',
        initialPrompt,
      );
    });

    const handleNewColumn = $(async () => {
      if (!prompt.value.trim()) return;

      prompt.value += COLUMN_PROMPTS['custom'].replace(
        '{{REPLACE_ME}}',
        `{{${column.name}}}`,
      );

      await onCreateColumn('unknown', prompt.value.trim());
    });

    if (isAnyColumnTemporal.value) return null;

    return (
      <Popover.Root gutter={8} floating="right-start">
        <Popover.Trigger
          class={cn(
            buttonVariants({ look: 'ghost' }),
            'w-8 h-8 rounded-md bg-primary-300',
          )}
          preventdefault:mousedown
          stoppropagation:mousedown
        >
          <IAColumn class="text-sm text-white" />
        </Popover.Trigger>

        <Popover.Panel
          class="shadow-lg w-96 text-sm p-0"
          onToggle$={(e) => {
            if (e.newState === 'open') {
              nextTick(() => {
                textAreaRef.value?.focus();
              });
              openAiPrompt(column.id);
              cleanUp();
            } else {
              closeAiPrompt(column.id);
            }
          }}
        >
          <div class="flex flex-col">
            <div class="flex flex-col gap-2">
              <Textarea
                ref={textAreaRef}
                look="ghost"
                class="h-[52px] min-h-[52px] max-h-28 overflow-hidden resize-none"
                placeholder="Prompt to generate (e.g Translate in French)"
                bind:value={prompt}
                onKeyDown$={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    handleNewColumn();
                  }
                }}
                onInput$={(event) => {
                  const textarea = event.target as HTMLTextAreaElement;

                  textarea.style.height = 'auto';

                  const newHeight = Math.min(textarea.scrollHeight, 112);
                  textarea.style.height = `${newHeight}px`;
                }}
                stoppropagation:mousedown
              />

              <hr class="border-t border-[1px] border-neutral-300" />

              <div
                class="flex items-center justify-between px-3 pb-2"
                stoppropagation:mousedown
              >
                <Button
                  look="ghost"
                  class="w-fit flex gap-1 items-center justify-between text-neutral-700"
                  onClick$={() => {
                    isUsingTemplate.value = !isUsingTemplate.value;
                  }}
                  aria-expanded={isUsingTemplate.value}
                  aria-controls="template-options"
                  preventdefault:mousedown
                  stoppropagation:mousedown
                >
                  Use Template
                  <LuChevronDown />
                </Button>

                <Button
                  look="primary"
                  class="p-2 w-[30px] h-[30px] rounded-full flex items-center justify-center"
                  onClick$={handleNewColumn}
                  disabled={isGenerating.value || !prompt.value.trim()}
                >
                  {isGenerating.value ? (
                    <LuLoader2 class="text-sm text-white animate-spin" />
                  ) : (
                    <LuEgg class="text-sm text-white" />
                  )}
                </Button>
              </div>
            </div>

            {isUsingTemplate.value && (
              <div class="flex flex-col">
                <hr class="border-t border-slate-200 dark:border-slate-700" />
                <ActionButton
                  label="Extract keywords"
                  onClick$={() => handleTemplate('extractKeywords')}
                />
                <hr class="border-t border-slate-200 dark:border-slate-700" />
                <ActionButton
                  label="Summarize"
                  onClick$={() => handleTemplate('summarize')}
                />
                <hr class="border-t border-slate-200 dark:border-slate-700" />
                <ActionButton
                  label="Generate image"
                  onClick$={() => handleTemplate('textToImage')}
                />
              </div>
            )}
          </div>
        </Popover.Panel>
      </Popover.Root>
    );
  },
);

export const ActionButton = component$<{
  label: string;
  onClick$: QRL<(event: PointerEvent, element: HTMLButtonElement) => any>;
}>(({ label, onClick$ }) => {
  return (
    <Button
      look="ghost"
      class="flex items-center justify-start w-full gap-2.5 p-2 px-3 hover:bg-neutral-100 rounded-none last:rounded-bl-md last:rounded-br-md text-neutral-700"
      onClick$={onClick$}
      stoppropagation:mousedown
    >
      {label}
    </Button>
  );
});
