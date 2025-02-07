import {
  $,
  component$,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import {
  TbAlignJustified,
  TbBraces,
  TbBrackets,
  TbDots,
  TbHash,
  TbPlus,
  TbSparkles,
  TbToggleLeft,
} from '@qwikest/icons/tablericons';
import { Button } from '~/components';
import { useActiveModal, useModals, useToggle } from '~/components/hooks';
import { useClickOutside } from '~/components/hooks/click/outside';
import { nextTick } from '~/components/hooks/tick';
import { updateColumnName } from '~/services';
import {
  type Column,
  type ColumnKind,
  type ColumnType,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';

const Icons: Record<Column['type'], any> = {
  text: TbAlignJustified,
  number: TbHash,
  boolean: TbToggleLeft,
  object: TbBraces,
  array: TbBrackets,
};
export const ColumnIcon = component$<{ type: ColumnType; kind: ColumnKind }>(
  ({ type, kind }) => {
    if (kind === 'dynamic') return <TbSparkles />;

    const Icon = Icons[type];

    return <Icon />;
  },
);

export const TableHeader = component$(() => {
  const { state: columns } = useColumnsStore();

  return (
    <thead>
      <tr>
        {columns.value.map((column, index) => (
          <>
            <TableCellHeader key={column.id} column={column} />

            <TableCellHeaderForExecution
              key={`${column.id}-${index}`}
              index={index}
            />
          </>
        ))}

        <TableAddCellHeaderPlaceHolder />
      </tr>
    </thead>
  );
});

const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { openAddDynamicColumnSidebar, closeAddDynamicColumnSidebar } =
    useModals('addDynamicColumnSidebar');
  const { removeTemporalColumn } = useColumnsStore();
  const isEditingCellName = useToggle();
  const newName = useSignal(column.name);

  const ref = useClickOutside(
    $(() => {
      if (!isEditingCellName.isOpen.value) return;
      isEditingCellName.close();

      server$(async () => {
        await updateColumnName(column.id, newName.value);
      })();
    }),
  );

  const editCell = $(async () => {
    if (isEditingCellName.isOpen.value) return;
    if (column.id === TEMPORAL_ID) return;

    await removeTemporalColumn();
    await closeAddDynamicColumnSidebar();

    nextTick(() => {
      openAddDynamicColumnSidebar({
        columnId: column.id,
        mode: 'edit',
      });
    });
  });

  const editCellName = $(() => {
    if (column.id === TEMPORAL_ID) return;

    newName.value = column.name;

    isEditingCellName.open();
  });

  return (
    <th
      id={column.id}
      class="w-[300px] max-w-[300px] text-wrap border-b border-r cursor-pointer border-gray-200 bg-white px-3 py-2 text-left font-medium text-gray-600 sticky top-0 z-0"
    >
      <div class="flex items-center justify-between gap-2" ref={ref}>
        <div class="flex items-center gap-2">
          <ColumnIcon type={column.type} kind={column.kind} />
          {isEditingCellName.isOpen.value ? (
            <input
              type="text"
              class="w-full h-8 px-2 border border-gray-200 rounded-sm text-sm font-medium text-gray-700"
              bind:value={newName}
            />
          ) : (
            <span
              class="text-sm font-medium text-gray-700"
              onClick$={editCellName}
            >
              {newName.value}
            </span>
          )}
        </div>

        {column.id !== TEMPORAL_ID && (
          <Button look="ghost" class="h-2" onClick$={editCell}>
            <TbDots class="text-gray-400" />
          </Button>
        )}
      </div>
    </th>
  );
});

const TableCellHeaderForExecution = component$<{ index: number }>(
  ({ index }) => {
    const { state: columns } = useColumnsStore();
    const { args } = useActiveModal();

    const indexColumnEditing = useComputed$(() =>
      columns.value.findIndex((column) => column.id === args.value?.columnId),
    );

    if (indexColumnEditing.value !== index) return null;

    return <th class="min-w-[600px] w-[600px]" />;
  },
);

const TableAddCellHeaderPlaceHolder = component$(() => {
  const { openAddDynamicColumnSidebar, closeAddDynamicColumnSidebar } =
    useModals('addDynamicColumnSidebar');
  const { state: columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  useVisibleTask$(async ({ track }) => {
    track(columns);
    if (columns.value.length === 1 && lastColumnId.value === TEMPORAL_ID) {
      nextTick(() => {
        openAddDynamicColumnSidebar({
          columnId: lastColumnId.value,
          mode: 'create',
        });
      });
    }
  });

  const handleNewColumn = $(async () => {
    await closeAddDynamicColumnSidebar();
    await addTemporalColumn();

    nextTick(() => {
      openAddDynamicColumnSidebar({
        columnId: TEMPORAL_ID,
        mode: 'create',
      });
    });
  });

  return (
    <th
      id={lastColumnId.value}
      class="w-[10px] border-b border-r cursor-pointer border-gray-200 bg-white py-2 text-left font-medium text-gray-600 sticky top-0 z-0"
    >
      <Button look="ghost" class="h-2" onClick$={handleNewColumn}>
        <TbPlus />
      </Button>
    </th>
  );
});
