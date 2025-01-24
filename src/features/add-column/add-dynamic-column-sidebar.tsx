import { $, type QRL, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { LuCheck } from '@qwikest/icons/lucide';
import { TbX } from '@qwikest/icons/tablericons';

import { Button, Input, Label, Select, Sidebar, Textarea } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { TemplateTextArea } from '~/features/add-column/components/template-textarea';
import type { ColumnType, CreateColumn } from '~/state';

interface SidebarProps {
  onCreateColumn: QRL<(createColumn: CreateColumn) => void>;
}

const outputType = ['text', 'array', 'number', 'boolean', 'object'];
export const AddDynamicColumnSidebar = component$<SidebarProps>(
  ({ onCreateColumn }) => {
    const { isOpenAddDynamicColumnSidebar, closeAddDynamicColumnSidebar } =
      useModals('addDynamicColumnSidebar');

    const type = useSignal<NonNullable<ColumnType>>('text');
    const name = useSignal('');
    const rowsToGenerate = useSignal('10');
    const prompt = useSignal('');

    const onSelectedVariables = $((variables: any) => {});

    useTask$(({ track }) => {
      track(isOpenAddDynamicColumnSidebar);

      type.value = 'text';
      name.value = '';
      prompt.value = '';
      rowsToGenerate.value = '10';
    });

    const onCreate = $(() => {
      if (!name.value) return;

      const column: CreateColumn = {
        name: name.value,
        type: type.value,
        kind: 'dynamic',
        process: {
          modelName: 'HF Model',
          prompt: prompt.value,
          offset: 0,
          limit: Number(rowsToGenerate.value),
        },
      };

      closeAddDynamicColumnSidebar();
      onCreateColumn(column);
    });

    return (
      <Sidebar bind:show={isOpenAddDynamicColumnSidebar}>
        <div class="flex h-full flex-col justify-between p-4">
          <div class="h-full">
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <Label for="column-name">Column name</Label>

                <Button
                  size="sm"
                  look="ghost"
                  onClick$={closeAddDynamicColumnSidebar}
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

              <Label for="column-output-type">Output type</Label>
              <Select.Root id="column-output-type" bind:value={type}>
                <Select.Trigger>
                  <Select.DisplayValue />
                </Select.Trigger>
                <Select.Popover>
                  {outputType.map((type) => (
                    <Select.Item key={type}>
                      <Select.ItemLabel>{type}</Select.ItemLabel>
                      <Select.ItemIndicator>
                        <LuCheck class="h-4 w-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Popover>
              </Select.Root>

              <Label for="column-prompt">Prompt template</Label>
              <TemplateTextArea
                bind:value={prompt}
                variables={[
                  { id: 'variable1', name: 'Variable 1' },
                  { id: 'variable2', name: 'Variable 2' },
                ]}
                onSelectedVariables={onSelectedVariables}
              />

              <Label for="column-rows">Rows generated</Label>
              <Input
                id="column-rows"
                type="number"
                class="h-10"
                bind:value={rowsToGenerate}
              />
            </div>
          </div>

          <div class="flex h-16 w-full items-center justify-center">
            <Button size="sm" class="w-full rounded-sm p-2" onClick$={onCreate}>
              Create new column
            </Button>
          </div>
        </div>
      </Sidebar>
    );
  },
);
