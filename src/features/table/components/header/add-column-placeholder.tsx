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
  const { open } = useExecution();
  const { columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  const handleNewColumn = $(async () => {
    if (lastColumnId.value === TEMPORAL_ID) return;

    await addTemporalColumn();

    nextTick(() => {
      open(TEMPORAL_ID, 'add');
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
            'w-[30px] h-[30px] bg-transparent text-primary rounded-full hover:bg-primary-100  flex items-center justify-center p-0',
          )}
        >
          <LuPlus class="text-lg" />
        </Popover.Trigger>

        <Popover.Panel
          stoppropagation:click
          class="shadow-lg w-fit min-w-[230px] p-1"
        >
          <div class="flex flex-col gap-1">
            <ActionButton label="Translate" action={handleNewColumn} />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton label="Extract keywords from" />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton label="Summarize" />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
            <ActionButton label="Do anything with" />
          </div>
        </Popover.Panel>
      </Popover.Root>
    </th>
  );
});

export const ActionButton = component$<{
  label: string;
  action?: QRL<(event: PointerEvent, element: HTMLButtonElement) => any>;
}>(({ label, action }) => {
  return (
    <Button
      look="ghost"
      class="flex items-center justify-start w-full h-[30px] gap-1 hover:bg-neutral-100 p-1"
      onClick$={action}
    >
      <span>{label}</span>
      <span class="text-neutral-500">{'{{Colum}}'}</span>
    </Button>
  );
});
