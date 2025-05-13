import {
  $,
  type QRL,
  component$,
  useComputed$,
  useSignal,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuPlus } from '@qwikest/icons/lucide';
import { Button, Popover, buttonVariants } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

const COLUMN_PROMPTS = {
  translate: `You are an expert Translator, specialized in translating documents from English to French.
  
Your main goals are to ensure grammatically correct translations and deliver text that feels natural and human-oriented. 

Instructions:
1. Translate the provided text from the source language to the specified target language.
2. Ensure that the translation maintains the meaning and context of the original text.
3. Use appropriate grammar, syntax, and idiomatic expressions to make the translation sound natural.
4. Avoid literal translations unless necessary to preserve the meaning.
5. If there are cultural references or idioms, adapt them to be understandable and relevant in the target language.
6. Keep the formatting and structure of the original text intact unless specified otherwise.
7. Review the translation for any errors or awkward phrasing before finalizing.

Original text:

`,

  extractKeywords: `You are an expert in identifying and extracting key concepts from text.
  
Your main goal is to identify and list the most salient keywords or key phrases that accurately represent the core topics and themes of the provided text.

Instructions:
1. Carefully analyze the provided text from the column.
2. Identify the most important and representative keywords or key phrases.
3. Focus on terms (single words or multi-word phrases) that best capture the main topics, entities, and core concepts discussed.
4. Prioritize relevance and significance to the overall meaning of the text.
5. Return these keywords as a single, comma-separated string.
6. Avoid overly generic or common words (stop words) unless they are specifically crucial to the context of this particular text.
7. Aim for conciseness and impact in your selection. Ensure the keywords are directly from the text or very close derivatives if necessary for canonical form (e.g., "running" -> "run").

Text for keyword extraction:

`,

  summarize: `You are an expert in text summarization, adept at distilling information into concise and coherent overviews.
  
Your main goals are to capture the essential meaning and key points of the provided text, presenting them in a significantly shorter form while retaining accuracy and context.

Instructions:
1. Thoroughly analyze the provided text from the column to understand its core message.
2. Identify the main ideas, key arguments, and crucial supporting details.
3. Synthesize this information into a brief, clear, and informative summary.
4. Ensure the summary is coherent, well-structured, and flows logically.
5. Accurately represent the original meaning and context of the text without introducing personal opinions or interpretations.
6. If the original content is already very short (e.g., a single short sentence or a few words that cannot be meaningfully shortened further), return the original text as is.
7. For longer content, focus on creating a summary that is substantially shorter but still comprehensive in its coverage of vital information.
8. Omit redundant information, minor details, and specific examples unless they are critical to understanding the main points.
9. Use your own words as much as possible (abstractive summary) while preserving the original intent and key terminology.

Text to summarize:

`,

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

  const handleNewColumn = $(async (promptType: ColumnPromptType) => {
    if (lastColumnId.value === TEMPORAL_ID) return;

    await addTemporalColumn();

    nextTick(() => {
      open(TEMPORAL_ID, 'add', COLUMN_PROMPTS[promptType]);
    });
  });

  const isVisible = () => {
    const rect = ref.value?.getBoundingClientRect();
    if (!rect) return false;

    return rect.left >= 0 && rect.right <= window.innerWidth;
  };

  return (
    <th
      id={lastColumnId.value}
      class={cn('visible w-20 flex justify-center items-center', {
        hidden: lastColumnId.value === TEMPORAL_ID,
      })}
    >
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
          class="shadow-lg w-fit min-w-[230px] p-1"
          onToggle$={() => {
            isOpen.value = !isOpen.value;
          }}
        >
          <div class="flex flex-col">
            <ActionButton
              label="Translate"
              onClick$={() => handleNewColumn('translate')}
            />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton
              label="Extract keywords"
              onClick$={() => handleNewColumn('extractKeywords')}
            />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton
              label="Summarize"
              onClick$={() => handleNewColumn('summarize')}
            />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton
              label="Custom operation"
              onClick$={() => handleNewColumn('custom')}
            />
          </div>
        </Popover.Panel>
      </Popover.Root>
    </th>
  );
});

export const ActionButton = component$<{
  label: string;
  onClick$: QRL<(event: PointerEvent, element: HTMLButtonElement) => any>;
}>(({ label, onClick$ }) => {
  return (
    <Button
      look="ghost"
      class="flex items-center justify-start w-full h-[30px] gap-1 hover:bg-neutral-100 p-1 rounded-none first:rounded-tl-md first:rounded-tr-md last:rounded-bl-md last:rounded-br-md"
      onClick$={onClick$}
    >
      <span>{label}</span>
      <span class="text-neutral-500">{'{{Colum}}'}</span>
    </Button>
  );
});
