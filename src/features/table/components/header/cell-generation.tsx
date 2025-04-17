import { component$, useComputed$ } from '@builder.io/qwik';
import { LuEgg, LuEggOff } from '@qwikest/icons/lucide';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useGenerateColumn } from '~/features/execution';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellGeneration = component$<{ column: Column }>(({ column }) => {
  const { columns, isDirty } = useColumnsStore();
  const { onRegenerateCells } = useGenerateColumn();

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
      <div
        class="p-2 cursor-pointer transition-colors z-10 hover:bg-neutral-100 rounded-full"
        onClick$={() => onRegenerateCells(column)}
        role="button"
        tabIndex={0}
        aria-label="Regenerate"
        style={{
          opacity: !canRegenerate.value ? '0.5' : '1',
          pointerEvents: !canRegenerate.value ? 'none' : 'auto',
        }}
      >
        {canRegenerate.value ? (
          <LuEgg class="text-sm text-neutral" />
        ) : (
          <LuEggOff class="text-sm text-neutral" />
        )}
      </div>
    </Tooltip>
  );
});
