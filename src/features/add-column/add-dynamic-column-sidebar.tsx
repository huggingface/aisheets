import {
  $,
  type QRL,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { LuCheck } from '@qwikest/icons/lucide';
import { TbX } from '@qwikest/icons/tablericons';

import { Button, Input, Label, Select, Sidebar, Textarea } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';
import { type ColumnType, type CreateColumn, useColumnsStore } from '~/state';

interface SidebarProps {
  onCreateColumn: QRL<(createColumn: CreateColumn) => void>;
}

const outputType = ['text', 'array', 'number', 'boolean', 'object'];
export const AddDynamicColumnSidebar = component$<SidebarProps>(
  ({ onCreateColumn }) => {
    const { isOpenAddDynamicColumnSidebar, closeAddDynamicColumnSidebar } =
      useModals('addDynamicColumnSidebar');
    const { state: columns } = useColumnsStore();

    const type = useSignal<NonNullable<ColumnType>>('text');
    const name = useSignal('');
    const rowsToGenerate = useSignal('3');
    const prompt = useSignal('');
    const variables = useSignal<Variable[]>([]);
    const columnsReferences = useSignal<string[]>([]);

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });
    const modelName = useSignal('meta-llama/Llama-2-7b-chat-hf');

    useVisibleTask$(({ track }) => {
      track(isOpenAddDynamicColumnSidebar);

      type.value = 'text';
      name.value = '';
      prompt.value = '';
      modelName.value = 'meta-llama/Llama-2-7b-chat-hf';
      rowsToGenerate.value = '3';
      columnsReferences.value = [];
      variables.value = columns.value.map((c) => ({
        id: c.id,
        name: c.name,
      }));
    });

    const onCreate = $(() => {
      if (!name.value) return;

      const column: CreateColumn = {
        name: name.value,
        type: type.value,
        kind: 'dynamic',
        executionProcess: {
          modelName: modelName.value,
          prompt: prompt.value,
          columnsReferences: columnsReferences.value,
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
                variables={variables}
                onSelectedVariables={onSelectedVariables}
              />

              <Label for="column-model" class="flex gap-1">
                Model name. Available models in the
                <a
                  href="https://huggingface.co/playground"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-500 underline hover:text-blue-700"
                >
                  huggingface playground
                </a>
              </Label>
              <Input
                id="column-model"
                class="h-10"
                value="meta-llama/Llama-2-7b-chat-hf"
                placeholder="Enter the HF model name"
                bind:value={modelName}
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
