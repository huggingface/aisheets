import { component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuText, LuZap } from '@qwikest/icons/lucide';
import { useExecution } from '~/features/add-column';
import { CellGeneration } from '~/features/table/components/header/cell-generation';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnProperties } from '~/features/table/components/header/column-properties';
import type { Column } from '~/state';

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
    } else if (columnType.startsWith('varchar')) {
      columnType = 'string';
    }

    return columnType;
  });

  const isStatic = column.kind === 'static';

  return (
    <th
      id={column.id}
      class={`min-w-80 w-80 max-w-80 min-h-8 h-8 p-2 text-left border-[0.5px] first:rounded-tl-sm border-r-0 border-l-neutral-300 border-r-neutral-300 ${classes.value}`}
    >
      <div class="flex items-center justify-between gap-2 w-full">
        <div class="flex items-center gap-2 text-wrap w-[82%]">
          {isStatic ? (
            <LuText class="text-sm text-primary-foreground" />
          ) : (
            <LuZap class="text-sm text-primary-foreground" />
          )}

          <ColumnProperties column={column} />
        </div>

        <div class="flex items-center gap-1 w-[18%] h-0 pr-0">
          <CellGeneration column={column} />
          <CellSettings column={column} />
        </div>
      </div>
      <p class="text-sm text-neutral-500 font-light">
        {visibleColumnType.value}
      </p>
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
  return column.type.includes('STRUCT');
};

export const isTextType = (column: Column): boolean => {
  return (
    column.type.includes('TEXT') ||
    column.type.includes('STRING') ||
    column.type.includes('CHAR')
  );
};
