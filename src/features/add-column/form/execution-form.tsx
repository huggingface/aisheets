import {
  $,
  type QRL,
  Resource,
  component$,
  useComputed$,
  useResource$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { LuBookmark, LuCheck, LuEgg, LuXCircle } from '@qwikest/icons/lucide';

import { Button, Input, Label, Select } from '~/components';
import { nextTick } from '~/components/hooks/tick';
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
  column: Column;
  onGenerateColumn: QRL<(column: CreateColumn) => Promise<Column>>;
}

export const ExecutionForm = component$<SidebarProps>(
  ({ column, onGenerateColumn }) => {
    const { mode, close } = useExecution();
    const {
      state: columns,
      firstColum,
      removeTemporalColumn,
      canGenerate,
    } = useColumnsStore();
    const parseModelId = (model: Model) => `${model.id}-${model.provider}`;

    const isSubmitting = useSignal(false);
    const isDisabledGenerateButton = useSignal(true);

    const prompt = useSignal<string>('');
    const columnsReferences = useSignal<string[]>([]);
    const variables = useSignal<Variable[]>([]);

    const selectedModel = useSignal<Model>();
    const inputModelId = useSignal<string | undefined>();
    const rowsToGenerate = useSignal('5');

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });

    const isTouched = useComputed$(() => {
      return (
        prompt.value !== column.process!.prompt ||
        selectedModel.value?.id !== column.process!.modelName ||
        rowsToGenerate.value !== String(column.process!.limit)
      );
    });

    useTask$(async ({ track }) => {
      track(isSubmitting);

      if (mode.value === 'add') {
        isDisabledGenerateButton.value = isSubmitting.value;
        return;
      }

      track(columns);
      track(isTouched);

      const canRegenerate = await canGenerate(column);
      isDisabledGenerateButton.value =
        !canRegenerate || isSubmitting.value || !isTouched.value;
    });

    useTask$(() => {
      variables.value = columns.value
        .filter(
          (c) => c.id !== column.id, //Remove the column itself
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));

      const { process } = column;
      if (!process) return;

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
      const modelProvider = selectedModel.value?.provider!;

      const columnToSave = {
        ...column,
        process: {
          ...column.process,
          modelName,
          modelProvider,
          prompt: prompt.value!,
          columnsReferences: columnsReferences.value,
          offset: 0,
          limit: Number(rowsToGenerate.value),
        },
      };

      await onGenerateColumn(columnToSave);

      isSubmitting.value = false;
    });

    const handleCloseForm = $(async () => {
      if (mode.value === 'add') {
        await removeTemporalColumn();
      }

      close();
    });

    return (
      <th class="w-[600px] bg-white font-normal border-t border-secondary">
        <div class="relative h-full w-full">
          <div class="absolute h-full w-full flex flex-col p-4 gap-4">
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
                    <Select.Root value={parseModelId(selectedModel.value)}>
                      <Select.Trigger class="px-4 bg-primary rounded-base border-secondary-foreground">
                        <Select.DisplayValue />
                      </Select.Trigger>
                      <Select.Popover class="bg-primary border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                        {models.map((model, idx) => (
                          <Select.Item
                            key={idx}
                            value={parseModelId(model)}
                            class="text-foreground hover:bg-accent"
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
                max={firstColum.value.process!.limit}
                min="1"
                onInput$={(_, el) => {
                  if (Number(el.value) > firstColum.value.process!.limit) {
                    nextTick(() => {
                      rowsToGenerate.value = String(
                        firstColum.value.process!.limit,
                      );
                    });
                  }

                  rowsToGenerate.value = el.value;
                }}
                value={rowsToGenerate.value}
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
                    look="primary"
                    onClick$={onGenerate}
                    disabled={isDisabledGenerateButton.value}
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
      </th>
    );
  },
);
