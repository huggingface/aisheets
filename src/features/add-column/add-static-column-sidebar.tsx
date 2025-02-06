import { $, type QRL, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { LuCheck } from '@qwikest/icons/lucide';
import { TbX } from '@qwikest/icons/tablericons';

import { Button, Input, Label, Select, Sidebar } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { type ColumnType, type CreateColumn, useDatasetsStore } from '~/state';

interface SidebarProps {
  type: ColumnType;
  onCreateColumn: QRL<(createColumn: CreateColumn) => void>;
}

export const AddStaticColumnSidebar = component$<SidebarProps>(
  ({ onCreateColumn, type }) => {
    const { closeAddStaticColumnSidebar } = useModals('addStaticColumnSidebar');

    const { activeDataset } = useDatasetsStore();

    const types = ['text', 'array', 'number', 'boolean', 'object'];
    const newType = useSignal<ColumnType>(type);
    const name = useSignal('');

    useTask$(({ track }) => {
      track(() => type);

      newType.value = type;
      name.value = '';
    });

    const onSave = $(() => {
      if (!name.value) return;

      onCreateColumn({
        name: name.value,
        type: newType.value,
        kind: 'static',
        dataset: activeDataset.value,
      });
    });

    return (
      <Sidebar name="addStaticColumnSidebar">
        <div class="flex h-full flex-col justify-between p-4">
          <div class="max-h-full">
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <Label for="column-name">Column name</Label>

                <Button
                  size="sm"
                  look="ghost"
                  onClick$={closeAddStaticColumnSidebar}
                >
                  <TbX />
                </Button>
              </div>
              <Input
                id="column-name"
                class="h-10"
                placeholder="Enter column name"
                bind:value={name}
              />

              <Select.Root bind:value={newType}>
                <Select.Trigger>
                  <Select.DisplayValue />
                </Select.Trigger>
                <Select.Popover>
                  {types.map((type) => (
                    <Select.Item key={type}>
                      <Select.ItemLabel>{type}</Select.ItemLabel>
                      <Select.ItemIndicator>
                        <LuCheck class="h-4 w-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Popover>
              </Select.Root>
            </div>
          </div>

          <div class="flex h-16 w-full items-center justify-center">
            <Button size="sm" class="w-full rounded-sm p-2" onClick$={onSave}>
              Create new column
            </Button>
          </div>
        </div>
      </Sidebar>
    );
  },
);
