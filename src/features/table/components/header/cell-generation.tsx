import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import { LuEgg, LuEggOff } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useGenerateColumn } from '~/features/execution';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { state, canGenerate } = useColumnsStore();
  const onGenerateColumn = useGenerateColumn();

  const canRegenerate = useSignal(false);

  useTask$(async ({ track }) => {
    track(state);

    canRegenerate.value = await canGenerate(column);
  });

  if (column.id === TEMPORAL_ID) {
    return null;
  }

  return (
    <Tooltip text="Regenerate">
      <Button
        look="ghost"
        size="sm"
        disabled={!canRegenerate.value}
        onClick$={() => onGenerateColumn(column)}
      >
        {canRegenerate.value ? (
          <LuEgg class="text-primary-foreground" />
        ) : (
          <LuEggOff class="text-primary-foreground" />
        )}
      </Button>
    </Tooltip>
  );
});
