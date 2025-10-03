import { component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { buttonVariants, Popover } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { useExecution } from '~/features/add-column';
import { useColumnsPreference } from '~/features/table/components/context/colunm-preferences.context';
import { CellSettings } from '~/features/table/components/header/cell-settings';
import { ColumnNameEdition } from '~/features/table/components/header/column-name-edition';
import { DeleteColumn } from '~/features/table/components/header/delete-column';
import { DuplicateColumn } from '~/features/table/components/header/duplicate-column';
import { HideColumn } from '~/features/table/components/header/hide-column';
import {
  hasBlobContent,
  isArrayType,
  isObjectType,
  isTextType,
} from '~/features/utils/columns';
import type { Column } from '~/state';

export const TableCellHeader = component$<{ column: Column }>(({ column }) => {
  const { columnId } = useExecution();
  const { columnPreferences, showAiButton, hideAiButton } =
    useColumnsPreference();

  const visibleColumnType = useComputed$(() => {
    let columnType = column.type.toLowerCase();

    if (column.type === 'image') {
      columnType = 'image';
    } else if (column.type === 'image[]') {
      columnType = 'image list';
    } else if (hasBlobContent(column)) {
      columnType = 'binary';
    } else if (isArrayType(column)) {
      columnType = 'list';
    } else if (isObjectType(column)) {
      columnType = 'dict';
    } else if (isTextType(column)) {
      columnType = 'string';
    }

    return columnType;
  });

  return (
    <th
      id={column.id}
      class={cn('min-h-[50px] h-[50px] p-2 text-left border', {
        'bg-blue-50': column.id == columnId.value,
        'shadow-[inset_2px_0_0_theme(colors.primary.400),inset_-2px_0_0_theme(colors.primary.400)]':
          columnPreferences.value[column.id]?.aiPromptOpen,
      })}
      onMouseOver$={() => showAiButton(column.id)}
      onMouseLeave$={() => hideAiButton(column.id)}
    >
      <Popover.Root flip={false} gutter={8} floating="bottom">
        <Popover.Trigger class="flex items-center justify-between w-full h-[20px] py-[10px] group">
          <div class="flex flex-col items-start text-wrap w-full">
            <span
              class={cn(buttonVariants({ look: 'ghost' }), 'text-neutral-600')}
            >
              {column.name}
            </span>

            <p class="text-sm text-neutral-500 font-light">
              {visibleColumnType.value}
            </p>
          </div>
          <div
            class={cn('flex items-center gap-1 w-fit h-fit pr-0 opacity-0', {
              'group-hover:opacity-100': column.kind === 'dynamic',
            })}
          >
            <Tooltip text="Open">
              <CellSettings column={column} />
            </Tooltip>
          </div>
        </Popover.Trigger>
        <Popover.Panel>
          <div class="flex flex-col gap-0.5 font-normal">
            <ColumnNameEdition column={column} />
            <div class="rounded-sm hover:bg-neutral-100 transition-colors">
              <HideColumn column={column} />
            </div>
            <div class="rounded-sm hover:bg-neutral-100 transition-colors">
              <DuplicateColumn column={column} />
            </div>
            <div class="rounded-sm hover:bg-neutral-100 transition-colors">
              <DeleteColumn column={column} />
            </div>
          </div>
        </Popover.Panel>
      </Popover.Root>
    </th>
  );
});
