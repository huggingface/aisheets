import {
  $,
  component$,
  type QRL,
  useComputed$,
  useSignal,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuPlus } from '@qwikest/icons/lucide';
import { Button, buttonVariants, Popover } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column/form';
import { hasBlobContent, isImage } from '~/features/utils/columns';

import { type TaskType, TEMPORAL_ID, useColumnsStore } from '~/state';

const COLUMN_PROMPTS = {
  translate: `Translate English to French, ensuring grammatical accuracy and natural, human-like phrasing.

Maintain original meaning, context, and formatting. Adapt cultural references and review carefully.

Original text: {{REPLACE_ME}}
`,

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

  imageTextToText: `Describe what you see in the image.`,

  custom: '',
} as const;

type ColumnPromptType = keyof typeof COLUMN_PROMPTS;

export const TableAddCellHeaderPlaceHolder = component$(() => {
  const ref = useSignal<HTMLElement>();
  const isOpen = useSignal(false);
  const { open } = useExecution();
  const { columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  const hasImageColumns = useComputed$(() => {
    return columns.value.some((column) => isImage(column));
  });

  const handleNewColumn = $(async (promptType: ColumnPromptType) => {
    if (lastColumnId.value === TEMPORAL_ID) return;

    // Map prompt types to column types (based on output data type)
    const typeMap = {
      translate: 'text',
      extractKeywords: 'text',
      summarize: 'text',
      textToImage: 'image',
      imageTextToText: 'text',
      custom: 'text',
    };

    // Map prompt types to task types (based on model pipeline)
    const taskMap: Record<ColumnPromptType, TaskType> = {
      translate: 'text-generation',
      extractKeywords: 'text-generation',
      summarize: 'text-generation',
      textToImage: 'text-to-image',
      imageTextToText: 'image-text-to-text',
      custom: 'text-generation',
    };

    const type = typeMap[promptType];
    const task = taskMap[promptType];

    await addTemporalColumn(type);

    const validColumns = columns.value.filter((c) => !hasBlobContent(c));

    const firstValidColumnToReference = validColumns[0];

    if (firstValidColumnToReference) {
      const initialPrompt = COLUMN_PROMPTS[promptType].replace(
        '{{REPLACE_ME}}',
        `{{${firstValidColumnToReference.name}}}`,
      );

      open(TEMPORAL_ID, 'add', {
        prompt: initialPrompt,
        task,
      });
    } else {
      open(TEMPORAL_ID, 'add', {
        prompt: '',
        task,
      });
    }
  });

  const isVisible = () => {
    const rect = ref.value?.getBoundingClientRect();
    if (!rect) return false;

    return rect.left >= 0 && rect.right <= window.innerWidth;
  };

  return (
    <th
      id={TEMPORAL_ID}
      class={cn('visible w-[62px] h-[38px] flex justify-center items-center', {
        hidden: lastColumnId.value === TEMPORAL_ID,
      })}
    >
      <Tooltip text="Add column">
        <Popover.Root
          gutter={8}
          floating={isVisible() ? 'bottom-end' : 'bottom-start'}
        >
          <Popover.Trigger
            ref={ref}
            class={cn(
              buttonVariants({ look: 'ghost' }),
              'w-[30px] h-[30px] bg-transparent text-primary rounded-full hover:bg-primary-100 flex items-center justify-center p-0',
              {
                'bg-primary-100': isOpen.value,
              },
            )}
          >
            <LuPlus class="text-lg" />
          </Popover.Trigger>

          <Popover.Panel
            class="shadow-lg w-86 text-sm p-2"
            onToggle$={() => {
              isOpen.value = !isOpen.value;
            }}
          >
            <div class="flex flex-col gap-0.5">
              <ActionButton
                label="Translate"
                column="column"
                onClick$={() => handleNewColumn('translate')}
              />
              <hr class="border-t border-slate-200 dark:border-slate-700" />
              <ActionButton
                label="Extract keywords from"
                column="column"
                onClick$={() => handleNewColumn('extractKeywords')}
              />
              <hr class="border-t border-slate-200 dark:border-slate-700" />
              <ActionButton
                label="Summarize"
                column="column"
                onClick$={() => handleNewColumn('summarize')}
              />
              <hr class="border-t border-slate-200 dark:border-slate-700" />
              <ActionButton
                label="Generate image from"
                column="column"
                onClick$={() => handleNewColumn('textToImage')}
              />
              {hasImageColumns.value && (
                <>
                  <hr class="border-t border-slate-200 dark:border-slate-700" />
                  <ActionButton
                    label="Ask the image in"
                    column="column"
                    onClick$={() => handleNewColumn('imageTextToText')}
                  />
                </>
              )}
              <hr class="border-t border-slate-200 dark:border-slate-700" />
              <ActionButton
                label="Do something with"
                column="column"
                onClick$={() => handleNewColumn('custom')}
              />
            </div>
          </Popover.Panel>
        </Popover.Root>
      </Tooltip>
    </th>
  );
});

export const ActionButton = component$<{
  label: string;
  column: string;
  onClick$: QRL<(event: PointerEvent, element: HTMLButtonElement) => any>;
}>(({ label, column, onClick$ }) => {
  return (
    <Button
      look="ghost"
      class="flex items-center justify-start w-full gap-2.5 p-2 hover:bg-neutral-100 rounded-none first:rounded-tl-md first:rounded-tr-md last:rounded-bl-md last:rounded-br-md"
      onClick$={onClick$}
    >
      <span>{label}</span>
      <span class="text-neutral-500">{`{{${column}}}`}</span>
    </Button>
  );
});
