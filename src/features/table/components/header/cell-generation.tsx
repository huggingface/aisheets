import { component$, useContext } from '@builder.io/qwik';
import { LuEgg } from '@qwikest/icons/lucide';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useGenerateColumn } from '~/features/execution';
import { configContext } from '~/routes/home/layout';
import { type Column, TEMPORAL_ID } from '~/state';

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { onRegenerateCells } = useGenerateColumn();

  if (column.id === TEMPORAL_ID || column.kind !== 'dynamic') return null;
  if (!column.process) return null;

  const { modelEndpointEnabled } = useContext(configContext);

  column.process.useEndpointURL = modelEndpointEnabled;

  return (
    <Tooltip text="Regenerate">
      <div
        class="p-2 cursor-pointer transition-colors z-10 hover:bg-neutral-100 rounded-full"
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
