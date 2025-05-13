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

export const TableAddCellHeaderPlaceHolder = component$(() => {
  const ref = useSignal<HTMLElement>();
  const isOpen = useSignal(false);
  const { open } = useExecution();
  const { columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  const handleNewColumn = $(async (prompt: string) => {
    if (lastColumnId.value === TEMPORAL_ID) return;

    await addTemporalColumn();

    nextTick(() => {
      open(TEMPORAL_ID, 'add', prompt);
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
      class={cn('visible w-[62px] h-[38px] flex justify-center items-center', {
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
              onClick$={() => handleNewColumn('Translate')}
            />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton
              label="Extract keywords from"
              onClick$={() => handleNewColumn('Extract keywords from')}
            />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton
              label="Summarize"
              onClick$={() => handleNewColumn('Summarize')}
            />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton
              label="Do anything with"
              onClick$={() => handleNewColumn('Do anything with')}
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
