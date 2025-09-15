import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuEgg } from '@qwikest/icons/lucide';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import { type Column, TEMPORAL_ID } from '~/state';

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { onRegenerateCells } = useGenerateColumn();
  const { columnId } = useExecution();

  if (column.id === TEMPORAL_ID || column.kind !== 'dynamic') return null;
  if (!column.process) return null;

  return (
    <Tooltip text="Regenerate">
      <div
        class={cn(
          'p-2 cursor-pointer transition-colors z-10 hover:bg-neutral-100 rounded-full',
          {
            'hover:bg-neutral-300': columnId.value === column.id,
          },
        )}
        onClick$={() => onRegenerateCells(column)}
        role="button"
        tabIndex={0}
        aria-label="Regenerate"
        preventdefault:click
        stoppropagation:click
      >
        <LuEgg class="text-sm text-neutral" />
      </div>
    </Tooltip>
  );
});
