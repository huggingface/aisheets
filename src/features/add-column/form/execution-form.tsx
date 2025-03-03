import {
  $,
  type QRL,
  Resource,
  component$,
  useComputed$,
  useResource$,
  useSignal,
  useTask$,
  useVisibleTask$,
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
  onGenerateColumn: QRL<(column: CreateColumn) => Promise<void>>;
}

export const ExecutionForm = component$<SidebarProps>(
  ({ column, onGenerateColumn }) => {
    const { mode, close } = useExecution();
    const {
      columns,
      maxNumberOfRows,
      removeTemporalColumn,
      canGenerate,
      updateColumn,
    } = useColumnsStore();

    const isSubmitting = useSignal(false);
    const canRegenerate = useSignal(true);

    const isAnyColumnGenerating = useComputed$(() => {
      //TODO: Replace to "persisted" column on column.
      const isAnyGenerating = columns.value
        .filter((c) => c.id !== TEMPORAL_ID)
        .flatMap((c) => c.cells)
        .some((c) => c.generating);

      return isAnyGenerating;
    });

    const prompt = useSignal<string>('');
    const columnsReferences = useSignal<string[]>([]);
    const variables = useSignal<Variable[]>([]);

    const selectedModel = useSignal<Model>();
    const inputModelId = useSignal<string | undefined>();
    const rowsToGenerate = useSignal('');

    const selectedProvider = useSignal<string>();
    const updateCounter = useSignal(0);

    const loadModels = useResource$(async () => {
      return await useListModels();
    });

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

    useVisibleTask$(async ({ track }) => {
      track(columns);

      canRegenerate.value = await canGenerate(column);
    });

    useTask$(async () => {
      const models = await loadModels.value;

      variables.value = columns.value
        .filter((c) => c.id !== column.id)
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));

      const { process } = column;
      if (!process) return;

      prompt.value = process.prompt;
      selectedModel.value = models?.find((m) => m.id === process.modelName) || {
        id: process.modelName,
        providers: [process.modelProvider!],
      };
      selectedProvider.value = process.modelProvider!;

      inputModelId.value = process.modelName;

      rowsToGenerate.value =
        mode.value === 'add' ? '1' : process!.limit.toString();
    });

    const maxRows = useSignal(0);

    useVisibleTask$(async (async) => {
      maxRows.value = await maxNumberOfRows(column);
    });

    useVisibleTask$(({ track }) => {
      track(rowsToGenerate);
      track(selectedModel);
      track(selectedProvider);
      track(prompt);
      track(columnsReferences);

      updateColumn({
        ...column,
        process: {
          ...column.process!,
          columnsReferences: columnsReferences.value,
        },
      });
    });

    const onGenerate = $(async () => {
      isSubmitting.value = true;

      // If we have a selectedModel, always use that. Only fall back to inputModelId if models failed to load
      const modelName = selectedModel.value?.id || inputModelId.value!;
      const modelProvider = selectedProvider.value!;

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
      <th class="min-w-[700px] w-[700px] bg-white font-normal border-t border-secondary text-left">
        <div class="relative h-full w-full">
          <div class="absolute h-full w-full flex flex-col p-4 gap-4">
            <Button
              size="sm"
              look="ghost"
              onClick$={handleCloseForm}
              disabled={columns.value[0]?.id === TEMPORAL_ID}
              class="absolute top-4 right-4"
            >
              <LuXCircle class="text-lg text-primary-foreground" />
            </Button>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-4">
                <Resource
                  value={loadModels}
                  onPending={() => (
                    <Select.Disabled>Loading models...</Select.Disabled>
                  )}
                  onResolved={(models) => {
                    if (!selectedModel.value?.id) {
                      selectedModel.value = models[0];
                      selectedProvider.value = models[0].providers[0];
                    }

                    return (
                      <div class="flex flex-col gap-4">
                        <div class="flex gap-4">
                          <div class="flex-[2]">
                            <Label class="flex gap-1 mb-2">Model</Label>
                            <Select.Root value={selectedModel.value?.id}>
                              <Select.Trigger class="px-4 bg-primary rounded-base border-secondary-foreground">
                                <Select.DisplayValue />
                              </Select.Trigger>
                              <Select.Popover class="bg-primary border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                                {models.map((model, idx) => (
                                  <Select.Item
                                    key={idx}
                                    class="text-foreground hover:bg-accent"
                                    value={model.id}
                                    onClick$={$(() => {
                                      selectedModel.value = model;
                                      selectedProvider.value =
                                        model.providers[0];
                                      updateCounter.value++;
                                    })}
                                  >
                                    <Select.ItemLabel>
                                      {model.id}
                                    </Select.ItemLabel>
                                    {model.size && (
                                      <span class="ml-2 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-sm">
                                        {model.size}
                                      </span>
                                    )}
                                    <Select.ItemIndicator>
                                      <LuCheck class="h-4 w-4" />
                                    </Select.ItemIndicator>
                                  </Select.Item>
                                ))}
                              </Select.Popover>
                            </Select.Root>
                          </div>
                          <div class="flex-1">
                            <Label class="flex gap-1 mb-2">
                              Inference Provider
                            </Label>
                            <Select.Root
                              value={selectedProvider.value}
                              onChange$={$((value: string | string[]) => {
                                const provider = Array.isArray(value)
                                  ? value[0]
                                  : value;
                                selectedProvider.value = provider;
                              })}
                            >
                              <Select.Trigger class="px-4 bg-primary rounded-base border-secondary-foreground">
                                <Select.DisplayValue />
                              </Select.Trigger>
                              <Select.Popover class="bg-primary border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                                {selectedModel.value?.providers?.map(
                                  (provider, idx) => (
                                    <Select.Item
                                      key={idx}
                                      class="text-foreground hover:bg-accent"
                                      value={provider}
                                    >
                                      <Select.ItemLabel>
                                        {provider}
                                      </Select.ItemLabel>
                                      <Select.ItemIndicator>
                                        <LuCheck class="h-4 w-4" />
                                      </Select.ItemIndicator>
                                    </Select.Item>
                                  ),
                                ) || []}
                              </Select.Popover>
                            </Select.Root>
                          </div>
                        </div>
                      </div>
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
                  max={maxRows.value}
                  min="1"
                  onInput$={(_, el) => {
                    if (Number(el.value) > maxRows.value) {
                      nextTick(() => {
                        rowsToGenerate.value = String(maxRows.value);
                      });
                    }

                    rowsToGenerate.value = el.value;
                  }}
                  value={rowsToGenerate.value}
                />

                <div class="relative">
                  <div class="flex flex-col gap-4">
                    <Label class="text-left">Prompt</Label>

                    <TemplateTextArea
                      bind:value={prompt}
                      variables={variables}
                      onSelectedVariables={onSelectedVariables}
                    />
                  </div>

                  <div class="absolute bottom-14 flex flex-col px-4 gap-1 w-full">
                    <div class="flex justify-between items-center gap-4 w-full">
                      <Button
                        key={isSubmitting.value.toString()}
                        look="primary"
                        onClick$={onGenerate}
                        disabled={
                          !canRegenerate.value ||
                          !isTouched.value ||
                          isSubmitting.value ||
                          isAnyColumnGenerating.value
                        }
                      >
                        <div class="flex items-center gap-4">
                          <LuEgg class="text-xl" />

                          {isAnyColumnGenerating.value
                            ? 'Generating...'
                            : 'Generate'}
                        </div>
                      </Button>

                      <Button size="icon" look="ghost">
                        <LuBookmark class="text-primary-foreground" />
                      </Button>
                    </div>
                    <span class="font-light text-sm">
                      {isAnyColumnGenerating.value &&
                        'Please wait for the current generation to finish.'}
                    </span>
                    <span class="font-light text-sm">
                      {!canRegenerate.value &&
                        'Some references columns are dirty, please, regenerate them first.'}
                    </span>
                    <span class="font-light text-sm">
                      {!isTouched.value &&
                        'Change some field to enable the generate button.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </th>
    );
  },
);
