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
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

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

  custom: '',
} as const;

type ColumnPromptType = keyof typeof COLUMN_PROMPTS;

export const TableAddCellHeaderPlaceHolder = component$(() => {
  const ref = useSignal<HTMLElement>();
  const isOpen = useSignal(false);
  const { open } = useExecution();
  const { firstColumn, columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  const handleNewColumn = $(async (promptType: ColumnPromptType) => {
    if (lastColumnId.value === TEMPORAL_ID) return;

    await addTemporalColumn();

    const initialPrompt = COLUMN_PROMPTS[promptType].replace(
      '{{REPLACE_ME}}',
      `{{${firstColumn.value.name}}}`,
    );

    open(TEMPORAL_ID, 'add', initialPrompt);
  });

  const isVisible = () => {
    const rect = ref.value?.getBoundingClientRect();
    if (!rect) return false;

    return rect.left >= 0 && rect.right <= window.innerWidth;
  };

  return (
    <th
      id={lastColumnId.value}
      class={cn('visible w-[62px] h-[38px] flex justify-center items-center', {
        hidden: lastColumnId.value === TEMPORAL_ID,
      })}
    >
      <Popover.Root
        gutter={8}
        floating={isVisible() ? 'bottom-end' : 'bottom-start'}
      >
        <Tooltip text="Add column">
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
        </Tooltip>

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
              label="Do something with"
              column="column"
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
