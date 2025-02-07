import {
  $,
  component$,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import {
  LuEgg,
  LuEggOff,
  LuPlus,
  LuSettings2,
  LuSparkle,
} from '@qwikest/icons/lucide';
import {
  TbAlignJustified,
  TbBraces,
  TbBrackets,
  TbHash,
  TbToggleLeft,
} from '@qwikest/icons/tablericons';
import { Button, Input } from '~/components';
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
    if (kind === 'dynamic')
      return <LuSparkle class="text-primary-foreground" />;

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
      class="w-[300px] max-w-[300px] border-b border-r border-secondary bg-primary px-1 text-left"
    >
      <div class="flex items-center justify-between gap-2 w-full" ref={ref}>
        <div class="flex items-center gap-2 text-wrap w-[80%]">
          <ColumnIcon type={column.type} kind={column.kind} />
          <div class="font-normal text-gray-400 w-full">
            {isEditingCellName.isOpen.value ? (
              <Input type="text" class="h-8 px-0" bind:value={newName} />
            ) : (
              <span class="text-sm" onClick$={editCellName}>
                {newName.value}
              </span>
            )}
          </div>
        </div>

        <div class="flex items-center w-[20%]">
          <Button
            look="ghost"
            size="sm"
            onClick$={editCell}
            //TODO: Enable if this column has at least one row validated
            disabled
          >
            {column.id === TEMPORAL_ID && (
              <LuEggOff class="text-primary-foreground" />
            )}
            <LuEgg class="text-primary-foreground" />
          </Button>
          {column.id !== TEMPORAL_ID && (
            <Button look="ghost" size="sm" onClick$={editCell}>
              <LuSettings2 class="text-primary-foreground" />
            </Button>
          )}
        </div>
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
    await addTemporalColumn();
    await closeAddDynamicColumnSidebar();

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
      class="w-[300px] max-w-[300px] border-b border-secondary bg-primary py-1 text-left"
    >
      <Button look="ghost" size="sm" onClick$={handleNewColumn}>
        <LuPlus class="text-primary-foreground" />
      </Button>
    </th>
  );
});
