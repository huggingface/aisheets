import { $, component$, useSignal } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Input, useToggle } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { updateColumnName } from '~/services';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellName = component$<{ column: Column }>(({ column }) => {
  const isEditingCellName = useToggle();
  const newName = useSignal(column.name);
  const { updateColumn } = useColumnsStore();

  const ref = useClickOutside(
    $(() => {
      if (!isEditingCellName.isOpen.value) return;
      isEditingCellName.close();

      if (column.id === TEMPORAL_ID) {
        column.name = newName.value;
        return;
      }

      server$(async (columnId: string, newName: string) => {
        await updateColumnName(columnId, newName);
      })(column.id, newName.value);

      updateColumn({ ...column, name: newName.value });
    }),
  );

  const editCellName = $(() => {
    newName.value = column.name;

    isEditingCellName.open();
  });

  return (
    <div
      class="font-normal text-gray-400 w-full cursor-pointer"
      ref={ref}
      onClick$={editCellName}
    >
      {isEditingCellName.isOpen.value ? (
        <Input type="text" class="h-8 px-0" bind:value={newName} />
      ) : (
        <span class="text-sm">{newName.value}</span>
      )}
    </div>
  );
});
