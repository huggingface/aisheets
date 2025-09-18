import {
  $,
  component$,
  noSerialize,
  type QRL,
  useComputed$,
  useContext,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';

import { cn } from '@qwik-ui/utils';
import {
  LuCheck,
  LuEgg,
  LuGlobe,
  LuLink2,
  LuStopCircle,
  LuX,
} from '@qwikest/icons/lucide';

import { Button, Select, triggerLooks } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { nextTick } from '~/components/hooks/tick';
import {
  ExtraProviders,
  ModelImage,
  Provider,
} from '~/components/ui/logo/logo';

import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';
import { useExecution } from '~/features/add-column/form/execution';
import { hasBlobContent } from '~/features/utils/columns';
import type { Model } from '~/loaders/hub-models';
import { configContext, modelsContext } from '~/routes/home/layout';
import {
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';

interface SidebarProps {
  column: Column;
  onGenerateColumn: QRL<(column: CreateColumn) => Promise<void>>;
}

type SupportedType = 'text' | 'image';

class Models {
  private models: Model[];

  constructor(models: Model[]) {
    this.models = models;
  }

  getModelsByType(type: SupportedType): Model[] {
    if (type === 'image') return this.getImageModels();
    return this.getTextModels();
  }

  private getTextModels(): Model[] {
    return this.models.filter((model) => model.supportedType === 'text');
  }

  private getImageModels(): Model[] {
    return this.models.filter((model) => model.supportedType === 'image');
  }
}

type ModelWithExtraTags = Model & {
  extraTags?: { label: string; class: string }[];
};
class GroupedModels {
  private models: Model[];
  private tags = {
    LIGHT: {
      label: 'lightweight',
      class: 'bg-[#FFF9C4]',
    },
    REASONING: {
      label: 'reasoning',
      class: 'bg-[#D0E8FF]',
    },
    CODING: {
      label: 'coding',
      class: 'bg-[#FFE4E1]',
    },
    NLP: {
      label: 'NLP',
      class: 'bg-[#E6F3FF]',
    },
    TEXT_RENDERING: {
      label: 'text-rendering',
      class: 'bg-[#F0F8FF]',
    },
    AESTHETICS: {
      label: 'aesthetics',
      class: 'bg-[#FFF0F5]',
    },
    EXPERIMENTATION: {
      label: 'experimentation',
      class: 'bg-[#F5F5DC]',
    },
    TRANSLATION: {
      label: 'translation',
      class: 'bg-[#E8F5E8]',
    },
  };

  constructor(models: Model[]) {
    this.models = models;
  }

  private get recommendedModelIds(): {
    id: Model['id'];
    tags: {
      label: string;
      class: string;
    }[];
  }[] {
    return [
      {
        id: 'openai/gpt-oss-20b',
        tags: [this.tags.NLP, this.tags.LIGHT],
      },
      {
        id: 'meta-llama/Llama-3.1-70B-Instruct',
        tags: [this.tags.NLP, this.tags.LIGHT],
      },
      {
        id: 'CohereLabs/command-a-translate-08-2025',
        tags: [this.tags.TRANSLATION],
      },
      {
        id: 'openai/gpt-oss-120b',
        tags: [this.tags.CODING, this.tags.REASONING],
      },
      {
        id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
        tags: [this.tags.CODING],
      },
      {
        id: 'Qwen/Qwen-Image',
        tags: [this.tags.TEXT_RENDERING],
      },
      {
        id: 'black-forest-labs/FLUX.1-Krea-dev',
        tags: [this.tags.AESTHETICS],
      },
      {
        id: 'black-forest-labs/FLUX.1-schnell',
        tags: [this.tags.LIGHT, this.tags.EXPERIMENTATION],
      },
    ];
  }

  groupsByCategory(): {
    label: string;
    class: string;
    models: ModelWithExtraTags[];
  }[] {
    const recommended: ModelWithExtraTags[] = this.recommendedModelIds
      .map((recommendedModel) => {
        const model = this.models.find((m) => m.id === recommendedModel.id);
        return model
          ? {
              ...model,
              extraTags: recommendedModel.tags,
            }
          : null;
      })
      .filter((model): model is NonNullable<typeof model> => model !== null);

    return [
      {
        label: 'Recommended Models',
        class: 'h-10 p-2 bg-primary-50 text-primary-400',
        models: recommended,
      },
      {
        label: 'All models available on Hugging Face',
        class: 'h-10 p-2 bg-[#FFF0D9] text-[#FF9D00]',
        models: this.models.filter(
          (model) =>
            !this.recommendedModelIds.map((r) => r.id).includes(model.id),
        ),
      },
    ];
  }
}

export const ExecutionForm = component$<SidebarProps>(
  ({ column, onGenerateColumn }) => {
    const executionFormRef = useSignal<HTMLElement>();
    const { initialProcess, mode, close } = useExecution();
    const { firstColumn, columns, removeTemporalColumn, updateColumn } =
      useColumnsStore();

    const allModels = useContext<Model[]>(modelsContext);

    const {
      DEFAULT_MODEL,
      DEFAULT_MODEL_PROVIDER,

      MODEL_ENDPOINT_NAME,
      MODEL_ENDPOINT_URL,
    } = useContext(configContext);

    const models = useComputed$(() => {
      return new Models(allModels).getModelsByType(
        column.type as SupportedType,
      );
    });
    const filteredModels = useSignal<Model[]>(models.value);

    const prompt = useSignal<string>('');
    const columnsReferences = useSignal<string[]>([]);
    const variables = useSignal<Variable[]>([]);
    const searchOnWeb = useSignal(false);

    const isModelDropdownOpen = useSignal(false);
    const modelSearchQuery = useSignal<string>('');
    const selectedModelId = useSignal<string>('');
    const selectedProvider = useSignal<string>('');
    const modelProviders = useSignal<string[]>([]);

    const enableCustomEndpoint = useSignal(MODEL_ENDPOINT_URL !== undefined);
    const endpointURLSelected = useSignal(false);

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });

    const groupedModels = useComputed$(() => {
      return new GroupedModels(filteredModels.value).groupsByCategory();
    });

    const isImageColumn = useComputed$(() => {
      return column.type === 'image';
    });

    const isSearchOnWebAvailable = useComputed$(() => {
      return !isImageColumn.value;
    });

    const modelSearchContainerRef = useClickOutside(
      $(() => {
        modelSearchQuery.value = selectedModelId.value || '';
      }),
    );

    useVisibleTask$(() => {
      if (initialProcess.value.prompt) {
        prompt.value = initialProcess.value.prompt;
      }
      if (initialProcess.value.modelName) {
        selectedModelId.value = initialProcess.value.modelName;
      }
      if (initialProcess.value.modelProvider) {
        selectedProvider.value = initialProcess.value.modelProvider;
      }
    });

    useTask$(({ track }) => {
      track(columns);

      variables.value = columns.value
        .filter((c) => c.id !== column.id && !hasBlobContent(c))
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));
    });

    useTask$(() => {
      if (isImageColumn.value) {
        // Currently, we custom endpoint only for text models
        enableCustomEndpoint.value = false;
      }

      const { process } = column;
      if (!process) return;

      prompt.value = process.prompt;
      searchOnWeb.value = process.searchEnabled || false;
      endpointURLSelected.value =
        (enableCustomEndpoint.value && process.endpointUrl !== undefined) ||
        false;

      if (process.modelName) {
        // If there's a previously selected model, use that
        selectedModelId.value = process.modelName;
        selectedProvider.value = process.modelProvider!;
      } else {
        const defaultModel =
          models.value?.find(
            (m: Model) =>
              m.id.toLocaleLowerCase() === DEFAULT_MODEL.toLocaleLowerCase(),
          ) || models.value[0];

        if (!defaultModel) return;

        selectedModelId.value = defaultModel.id;
      }
    });

    useTask$(({ track }) => {
      track(modelSearchQuery);

      if (modelSearchQuery.value.length <= 1) return;

      if (modelSearchQuery.value === selectedModelId.value) {
        filteredModels.value = models.value;
        return;
      }

      filteredModels.value = models.value.filter((model: Model) =>
        model.id.toLowerCase().includes(modelSearchQuery.value.toLowerCase()),
      );

      nextTick(() => {
        isModelDropdownOpen.value =
          filteredModels.value.length > 0 &&
          filteredModels.value.length !== models.value.length;
      }, 300);
    });

    useTask$(({ track }) => {
      track(selectedModelId);
      modelSearchQuery.value = selectedModelId.value || modelSearchQuery.value;

      const model = models.value.find(
        (m: Model) =>
          m.id.toLocaleLowerCase() ===
          selectedModelId.value.toLocaleLowerCase(),
      );

      if (!model) return;

      modelProviders.value = model.providers ?? [];

      nextTick(() => {
        if (
          !selectedProvider.value ||
          !modelProviders.value.includes(selectedProvider.value)
        ) {
          const defaultModel = modelProviders.value.find(
            (provider) => provider === DEFAULT_MODEL_PROVIDER,
          );

          selectedProvider.value = defaultModel || modelProviders.value[0];
        }
      });
    });

    useVisibleTask$(() => {
      if (!executionFormRef.value) return;

      executionFormRef.value.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    const onStop = $(async () => {
      column.process!.cancellable!.abort();
      column.process!.isExecuting = false;

      updateColumn(column);
    });

    const onGenerate = $(async () => {
      column.process!.cancellable = noSerialize(new AbortController());
      column.process!.isExecuting = true;

      updateColumn(column);

      try {
        const modelName = selectedModelId.value;
        const modelProvider = selectedProvider.value;

        const columnToSave = {
          ...column,
          process: {
            ...column.process,
            modelName,
            modelProvider,
            endpointUrl: MODEL_ENDPOINT_URL,
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
            class={`${
              columns.value.filter((c) => c.id !== TEMPORAL_ID).length >= 1
                ? 'visible'
                : 'invisible'
            } rounded-full hover:bg-neutral-200 cursor-pointer transition-colors w-[30px] h-[30px]`}
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
            <div class="flex flex-col gap-2 px-8 bg-neutral-100 w-full">
              <div class="relative">
                <div class="h-72 min-h-72 max-h-72 bg-white border border-secondary-foreground rounded-sm">
                  <TemplateTextArea
                    bind:value={prompt}
                    variables={variables}
                    onSelectedVariables={onSelectedVariables}
                  />
                </div>

                <div class="w-full absolute bottom-0 p-4 flex flex-row items-center justify-between cursor-text">
                  {isSearchOnWebAvailable.value ? (
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
                  ) : (
                    <div class="flex items-center gap-2 text-neutral-500" />
                  )}

                  {column.process?.isExecuting && (
                    <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary-100 border-t-transparent" />
                  )}
                  {column.process?.isExecuting ? (
                    <Button
                      look="primary"
                      class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                      onClick$={onStop}
                      disabled={
                        (column.process?.isExecuting &&
                          column.id === TEMPORAL_ID) ||
                        !prompt.value.trim()
                      }
                    >
                      <LuStopCircle class="text-lg" />
                    </Button>
                  ) : (
                    <Button
                      look="primary"
                      class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                      onClick$={onGenerate}
                    >
                      <LuEgg class="text-lg" />
                    </Button>
                  )}
                </div>
              </div>

              {enableCustomEndpoint.value ? (
                <div class="px-3 pb-12 pt-2 bg-white border border-secondary-foreground rounded-sm">
                  <div class="flex flex-col gap-4">
                    <div class="flex gap-4">
                      <div class="flex-[2] w-3/4">
                        <div class="text-xs font-medium mb-1">Model</div>
                        <div
                          class={cn(
                            triggerLooks('default'),
                            'flex text-xs items-center px-2 gap-2 font-mono',
                          )}
                        >
                          <ModelImage model={{ id: MODEL_ENDPOINT_NAME! }} />
                          <input
                            bind:value={MODEL_ENDPOINT_NAME}
                            class="h-8 w-full outline-none font-mono text-xs"
                            disabled
                          />
                        </div>
                      </div>

                      <div class="flex-[2] w-3/4">
                        <div class="text-xs font-medium mb-1">Endpoint Url</div>
                        <div
                          class={cn(
                            triggerLooks('default'),
                            'flex text-xs items-center px-2 gap-2 font-mono',
                          )}
                        >
                          <LuLink2 class="text-lg" />
                          <input
                            value={MODEL_ENDPOINT_URL}
                            class="h-8 w-full outline-none font-mono text-xs"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    <div class="text-sm text-neutral-500">
                      You are using a custom model endpoint. Make sure the model
                      behind the endpoint is compatible with the column type (
                      {column.type}).
                    </div>
                  </div>
                </div>
              ) : (
                <div class="px-3 pb-12 pt-2 bg-white border border-secondary-foreground rounded-sm">
                  <div class="flex flex-col gap-4">
                    <div class="flex gap-4">
                      <div class="flex-[2] w-3/4">
                        <Select.Root
                          ref={modelSearchContainerRef}
                          key={modelSearchQuery.value}
                          bind:open={isModelDropdownOpen}
                          value={selectedModelId.value}
                        >
                          <Select.Label>Model</Select.Label>
                          <div
                            class={cn(
                              triggerLooks('default'),
                              'flex text-xs items-center px-2 gap-2 font-mono',
                            )}
                          >
                            {modelSearchQuery.value ==
                              selectedModelId.value && (
                              <ModelImage
                                model={
                                  models.value.find(
                                    (m) => m.id === selectedModelId.value,
                                  )!
                                }
                              />
                            )}

                            <input
                              placeholder="Search models..."
                              bind:value={modelSearchQuery}
                              class="h-8 w-full outline-none font-mono text-xs"
                              onFocusIn$={() => {
                                if (
                                  selectedModelId.value ===
                                  modelSearchQuery.value
                                ) {
                                  modelSearchQuery.value = '';
                                }
                              }}
                              onKeyDown$={() => {
                                nextTick(() => {
                                  isModelDropdownOpen.value = false;
                                });
                              }}
                              onClick$={() => {
                                isModelDropdownOpen.value = false;
                                nextTick(() => {
                                  isModelDropdownOpen.value = true;
                                }, 100);
                              }}
                            />

                            <Select.Trigger look="headless" />
                          </div>
                          <Select.Popover
                            key={modelSearchQuery.value}
                            floating="bottom-end"
                            gutter={8}
                            class="border border-border max-h-[300px] overflow-y-auto overflow-x-hidden top-[100%] bottom-auto p-0 mt-2 ml-24 min-w-[450px]"
                          >
                            <div class="flex flex-col">
                              {Object.entries(groupedModels.value).map(
                                ([category, models]) => {
                                  if (models.models.length === 0) return null;
                                  return (
                                    <div key={category}>
                                      <div
                                        class={cn(
                                          'text-[13px] font-semibold rounded-sm rounded-b-none',
                                          models.class,
                                        )}
                                      >
                                        {models.label}
                                      </div>
                                      {models.models.map((model) => (
                                        <Select.Item
                                          key={model.id}
                                          value={model.id}
                                          class="text-foreground hover:bg-accent"
                                          onClick$={() => {
                                            isModelDropdownOpen.value = false;
                                            endpointURLSelected.value = false;

                                            selectedModelId.value = model.id;
                                            modelSearchQuery.value = model.id;
                                          }}
                                        >
                                          <div class="flex text-xs items-center justify-between p-1 gap-2 font-mono w-full">
                                            <div class="flex items-center gap-2">
                                              <ModelImage model={model} />
                                              <Select.ItemLabel>
                                                {model.id}
                                              </Select.ItemLabel>
                                            </div>

                                            <ModelFlag model={model} />
                                          </div>

                                          {model.id ===
                                            selectedModelId.value && (
                                            // We cannot use the Select.ItemIndicator here
                                            // because it doesn't work when the model list changes
                                            <LuCheck class="h-4 w4 text-primary-500 absolute right-2 top-1/2 -translate-y-1/2" />
                                          )}
                                        </Select.Item>
                                      ))}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </Select.Popover>
                        </Select.Root>
                      </div>

                      <div class="flex-1 w-1/4">
                        <Select.Root bind:value={selectedProvider}>
                          <Select.Label>Inference Providers</Select.Label>
                          <Select.Trigger class="bg-white rounded-base border-neutral-300-foreground">
                            <div class="flex text-xs items-center justify-between gap-2 font-mono w-full">
                              <div class="flex items-center gap-2">
                                <Provider name={selectedProvider.value} />
                                <Select.DisplayValue />
                              </div>

                              <ExtraProviders
                                selected={selectedProvider.value}
                                providers={modelProviders.value}
                              />
                            </div>
                          </Select.Trigger>
                          <Select.Popover class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto mt-1 min-w-[200px]">
                            {modelProviders.value.map((provider) => (
                              <Select.Item
                                key={provider}
                                value={provider}
                                class="text-foreground hover:bg-accent"
                                onClick$={() => {
                                  selectedProvider.value = provider; // Redundant but ensures the value is set sometimes does not work...
                                  endpointURLSelected.value = false;
                                }}
                              >
                                <div class="flex text-xs items-center p-1 gap-2 font-mono">
                                  <Provider name={provider} />

                                  <Select.ItemLabel>
                                    {provider}
                                  </Select.ItemLabel>
                                  {provider === selectedProvider.value && (
                                    // We cannot use the Select.ItemIndicator here
                                    // because it doesn't work when the model list changes
                                    <LuCheck class="h-4 w4 text-primary-500 absolute right-2 top-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                              </Select.Item>
                            ))}
                          </Select.Popover>
                        </Select.Root>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </th>
    );
  },
);

export const ModelFlag = component$(
  ({ model }: { model?: ModelWithExtraTags }) => {
    if (!model) return null;

    return (
      <div class="flex items-center gap-2">
        {model.extraTags?.map((e) => (
          <span key={e.label} class={cn('rounded-sm p-1 capitalize', e.class)}>
            {e.label}
          </span>
        ))}
        {!model.extraTags && model.size && (
          <span class="rounded-sm bg-gray-100 text-gray-700 p-1">
            {model.size}
          </span>
        )}
      </div>
    );
  },
);
