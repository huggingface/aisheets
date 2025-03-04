import { $, component$, useSignal } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Input } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { updateColumnPartially } from '~/services';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const ColumnNameEdition = component$<{ column: Column }>(
  ({ column }) => {
    const isClicking = useSignal(false);
    const newName = useSignal(column.name);
    const { updateColumn } = useColumnsStore();

    const ref = useClickOutside(
      $(() => {
        if (!isClicking.value) return;
        isClicking.value = false;

        if (newName.value === column.name) return;
        column.name = newName.value;

        updateColumn({ ...column });

        if (column.id === TEMPORAL_ID) {
          return;
        }

        server$(async (id: string, name: string) => {
          await updateColumnPartially({ id, name });
        })(column.id, newName.value);
      }),
    );

    return (
      <div
        class="font-normal w-full"
        ref={ref}
        onClick$={() => (isClicking.value = true)}
      >
        <Input type="text" class="h-8 bg-primary" bind:value={newName} />
      </div>
    );
  },
);
