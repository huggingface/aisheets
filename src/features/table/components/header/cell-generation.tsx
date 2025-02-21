import { component$, useComputed$ } from '@builder.io/qwik';
import { LuEgg, LuEggOff } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useGenerateColumn } from '~/features/execution';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { state: columns } = useColumnsStore();
  const onGenerateColumn = useGenerateColumn();

  const hasAtLeastOneRowValidated = useComputed$(() => {
    const thisColumn = columns.value.find((col) => col.id === column.id);
    if (!thisColumn) return false;

    return thisColumn.cells.some((cells) => cells.validated);
  });

  if (column.id === TEMPORAL_ID) {
    return null;
  }

  return (
    <Tooltip text="Regenerate">
      <Button
        look="ghost"
        size="sm"
        disabled={!hasAtLeastOneRowValidated.value}
        onClick$={() => onGenerateColumn(column)}
      >
        {hasAtLeastOneRowValidated.value ? (
          <LuEgg class="text-primary-foreground" />
        ) : (
          <LuEggOff class="text-primary-foreground" />
        )}
      </Button>
    </Tooltip>
  );
});
