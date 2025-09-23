import {
  $,
  component$,
  type QRL,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuSparkles } from '@qwikest/icons/lucide';
import { Button, buttonVariants, Input, Popover } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column/form';

import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

const COLUMN_PROMPTS = {
  translate: `Translate English to French, ensuring grammatical accuracy and natural, human-like phrasing.

Maintain original meaning, context, and formatting. Adapt cultural references and review carefully.

Original text: {{REPLACE_ME}}`,

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

  custom: '',
} as const;

type ColumnPromptType = keyof typeof COLUMN_PROMPTS;

export const TableAddCellHeaderPlaceHolder = component$<{ column: Column }>(
  ({ column }) => {
    const ref = useSignal<HTMLElement>();
    const isOpen = useSignal(false);
    const { open } = useExecution();
    const { columns, addTemporalColumn } = useColumnsStore();
    const isUsingTemplate = useSignal<boolean>();
    const prompt = useSignal<string>('');

    const isLastColumnTemporal = useComputed$(
      () => columns.value[columns.value.length - 1].id == TEMPORAL_ID,
    );

    const handleTemplate = $(async (promptType: ColumnPromptType) => {
      const initialPrompt = COLUMN_PROMPTS[promptType].replace(
        '{{REPLACE_ME}}',
        `{{${column.name}}}`,
      );

      await addTemporalColumn(promptType === 'textToImage' ? 'image' : 'text');

      open(TEMPORAL_ID, 'add', initialPrompt);
    });

    const handleNewColumn = $(async () => {
      if (!prompt.value.trim()) return;

      // TODO: Ask for type if prompt includes {{REPLACE_ME}}???
      await addTemporalColumn('text');

      prompt.value += `
      Original text: {{${column.name}}}`;

      open(TEMPORAL_ID, 'add', prompt.value.trim());
    });

    useVisibleTask$(({ track }) => {
      track(isOpen);

      isUsingTemplate.value = false;
    });

    if (isLastColumnTemporal.value) return null;

    return (
      <div class="absolute top-0 right-0 m-1 mr-[6px] w-8 h-full">
        <Tooltip text="Add column">
          <Popover.Root gutter={8}>
            <Popover.Trigger
              ref={ref}
              class={cn(
                buttonVariants({ look: 'ghost' }),
                'p-2 flex items-center justify-center transition-opacity duration-300 rounded-full',
                {
                  'bg-primary-100': isOpen.value,
                  'opacity-0 group-hover:opacity-100 hover:bg-primary-100':
                    !isOpen.value,
                },
              )}
              preventdefault:mousedown
              stoppropagation:mousedown
            >
              <LuSparkles class="text-sm text-primary" />
            </Popover.Trigger>

            <Popover.Panel
              class="shadow-lg w-96 text-sm p-2"
              onToggle$={() => {
                isOpen.value = !isOpen.value;
              }}
            >
              <div class="flex flex-col gap-2">
                <div
                  class="w-full h-10 flex items-center justify-between gap-3"
                  stoppropagation:mousedown
                >
                  <Input
                    class="h-8"
                    placeholder='Ask anything like "Translate to French"'
                    bind:value={prompt}
                  />

                  <Button
                    look="primary"
                    class="p-2 w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    onClick$={handleNewColumn}
                  >
                    <LuEgg class="text-sm text-white" />
                  </Button>
                </div>

                <Button
                  look="ghost"
                  class="px-1 w-fit text-xs hover:underline"
                  onClick$={() => {
                    isUsingTemplate.value = !isUsingTemplate.value;
                  }}
                  aria-expanded={isUsingTemplate.value}
                  aria-controls="template-options"
                  preventdefault:mousedown
                  stoppropagation:mousedown
                >
                  Or use a template
                </Button>

                {isUsingTemplate.value && (
                  <div class="flex flex-col">
                    <ActionButton
                      label="Translate"
                      onClick$={() => handleTemplate('translate')}
                    />
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
                    <hr class="border-t border-slate-200 dark:border-slate-700" />
                    <ActionButton
                      label="Do something else..."
                      onClick$={() => handleTemplate('custom')}
                    />
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Popover.Root>
        </Tooltip>
      </div>
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
      class="flex items-center justify-start w-full gap-2.5 p-2 hover:bg-neutral-100 rounded-none first:rounded-tl-md first:rounded-tr-md last:rounded-bl-md last:rounded-br-md"
      onClick$={onClick$}
      stoppropagation:mousedown
    >
      <span>{label}</span>
    </Button>
  );
});
