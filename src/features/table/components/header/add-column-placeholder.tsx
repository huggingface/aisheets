import {
  $,
  component$,
  type QRL,
  useComputed$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuChevronDown, LuEgg } from '@qwikest/icons/lucide';
import { Button, buttonVariants, Popover, Textarea } from '~/components';
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
    const isOpen = useSignal(false);
    const { open, close } = useExecution();
    const { columns } = useColumnsStore();
    const isUsingTemplate = useSignal<boolean>();
    const prompt = useSignal<string>('');
    const { openAiPrompt, closeAiPrompt } = useColumnsPreference();

    const isLastColumnTemporal = useComputed$(
      () => columns.value[columns.value.length - 1].id == TEMPORAL_ID,
    );

    const onCreateColumn = $(async (type: Column['type'], prompt: string) => {
      isOpen.value = false;

      await close();

      await open('add', {
        type,
        prompt,
      });
    });

    const handleTemplate = $(async (promptType: ColumnPromptType) => {
      const initialPrompt = COLUMN_PROMPTS[promptType].replace(
        '{{REPLACE_ME}}',
        `{{${column.name}}}`,
      );

      onCreateColumn(
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

      onCreateColumn('unknown', prompt.value.trim());
    });

    useTask$(({ track }) => {
      track(isOpen);

      if (isOpen.value) {
        isUsingTemplate.value = false;
        prompt.value = '';
      }

      if (isOpen.value) {
        openAiPrompt(column.id);
      } else {
        closeAiPrompt(column.id);
      }
    });

    if (isLastColumnTemporal.value) return null;

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
          onToggle$={() => {
            isOpen.value = !isOpen.value;
          }}
        >
          <div class="flex flex-col">
            <div class="flex flex-col gap-2">
              <Textarea
                look="ghost"
                class="h-[52px] min-h-[52px] max-h-28 overflow-hidden resize-none"
                placeholder="Prompt to generate (e.g Translate in French)"
                bind:value={prompt}
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
                >
                  <LuEgg class="text-sm text-white" />
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
