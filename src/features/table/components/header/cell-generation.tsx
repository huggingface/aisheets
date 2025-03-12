import {
  component$,
  useComputed$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { LuEgg, LuEggOff } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useGenerateColumn } from '~/features/execution';
import { hasChangesAfterLastExecution } from '~/services';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

const hasChangesAfterLastExecution$ = server$(hasChangesAfterLastExecution);

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { columns, isDirty } = useColumnsStore();
  const { onRegenerateCells } = useGenerateColumn();

  const currentColumn = useComputed$(() =>
    columns.value.find((c) => c.id === column.id),
  );

  const canRegenerate = useSignal(false);

  useTask$(async ({ track }) => {
    track(currentColumn);

    if (currentColumn.value && currentColumn.value.id !== TEMPORAL_ID) {
      canRegenerate.value = await hasChangesAfterLastExecution$({
        id: currentColumn.value.id!,
      });
    }
  });

  if (column.id === TEMPORAL_ID || column.kind !== 'dynamic') {
    return null;
  }

  return (
    <Tooltip text="Regenerate">
      <Button
        class="rounded-full"
        look="ghost"
        size="sm"
        disabled={!canRegenerate.value}
        onClick$={() => onRegenerateCells(column)}
      >
        {canRegenerate.value ? (
          <LuEgg class="text-sm text-primary-foreground" />
        ) : (
          <LuEggOff class="text-sm text-primary-foreground" />
        )}
      </Button>
    </Tooltip>
  );
});
