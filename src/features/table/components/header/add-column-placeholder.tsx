import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuLoader2, LuSparkle } from '@qwikest/icons/lucide';
import {
  Button,
  buttonVariants,
  Popover,
  Select,
  Textarea,
} from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column/form';
import { useColumnsPreference } from '~/features/table/components/context/colunm-preferences.context';

import type { Column, TaskType } from '~/state';

type PromptsType = {
  label: string;
  prompt: string;
  hide?: boolean;
};

type PromptsTypeWithKey = { key: string } & PromptsType;

const TEXT_COLUMN_PROMPTS: Record<string, PromptsType> = {
  extractKeywords: {
    label: 'Extract keywords',
    prompt: `Identify and extract the most salient keywords or key phrases representing the core topics from the provided text.

Return these as a single, comma-separated string. Prioritize relevance and conciseness, avoiding common stop words.

Text for keyword extraction: {{REPLACE_ME}}
`,
  },

  summarize: {
    label: 'Summarize',
    prompt: `Condense the provided text, capturing its essential meaning and key points accurately and coherently.

If the text is already very short, return it as is. Use your own words where possible (abstractive summary).

Text to summarize: {{REPLACE_ME}}
`,
  },

  textToImage: {
    label: 'Generate image',
    prompt: `Generate a detailed and visually rich image based on the provided text description.

Ensure the image captures the essence of the text, including key elements, colors, and overall mood. 

Description: {{REPLACE_ME}}`,
  },

  custom: {
    hide: true,
    label: 'Custom',
    prompt: `

{{REPLACE_ME}}`,
  },
};

const IMAGE_COLUMN_PROMPTS: Record<string, PromptsType> = {
  imageTextToText: {
    label: 'Describe the image',
    prompt: `Describe what you see in the image.`,
  },
};

const ALL_COLUMN_PROMPTS = {
  ...TEXT_COLUMN_PROMPTS,
  ...IMAGE_COLUMN_PROMPTS,
};

export const TableAddCellHeaderPlaceHolder = component$<{ column: Column }>(
  ({ column }) => {
    const { columnId, open, close } = useExecution();
    const prompt = useSignal<string>('');
    const { columnPreferences, openAiPrompt, closeAiPrompt, closeAiColumn } =
      useColumnsPreference();
    const isGenerating = useSignal(false);
    const textAreaRef = useSignal<HTMLTextAreaElement>();

    const promptTemplate = useComputed$<PromptsTypeWithKey[]>(() => {
      let prompt = Object.entries(TEXT_COLUMN_PROMPTS);

      if (column.type === 'image') {
        prompt = Object.entries(IMAGE_COLUMN_PROMPTS);
      }

      return prompt.map(([key, value]) => ({
        key,
        ...value,
      }));
    });

    const cleanUp = $(() => {
      prompt.value = '';
      isGenerating.value = false;
    });

    const onCreateColumn = $(
      async (type: Column['type'], task: TaskType, prompt: string) => {
        isGenerating.value = true;

        nextTick(async () => {
          await close();
          await open('add', {
            nextColumnId: column.id,
            type,
            task,
            prompt,
          });

          await closeAiColumn(column.id);
          await closeAiPrompt(column.id);
        }, 300);
      },
    );

    const handleTemplate = $(
      async (promptTemplateSelected: PromptsTypeWithKey) => {
        const initialPrompt = ALL_COLUMN_PROMPTS[
          promptTemplateSelected.key
        ].prompt.replace('{{REPLACE_ME}}', `{{${column.name}}}`);

        const typeMap: Record<string, Column['type']> = {
          translate: 'text',
          extractKeywords: 'text',
          summarize: 'text',
          textToImage: 'image',
          imageTextToText: 'text',
          custom: 'text',
        };

        const taskMap: Record<string, TaskType> = {
          translate: 'text-generation',
          extractKeywords: 'text-generation',
          summarize: 'text-generation',
          textToImage: 'text-to-image',
          imageTextToText: 'image-text-to-text',
          custom: 'text-generation',
        };

        await onCreateColumn(
          typeMap[promptTemplateSelected.key],
          taskMap[promptTemplateSelected.key],
          initialPrompt,
        );
      },
    );

    const handleNewColumn = $(async () => {
      if (!prompt.value.trim()) return;

      const newReferencePrompt = TEXT_COLUMN_PROMPTS['custom'].prompt.replace(
        '{{REPLACE_ME}}',
        `{{${column.name}}}`,
      );

      const newPrompt = `${prompt.value.trim()} ${newReferencePrompt}`;

      // TODO: @dvsrepo get dynamically the "task" type.
      await onCreateColumn('unknown', 'text-generation', newPrompt);
    });

    if (columnId.value) return null;

    return (
      <Popover.Root gutter={8} floating="right-start">
        <Popover.Trigger
          class={cn(
            buttonVariants({ look: 'ghost' }),
            'w-10 h-10 rounded-full bg-primary-50 fill-primary-300 text-primary-300 hover:bg-primary-300 hover:text-white',
            {
              'fill-white bg-primary-300 text-white':
                columnPreferences.value[column.id]?.aiPromptOpen,
            },
          )}
          preventdefault:mousedown
          stoppropagation:mousedown
        >
          <LuSparkle
            class={cn('text-lg fill-primary-300', {
              'fill-white': columnPreferences.value[column.id]?.aiPromptOpen,
            })}
          />
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
                class="p-3 h-9 min-h-9 max-h-28 overflow-hidden resize-none"
                placeholder="Type your action (e.g. translate to French)"
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

                  if (!textarea.value) {
                    textarea.style.height = '2.25rem';

                    return;
                  }
                  textarea.style.height = 'auto';

                  const newHeight = Math.min(textarea.scrollHeight, 112);
                  textarea.style.height = `${newHeight}px`;
                }}
                stoppropagation:mousedown
              />

              <hr />

              <div
                class="flex items-center justify-between pb-2"
                stoppropagation:mousedown
              >
                <Select.Root class="w-44">
                  <Select.Trigger
                    look="ghost"
                    class="w-fit text-neutral-700"
                    preventdefault:mousedown
                    stoppropagation:mousedown
                  >
                    Use Template
                  </Select.Trigger>
                  <Select.Popover gutter={10} floating="bottom-start">
                    {promptTemplate.value
                      .filter((p) => !p.hide)
                      .map((prompt) => (
                        <Select.Item
                          key={prompt.label}
                          onClick$={() => handleTemplate(prompt)}
                        >
                          <Select.ItemLabel>{prompt.label}</Select.ItemLabel>
                        </Select.Item>
                      ))}
                  </Select.Popover>
                </Select.Root>

                <Button
                  look="primary"
                  class="mr-3 p-2 w-[30px] h-[30px] rounded-full flex items-center justify-center"
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
          </div>
        </Popover.Panel>
      </Popover.Root>
    );
  },
);
