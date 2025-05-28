import { component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { Popover, buttonVariants } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column';
import { CellGeneration } from '~/features/table/components/header/cell-generation';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnNameEdition } from '~/features/table/components/header/column-name-edition';
import { HideColumn } from '~/features/table/components/header/hide-column';
import { type Column, TEMPORAL_ID } from '~/state';

export const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { columnId } = useExecution();

  const classes = useComputed$(() =>
    cn({ 'bg-neutral-100': columnId.value === column.id }),
  );

  const visibleColumnType = useComputed$(() => {
    let columnType = column.type.toLowerCase();

    if (hasBlobContent(column)) {
      columnType = 'binary';
    } else if (isArrayType(column)) {
      columnType = 'list';
    } else if (isObjectType(column)) {
      columnType = 'dict';
    } else if (
      columnType.startsWith('varchar') ||
      columnType.startsWith('text')
    ) {
      columnType = 'string';
    }

    return columnType;
  });

  return (
    <th
      id={column.id}
      class={cn(
        `min-w-80 w-80 max-w-80 min-h-[50px] h-[50px] px-4 py-2 text-left border ${classes.value}`,
        {
          'border-r-0': column.id === TEMPORAL_ID,
        },
      )}
    >
      <Popover.Root flip={false} gutter={8} floating="bottom-start">
        <Popover.Trigger class="flex items-center justify-between w-full h-[20px] py-[10px]">
          <div class="flex flex-col items-start text-wrap w-[82%]">
            <span
              class={cn(buttonVariants({ look: 'ghost' }), 'text-neutral-600')}
            >
              {column.name}
            </span>

            <p class="text-sm text-neutral-500 font-light">
              {visibleColumnType.value}
            </p>
          </div>

          <div class="flex items-center gap-1 w-[18%] h-fit pr-0">
            <CellGeneration column={column} />
            <Tooltip text="Edit configuration">
              <CellSettings column={column} />
            </Tooltip>
          </div>
        </Popover.Trigger>
        <Popover.Panel>
          <div class="flex flex-col gap-0.5">
            <ColumnNameEdition column={column} />
            <div class="rounded-sm hover:bg-neutral-100 transition-colors mt-2">
              <CellSettings column={column}>
                <span class="font-normal">Edit configuration</span>
              </CellSettings>
            </div>
            <div class="rounded-sm hover:bg-neutral-100 transition-colors">
              <HideColumn column={column} />
            </div>
          </div>
        </Popover.Panel>
      </Popover.Root>
    </th>
  );
});

export const hasBlobContent = (column: Column): boolean => {
  return column.type.includes('BLOB');
};

export const isArrayType = (column: Column): boolean => {
  return column.type.includes('[]');
};

export const isObjectType = (column: Column): boolean => {
  return column.type.startsWith('STRUCT') || column.type.startsWith('MAP');
};

export const isTextType = (column: Column): boolean => {
  return (
    column.type.startsWith('TEXT') ||
    column.type.startsWith('STRING') ||
    column.type.startsWith('VARCHAR')
  );
};
