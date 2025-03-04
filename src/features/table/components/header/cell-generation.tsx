import { component$, useComputed$ } from '@builder.io/qwik';
import { LuEgg, LuEggOff } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useGenerateColumn } from '~/features/execution';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { columns, isDirty } = useColumnsStore();
  const onGenerateColumn = useGenerateColumn();

  const canRegenerate = useComputed$(() => {
    const savedColumn = columns.value.find((c) => c.id === column.id);

    if (!savedColumn) return false;

    return isDirty(savedColumn);
  });

  if (column.id === TEMPORAL_ID || column.kind !== 'dynamic') {
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
