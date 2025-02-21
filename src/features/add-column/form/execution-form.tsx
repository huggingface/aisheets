import {
  $,
  type QRL,
  Resource,
  component$,
  useResource$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { LuBookmark, LuCheck, LuEgg, LuXCircle } from '@qwikest/icons/lucide';

import { Button, Input, Label, Select } from '~/components';
import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';
import { useExecution } from '~/features/add-column/form/execution';
import {
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';
import { type Model, useListModels } from '~/usecases/list-models';

interface SidebarProps {
  onGenerateColumn: QRL<(column: CreateColumn) => Promise<Column>>;
}

export const ExecutionForm = component$<SidebarProps>(
  ({ onGenerateColumn }) => {
    const { columnId, mode, close } = useExecution();
    const { state: columns, removeTemporalColumn } = useColumnsStore();
    const isSubmitting = useSignal(false);
    const currentColumn = useSignal<Column | undefined>();

    const prompt = useSignal<string>('');
    const columnsReferences = useSignal<string[]>([]);
    const variables = useSignal<Variable[]>([]);

    const selectedModel = useSignal<Model>();
    const inputModelId = useSignal<string | undefined>();
    const rowsToGenerate = useSignal('5');

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });

    const uniqueModelId = (model: Model) => `${model.id}-${model.provider}`;

    useTask$(({ track }) => {
      track(currentColumn);
      if (!currentColumn.value) return;

      variables.value = columns.value
        .filter(
          (c) => c.id !== currentColumn.value?.id, //Remove the column itself
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));
    });

    useTask$(({ track }) => {
      track(columnId);
      if (!columnId.value) return;

      currentColumn.value = columns.value.find((c) => c.id === columnId.value);

      if (!currentColumn.value) return;

      const process = currentColumn.value.process!;

      prompt.value = process.prompt;

      selectedModel.value = {
        id: process.modelName,
        provider: process.modelProvider!,
      };

      inputModelId.value = selectedModel.value.id;

      rowsToGenerate.value = String(process.limit);
    });

    const loadModels = useResource$(async () => {
      return await useListModels();
    });

    const onGenerate = $(async () => {
      isSubmitting.value = true;

      const modelName = inputModelId.value || selectedModel.value!.id;
      const modelProvider = selectedModel.value?.provider;

      const columnToSave = {
        ...currentColumn.value!,
        process: {
          ...currentColumn.value!.process,
          modelName,
          modelProvider,

          prompt: prompt.value!,
          columnsReferences: columnsReferences.value,
          offset: 0,
          limit: Number(rowsToGenerate.value),
        },
      };

      const synchronizedColum = await onGenerateColumn(columnToSave);

      currentColumn.value = {
        ...synchronizedColum,
      };

      isSubmitting.value = false;
    });

    const handleCloseForm = $(async () => {
      if (mode.value === 'add') {
        await removeTemporalColumn();
      }

      close();
    });

    return (
      <div class="relative w-[600px] bg-white">
        <div class="absolute h-full w-[600px] border-t border-secondary flex flex-col p-4 gap-4">
          <Button
            size="sm"
            look="ghost"
            onClick$={handleCloseForm}
            disabled={columns.value[0]?.id === TEMPORAL_ID}
            class="absolute top-0 right-0 m-2"
          >
            <LuXCircle class="text-lg text-primary-foreground" />
          </Button>
          <div class="flex flex-col gap-4">
            <Label class="flex gap-1">Model</Label>

            <Resource
              value={loadModels}
              onPending={() => (
                <Select.Disabled>Loading models...</Select.Disabled>
              )}
              onResolved={(models) => {
                if (!selectedModel.value?.id) {
                  selectedModel.value = models[0];
                }

                return (
                  <Select.Root value={uniqueModelId(selectedModel.value)}>
                    <Select.Trigger class="px-4 bg-primary rounded-base border-secondary-foreground">
                      <Select.DisplayValue />
                    </Select.Trigger>
                    <Select.Popover class="bg-primary border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                      {models.map((model, idx) => (
                        <Select.Item
                          key={idx}
                          class="text-foreground hover:bg-accent"
                          value={uniqueModelId(model)}
                          onClick$={() => {
                            selectedModel.value = model;
                            console.log(selectedModel.value);
                          }}
                        >
                          <Select.ItemLabel>{`${model.id} (${model.provider})`}</Select.ItemLabel>
                          <Select.ItemIndicator>
                            <LuCheck class="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Popover>
                  </Select.Root>
                );
              }}
              onRejected={() => {
                return (
                  <Input
                    bind:value={inputModelId}
                    class="px-4 h-10 border-secondary-foreground bg-primary"
                    placeholder="Cannot load model suggestions. Please enter the model ID manually."
                  />
                );
              }}
            />

            <Input
              id="column-rows"
              type="number"
              class="px-4 h-10 border-secondary-foreground bg-primary"
              bind:value={rowsToGenerate}
            />

            <div class="relative">
              <div class="flex flex-col gap-4">
                <Label>Prompt</Label>

                <TemplateTextArea
                  bind:value={prompt}
                  variables={variables}
                  onSelectedVariables={onSelectedVariables}
                />
              </div>

              <div class="absolute bottom-14 flex justify-between items-center w-full px-4">
                <Button
                  key={isSubmitting.value.toString()}
                  look="ghost"
                  class="p-4 rounded-2xl h-10 bg-ring hover:bg-indigo-300 text-white w-fit select-none"
                  onClick$={onGenerate}
                  disabled={isSubmitting.value}
                >
                  <div class="flex items-center gap-4">
                    <LuEgg class="text-xl" />

                    {isSubmitting.value ? 'Generating...' : 'Generate'}
                  </div>
                </Button>

                <Button size="icon" look="ghost">
                  <LuBookmark class="text-primary-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
