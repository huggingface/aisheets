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
import { useDebounce } from '~/components/hooks/debounce/debounce';
import { RunExecutionSidebar } from '~/features/run-execution/run-execution-sidebar';
import { updateColumnName } from '~/services';
import {
  type Column,
  type ColumnKind,
  type ColumnType,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';
import { useEditColumn } from '~/usecases/edit-column.usecase';

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
  const { state: columns, replaceCell } = useColumnsStore();
  const editColumn = useEditColumn();
  const { args } = useActiveModal();

  const onUpdateCell = $(async (column: Column) => {
    const response = await editColumn(column);

    for await (const { cell } of response) {
      replaceCell(cell);
    }
  });

  const indexColumnEditing = useComputed$(() =>
    columns.value.findIndex((column) => column.id === args.value?.columnId),
  );

  return (
    <thead>
      <tr>
        {columns.value.map((column, index) => (
          <>
            <TableCellHeader key={column.id} column={column} />

            {indexColumnEditing.value === index ? (
              <th key="temporal" class="min-w-[300px] w-[15vw]" />
            ) : null}
          </>
        ))}

        <TableCellHeaderPlaceHolder />
      </tr>

      <RunExecutionSidebar onUpdateCell={onUpdateCell} />
    </thead>
  );
});

const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { openRunExecutionSidebar } = useModals('runExecutionSidebar');
  const isEditingCellName = useToggle();
  const newName = useSignal(column.name);

  useDebounce(
    newName,
    $((debouncedName) => {
      server$(async () => {
        await updateColumnName(column.id, debouncedName.value);
      })();
    }),
    3000,
  );

  const ref = useClickOutside(
    $(() => {
      isEditingCellName.close();
    }),
  );

  const editCell = $(() => {
    if (isEditingCellName.isOpen.value) return;
    if (column.id === TEMPORAL_ID) return;

    openRunExecutionSidebar({
      columnId: column.id,
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
      class="min-w-[300px] w-[15vw] border-b border-r cursor-pointer border-gray-200 bg-white px-3 py-2 text-left font-medium text-gray-600 sticky top-0 last:border-r-0 z-0"
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
          <Button look="ghost" class=" rounded-full" onClick$={editCell}>
            <TbDots class="text-gray-400" />
          </Button>
        )}
      </div>
    </th>
  );
});

const TableCellHeaderPlaceHolder = component$(() => {
  const { openAddDynamicColumnSidebar } = useModals('addDynamicColumnSidebar');
  const { state: columns } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  useVisibleTask$(({ track }) => {
    track(columns);
    if (columns.value.length === 1 && lastColumnId.value === TEMPORAL_ID) {
      openAddDynamicColumnSidebar({
        columnId: lastColumnId.value,
      });
    }
  });

  return (
    <th
      id={lastColumnId.value}
      class="min-w-[300px] w-[15vw] border-b border-r cursor-pointer border-gray-200 bg-white py-2 text-left font-medium text-gray-600 sticky top-0 last:border-r-0 z-0"
    >
      <Button
        look="ghost"
        class="h-2"
        onClick$={() =>
          openAddDynamicColumnSidebar({
            columnId: lastColumnId.value,
          })
        }
      >
        <TbPlus />
      </Button>
    </th>
  );
});
