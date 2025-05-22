import {
  $,
  type QRL,
  Resource,
  component$,
  noSerialize,
  useContext,
  useResource$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import {
  LuCheck,
  LuEgg,
  LuGlobe,
  LuSettings,
  LuStopCircle,
  LuX,
} from '@qwikest/icons/lucide';

import { Button, Input, Label, Select } from '~/components';

import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';
import { useExecution } from '~/features/add-column/form/execution';
import { configContext } from '~/routes/home/layout';
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
    const executionFormRef = useSignal<HTMLElement>();
    const { initialPrompt, mode, close } = useExecution();
    const { firstColumn, columns, removeTemporalColumn, updateColumn } =
      useColumnsStore();

    const { DEFAULT_MODEL, DEFAULT_MODEL_PROVIDER } = useContext(configContext);

    const isOpenModel = useSignal(false);

    const prompt = useSignal<string>('');
    const columnsReferences = useSignal<string[]>([]);
    const variables = useSignal<Variable[]>([]);
    const searchOnWeb = useSignal(false);

    const selectedModel = useSignal<Model>();
    const selectedProvider = useSignal<string>();
    const inputModelId = useSignal<string | undefined>();

    const loadModels = useResource$(async () => {
      return await useListModels();
    });

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });

    useVisibleTask$(() => {
      if (initialPrompt.value) {
        prompt.value = initialPrompt.value;
      }
    });

    useTask$(async () => {
      const models = await loadModels.value;

      variables.value = columns.value
        .filter((c) => c.id !== column.id && !hasBlobContent(c))
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));

      const { process } = column;
      if (!process) return;

      prompt.value = process.prompt;
      searchOnWeb.value = process.searchEnabled || false;

      // If there's a previously selected model, use that
      if (process.modelName) {
        selectedModel.value = models?.find(
          (m: Model) => m.id === process.modelName,
        ) || {
          id: process.modelName,
          providers: [process.modelProvider!],
        };
        selectedProvider.value = process.modelProvider!;
      }
      // Otherwise pre-select the default model
      else if (models) {
        const defaultModel = models.find((m: Model) => m.id === DEFAULT_MODEL);
        if (defaultModel) {
          selectedModel.value = defaultModel;
          selectedProvider.value =
            defaultModel.providers.find(
              (provider) => provider === DEFAULT_MODEL_PROVIDER,
            ) || defaultModel.providers[0];
        }
      }

      inputModelId.value = process.modelName;
    });

    useVisibleTask$(({ track }) => {
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

    useVisibleTask$(() => {
      if (!executionFormRef.value) return;

      executionFormRef.value.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    const onGenerate = $(async () => {
      if (column.process?.cancellable) {
        column.process.cancellable.abort();
        column.process.isExecuting = false;

        return;
      }

      column.process!.cancellable = noSerialize(new AbortController());
      column.process!.isExecuting = true;

      updateColumn(column);

      try {
        // If we have a selectedModel, always use that. Only fall back to inputModelId if models failed to load
        const modelName = selectedModel.value?.id || inputModelId.value!;
        const modelProvider = selectedProvider.value!;

        const columnToSave = {
          ...column,
          process: {
            ...column.process,
            modelName,
            modelProvider,
            prompt: prompt.value,
            columnsReferences: columnsReferences.value,
            searchEnabled: searchOnWeb.value,
          },
        };

        await onGenerateColumn(columnToSave);
      } catch {}
    });

    const handleCloseForm = $(async () => {
      if (mode.value === 'add') {
        await removeTemporalColumn();
      }

      close();
    });

    return (
      <th
        class="z-20 min-w-[660px] w-[660px] bg-neutral-100 font-normal border text-left"
        ref={executionFormRef}
      >
        <div class="flex justify-between items-center p-1 h-[38px]">
          <span class="px-8">Instructions to generate cells</span>
          <Button
            look="ghost"
            class={`${columns.value.filter((c) => c.id !== TEMPORAL_ID).length >= 1 ? 'visible' : 'invisible'} rounded-full hover:bg-neutral-200 cursor-pointer transition-colors w-[30px] h-[30px]`}
            onClick$={handleCloseForm}
            tabIndex={0}
            aria-label="Close"
            style={{
              opacity: firstColumn.value.id === TEMPORAL_ID ? '0.5' : '1',
              pointerEvents:
                firstColumn.value.id === TEMPORAL_ID ? 'none' : 'auto',
            }}
          >
            <LuX class="text-sm text-neutral" />
          </Button>
        </div>

        <div class="relative h-full w-full">
          <div class="absolute h-full w-full flex flex-col">
            <div class="flex flex-col gap-4 px-8 bg-neutral-100">
              <div class="relative">
                <div class="h-96 min-h-96 max-h-96 bg-white border border-secondary-foreground rounded-sm">
                  <TemplateTextArea
                    bind:value={prompt}
                    variables={variables}
                    onSelectedVariables={onSelectedVariables}
                  />
                </div>

                <div class="w-full absolute bottom-0 p-4 flex flex-row items-center justify-between cursor-text">
                  <Button
                    look="secondary"
                    class={cn(
                      'flex px-[10px] py-[8px] gap-[10px] bg-white text-neutral-600 hover:bg-neutral-100 h-[30px] rounded-[8px]',
                      {
                        'border-primary-100 outline-primary-100 bg-primary-50 hover:bg-primary-50 text-primary-500 hover:text-primary-400':
                          searchOnWeb.value,
                      },
                    )}
                    onClick$={() => {
                      searchOnWeb.value = !searchOnWeb.value;
                    }}
                  >
                    <LuGlobe class="text-lg" />
                    Search the web
                  </Button>
                  {column.process?.isExecuting && (
                    <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary-100 border-t-transparent" />
                  )}
                  <Button
                    key={column.process?.isExecuting?.toString()}
                    look="primary"
                    class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                    onClick$={onGenerate}
                    disabled={
                      (column.process?.isExecuting &&
                        column.id === TEMPORAL_ID) ||
                      !prompt.value.trim()
                    }
                  >
                    {column.process?.isExecuting ? (
                      <LuStopCircle class="text-lg" />
                    ) : (
                      <LuEgg class="text-lg" />
                    )}
                  </Button>
                </div>
              </div>

              <div class="flex items-center justify-start gap-1">
                Model
                <p class="text-neutral-500 underline">
                  {selectedModel.value?.id}
                </p>
                with inference provider
                <p class="italic">{selectedProvider.value}</p>
                <Button
                  look="ghost"
                  class="hover:bg-neutral-200"
                  onClick$={() => (isOpenModel.value = true)}
                >
                  <LuSettings class="text-neutral-500" />
                </Button>
              </div>

              {isOpenModel.value && (
                <div class="px-3 pb-4 pt-2 bg-white border border-secondary-foreground rounded-sm">
                  <div class="flex justify-end items-center">
                    <Button
                      look="ghost"
                      class="p-1.5 rounded-full hover:bg-neutral-200 cursor-pointer"
                      onClick$={() => (isOpenModel.value = false)}
                      aria-label="Close"
                    >
                      <LuX class="text-lg text-neutral" />
                    </Button>
                  </div>

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
                              <Label class="flex gap-1 mb-2 font-normal">
                                Model
                              </Label>
                              <Select.Root value={selectedModel.value?.id}>
                                <Select.Trigger class="px-4 bg-white rounded-base border-neutral-300-foreground">
                                  <Select.DisplayValue />
                                </Select.Trigger>
                                <Select.Popover class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                                  {models.map((model) => (
                                    <Select.Item
                                      key={model.id}
                                      class="text-foreground hover:bg-accent"
                                      value={model.id}
                                      onClick$={$(() => {
                                        selectedModel.value = model;
                                        selectedProvider.value =
                                          model.providers[0];
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
                            <div class="flex-1" key={selectedModel.value.id}>
                              <Label class="flex gap-1 mb-2 font-normal">
                                Inference Providers
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
                                <Select.Trigger class="px-4 bg-white rounded-base border-neutral-300-foreground">
                                  <Select.DisplayValue />
                                </Select.Trigger>
                                <Select.Popover class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
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
                          class="bg-white px-4 h-10 border-neutral-300-foreground"
                          placeholder="Cannot load model suggestions. Please enter the model ID manually."
                        />
                      );
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </th>
    );
  },
);

export const hasBlobContent = (column: Column): boolean => {
  return column.type.includes('BLOB');
};
