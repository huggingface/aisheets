import {
  $,
  component$,
  useComputed$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Collapsible } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import {
  LuCheck,
  LuChevronDown,
  LuEgg,
  LuGlobe,
  LuImage,
  LuSquare,
} from '@qwikest/icons/lucide';
import { Button, Select, triggerLooks } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { nextTick } from '~/components/hooks/tick';
import {
  ExtraProviders,
  ModelImage,
  Provider,
} from '~/components/ui/logo/logo';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';

import { useExecution } from '~/features/add-column/form/execution';
import { useGenerateColumn } from '~/features/execution';
import { hasBlobContent, isImage } from '~/features/utils/columns';
import type { Model } from '~/loaders/hub-models';
import { useConfigContext, useModelsContext } from '~/routes/home/layout';
import {
  type Column,
  type TaskType,
  useColumnsStore,
  useDatasetsStore,
} from '~/state';

export class Models {
  constructor(private readonly models: Model[]) {}

  get(value: string) {
    return this.models.find(
      (m: Model) => m.id.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );
  }

  getModelsByTask(task: TaskType): Model[] {
    if (task === 'text-to-image') return this.getImageModels();
    if (task === 'image-text-to-text') return this.getImageTextToTextModels();
    if (task === 'image-to-image') return this.getImageToImageModels();
    return this.getTextModels();
  }

  getTextModels(): Model[] {
    return this.models.filter((model) => model.supportedType === 'text');
  }

  getImageModels(): Model[] {
    return this.models.filter((model) => model.supportedType === 'image');
  }

  private getImageTextToTextModels(): Model[] {
    return this.models.filter(
      (model) => model.supportedType === 'image-text-to-text',
    );
  }

  private getImageToImageModels(): Model[] {
    return this.models.filter(
      (model) => model.supportedType === 'image-to-image',
    );
  }
}

type ModelWithExtraTags = Model & {
  extraTags?: { label: string; class: string }[];
};
class GroupedModels {
  private readonly tags = {
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

  constructor(
    private readonly column: Column,
    private readonly models: Model[],
  ) {}

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
      {
        id: 'black-forest-labs/FLUX.1-schnell',
        tags: [this.tags.LIGHT, this.tags.EXPERIMENTATION],
      },
      {
        id: 'Qwen/Qwen2.5-VL-7B-Instruct',
        tags: [this.tags.LIGHT, this.tags.EXPERIMENTATION],
      },
      {
        id: 'google/gemma-3-27b-it',
        tags: [this.tags.EXPERIMENTATION],
      },
      {
        id: 'Qwen/Qwen3-VL-235B-A22B-Thinking',
        tags: [this.tags.REASONING],
      },
    ];
  }

  private getRecommendedModels(): ModelWithExtraTags[] {
    return this.recommendedModelIds
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
  }

  byCategory(): {
    label: string;
    class: string;
    models: ModelWithExtraTags[];
  }[] {
    const models = [
      {
        label: 'Custom Models',
        class: 'h-10 p-2 bg-primary-50 text-primary-400',
        models: this.models.filter((c) => !!c.endpointUrl),
      },
      {
        label: 'Recommended Models',
        class: 'h-10 p-2 bg-primary-50 text-primary-400',
        models: this.getRecommendedModels(),
      },
    ];

    if (this.column.type === 'unknown') {
      return [
        ...models,
        {
          label: 'Text Models',
          class: 'h-10 p-2 bg-amber-50 text-amber-400',
          models: this.models.filter((m) => m.supportedType === 'text'),
        },
        {
          label: 'Image Models',
          class: 'h-10 p-2 bg-secondary-50 text-secondary-400',
          models: this.models.filter((m) => m.supportedType === 'image'),
        },
      ].filter((g) => g.models.length > 0);
    }

    return [
      ...models,
      {
        label: 'All models available on Hugging Face',
        class: 'h-10 p-2 bg-[#FFF0D9] text-[#FF9D00]',
        models: this.models
          .filter((c) => !c.endpointUrl)
          .filter(
            (model) =>
              !this.recommendedModelIds.map((r) => r.id).includes(model.id),
          ),
      },
    ].filter((g) => g.models.length > 0);
  }
}

export const ExecutionForm = component$(() => {
  const { activeDataset } = useDatasetsStore();
  const { columnId, column } = useExecution();
  const { columns, updateColumn } = useColumnsStore();
  const allModels = useModelsContext();
  const { DEFAULT_MODEL, DEFAULT_MODEL_PROVIDER } = useConfigContext();
  const { onGenerateColumn } = useGenerateColumn();

  const models = useComputed$(() => {
    if (!column.value) return [];

    return new Models(allModels).getModelsByTask(column.value.process?.task!);
  });

  const filteredModels = useSignal<Model[]>(models.value);
  const groupedModels = useComputed$(() => {
    if (!column.value) return [];

    return new GroupedModels(column.value, filteredModels.value).byCategory();
  });

  const showEndpointUrl = useComputed$(() => {
    return models.value.some((m) => !!m.endpointUrl);
  });

  const prompt = useSignal<string>('');
  const columnsReferences = useSignal<string[]>(
    column.value?.process?.columnsReferences || [],
  );
  const variables = useSignal<Variable[]>([]);
  const searchOnWeb = useSignal(false);

  const isModelDropdownOpen = useSignal(false);
  const modelSearchQuery = useSignal<string>('');
  const selectedModelId = useSignal<string>('');
  const selectedProvider = useSignal<string>('');
  const modelProviders = useSignal<string[]>([]);

  // Image column selector for image-text-to-text scenarios
  const selectedImageColumn = useSignal<string>('');
  const imageColumns = useSignal<Variable[]>([]);

  const needsImageColumn = useComputed$(() => {
    return (
      column.value?.process?.task === 'image-text-to-text' ||
      column.value?.process?.task === 'image-to-image'
    );
  });

  const onSelectedVariables = $((variables: { id: string }[]) => {
    columnsReferences.value = variables.map((v) => v.id);
  });

  const isImageColumn = useComputed$(() => {
    return column.value?.type === 'image';
  });

  const isSearchOnWebAvailable = useComputed$(() => {
    return !isImageColumn.value;
  });

  const referredColumns = useComputed$(() => {
    return columns.value.filter((c) => columnsReferences.value.includes(c.id));
  });

  const maxSizeToGenerate = useComputed$(() => {
    if (selectedImageColumn.value) {
      const imageColumn = columns.value.find(
        (c) => c.id === selectedImageColumn.value,
      );
      return imageColumn?.size || 0;
    }

    if (referredColumns.value.length > 0) {
      return Math.max(...referredColumns.value.map((c) => c.size || 0));
    }

    return activeDataset.value.size;
  });

  const counterValue = useComputed$(() => {
    const processedSize = column.value?.process?.processedCells ?? 0;

    return maxSizeToGenerate.value - processedSize;
  });

  const shouldDisable = useComputed$(() => {
    return column.value?.process?.isExecuting;
  });

  const modelSearchContainerRef = useClickOutside(
    $(() => {
      modelSearchQuery.value = selectedModelId.value || '';
    }),
  );

  useTask$(async ({ track }) => {
    track(columns);

    variables.value = columns.value
      .filter((c) => c.id !== column.value?.id && !hasBlobContent(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
      }));

    const updateImageColumns = async () => {
      const imageCols = [];
      for (const c of columns.value) {
        if (c.id !== column.value?.id && isImage(c)) {
          imageCols.push({
            id: c.id,
            name: c.name,
          });
        }
      }
      imageColumns.value = imageCols;

      if (
        needsImageColumn.value &&
        !selectedImageColumn.value &&
        imageColumns.value.length > 0
      ) {
        selectedImageColumn.value = imageColumns.value[0].id;
      }
    };

    await updateImageColumns();
  });

  useTask$(({ track }) => {
    track(columnId);
    track(() => column.value?.id);

    if (!column.value) return;
    if (columnId.value != column.value.id) return;

    const { process } = column.value;
    if (!process) return;

    prompt.value = process.prompt;
    searchOnWeb.value = process.searchEnabled || false;

    if (process.modelName) {
      // If there's a previously selected model, use that
      selectedModelId.value = process.modelName;

      if (showEndpointUrl.value) {
        selectedProvider.value = process.endpointUrl || '';
      } else {
        selectedProvider.value = process.modelProvider || '';
      }
    } else {
      const defaultModel =
        models.value?.find(
          (m: Model) =>
            m.id.toLocaleLowerCase() === DEFAULT_MODEL.toLocaleLowerCase(),
        ) || models.value[0];

      if (!defaultModel) return;

      selectedModelId.value = defaultModel.id;
    }

    // Initialize image column selection if editing an existing column
    if (process.imageColumnId) {
      selectedImageColumn.value = process.imageColumnId;
    }
  });

  useTask$(({ track }) => {
    track(modelSearchQuery);
    track(models);

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
    track(models);

    modelSearchQuery.value = selectedModelId.value || modelSearchQuery.value;

    const model = models.value.find(
      (m: Model) =>
        m.id.toLocaleLowerCase() === selectedModelId.value.toLocaleLowerCase(),
    );

    if (!model) return;

    modelProviders.value = model.endpointUrl
      ? [model.endpointUrl]
      : (model.providers ?? []);

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

  const onStop = $(() => {
    if (!column.value) return;

    column.value.process!.cancellable!.abort();
    column.value.process!.isExecuting = false;

    updateColumn(column.value);
  });

  const onGenerate = $(async () => {
    try {
      if (!column.value) return;
      if (column.value.process?.isExecuting) return;

      const model = models.value.find(
        (m: Model) =>
          m.id.toLocaleLowerCase() ===
          selectedModelId.value.toLocaleLowerCase(),
      );

      if (!model) return;

      let modelProvider: string | undefined;
      let endpointUrl: string | undefined;

      if (showEndpointUrl.value) {
        endpointUrl = selectedProvider.value!;
      } else {
        modelProvider = selectedProvider.value!;
      }

      if (column.value.type === 'unknown') {
        column.value.type = model.supportedType as Column['type'];
      }

      column.value.process = {
        ...column.value.process!,
        modelName: model.id,
        modelProvider,
        endpointUrl,
        prompt: prompt.value,
        limit: maxSizeToGenerate.value,
        columnsReferences: columnsReferences.value,
        searchEnabled: searchOnWeb.value,
        // Add selected image column for image processing workflows
        ...(needsImageColumn.value && {
          imageColumnId: selectedImageColumn.value || undefined,
        }),
      };

      updateColumn(column.value);
      await onGenerateColumn(column.value);
    } catch {}
  });

  useVisibleTask$(() => {
    if (column.value?.cells.length === 0) {
      nextTick(() => {
        onGenerate();
      });
    }
  });

  if (!column.value) return null;

  return (
    <div class="min-w-[660px] w-[660px] font-normal text-left">
      <span>Type your action</span>

      <div class="relative h-full w-full">
        <div class="absolute h-full w-full flex flex-col">
          <div class="flex flex-col gap-2 w-full">
            <div class="relative">
              <div
                class={cn(
                  'h-72 min-h-72 max-h-72 bg-white border border-secondary-foreground rounded-sm relative mt-2',
                  {
                    'cursor-not-allowed pointer-events-none opacity-70':
                      shouldDisable.value,
                  },
                )}
              >
                {/* Image column dropdown positioned at top-left inside textarea */}
                {needsImageColumn.value && imageColumns.value.length > 0 && (
                  <div class="absolute top-2 left-2 z-10 w-48">
                    <Select.Root
                      bind:value={selectedImageColumn}
                      class="h-[30px]"
                    >
                      <Select.Trigger class="bg-white/90 backdrop-blur-sm rounded-base border-neutral-300-foreground h-[30px] flex items-center px-[10px] py-[8px] shadow-sm">
                        <div class="flex text-xs items-center justify-between gap-2 font-mono w-full">
                          <div class="flex items-center gap-2">
                            <LuImage class="h-4 w-4 text-neutral-500" />
                            <Select.DisplayValue />
                          </div>
                        </div>
                      </Select.Trigger>
                      <Select.Popover class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto mt-1 min-w-[200px]">
                        {imageColumns.value.map((imageColumn) => (
                          <Select.Item
                            key={imageColumn.id}
                            value={imageColumn.id}
                            class="text-foreground hover:bg-accent"
                          >
                            <div class="flex text-xs items-center p-1 gap-2 font-mono">
                              <Select.ItemLabel>
                                {imageColumn.name}
                              </Select.ItemLabel>
                              {imageColumn.id === selectedImageColumn.value && (
                                <LuCheck class="h-4 w4 text-primary-500 absolute right-2 top-1/2 -translate-y-1/2" />
                              )}
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Popover>
                    </Select.Root>
                  </div>
                )}

                <TemplateTextArea
                  bind:value={prompt}
                  variables={variables}
                  onSelectedVariables={onSelectedVariables}
                  hasImageDropdown={
                    needsImageColumn.value && imageColumns.value.length > 0
                  }
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
                    disabled={shouldDisable.value}
                  >
                    <LuGlobe class="text-lg" />
                    Search the web
                  </Button>
                ) : (
                  <div class="flex items-center gap-2 text-neutral-500" />
                )}

                <div class="flex items-center gap-4">
                  {!column.value.process?.isExecuting &&
                    column.value.cells.some((c) => c.error) && (
                      <div class="p-[2px] rounded-[6px] bg-red-500 w-16 h-8">
                        <div class="rounded-[4px] bg-white w-full h-full flex items-center justify-center text-red-500">
                          {column.value.cells.filter((c) => c.error).length}
                        </div>
                      </div>
                    )}

                  {column.value.process?.isExecuting && (
                    <div class="p-[2px] rounded-[6px] bg-gradient-to-b from-[#4057BF] to-[#6B86FF] w-16 h-8">
                      <div class="rounded-[4px] bg-white w-full h-full flex items-center justify-center">
                        {counterValue.value}
                      </div>
                    </div>
                  )}

                  {column.value.process?.isExecuting ? (
                    <Tooltip text="Stop generating">
                      <Button
                        look="primary"
                        class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                        onClick$={onStop}
                      >
                        <LuSquare class="text-lg" />
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip text="Generate">
                      <Button
                        look="primary"
                        class="w-[30px] h-[30px] rounded-full flex items-center justify-center p-0"
                        onClick$={onGenerate}
                        disabled={
                          selectedModelId.value === '' ||
                          selectedProvider.value === '' ||
                          !prompt.value.trim()
                        }
                      >
                        <LuEgg class="text-lg" />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            <div class="px-3 pb-12 pt-2 bg-white border border-secondary-foreground rounded-sm">
              <div class="flex flex-col gap-4">
                <div class="flex gap-4">
                  <div
                    class={cn({
                      'w-1/2': showEndpointUrl.value,
                      'flex-[2] w-3/4': !showEndpointUrl.value,
                    })}
                  >
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
                        {modelSearchQuery.value == selectedModelId.value && (
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
                              selectedModelId.value === modelSearchQuery.value
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
                        class="border border-border max-h-[300px] overflow-y-auto overflow-x-hidden top-[100%] bottom-auto p-0 ml-9 mt-2 min-w-[450px]"
                      >
                        <div class="flex flex-col">
                          {Object.entries(groupedModels.value).map(
                            ([category, models], i) => {
                              return (
                                <div key={category}>
                                  <Collapsible.Root
                                    open={groupedModels.value.length <= 2}
                                  >
                                    <Collapsible.Trigger class="w-full">
                                      <div
                                        class={cn(
                                          'text-[13px] w-full font-semibold flex items-center justify-between',
                                          models.class,
                                          {
                                            'rounded-sm rounded-b-none':
                                              i === 0,
                                          },
                                        )}
                                      >
                                        {models.label}
                                        <LuChevronDown />
                                      </div>
                                    </Collapsible.Trigger>
                                    <Collapsible.Content>
                                      {models.models.map((model) => (
                                        <Select.Item
                                          key={model.id}
                                          value={model.id}
                                          class="text-foreground hover:bg-accent"
                                          onClick$={() => {
                                            isModelDropdownOpen.value = false;

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
                                    </Collapsible.Content>
                                  </Collapsible.Root>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </Select.Popover>
                    </Select.Root>
                  </div>

                  <div
                    class={cn({
                      'w-1/2': showEndpointUrl.value,
                      'flex-1 w-1/4': !showEndpointUrl.value,
                    })}
                  >
                    <Select.Root bind:value={selectedProvider}>
                      <Select.Label>
                        {showEndpointUrl.value
                          ? 'Endpoint url'
                          : 'Inference Providers'}
                      </Select.Label>
                      <Select.Trigger class="bg-white rounded-base border-neutral-300-foreground">
                        <div class="flex text-xs items-center justify-between gap-2 font-mono w-40">
                          <div class="flex items-center gap-2">
                            <Provider name={selectedProvider.value} />

                            <Select.DisplayValue
                              class={cn('truncate w-fit', {
                                'max-w-16': modelProviders.value.length > 1,
                                'max-w-52': modelProviders.value.length === 1,
                              })}
                            />
                          </div>

                          {modelProviders.value.length > 1 && (
                            <ExtraProviders
                              selected={selectedProvider.value}
                              providers={modelProviders.value}
                            />
                          )}
                        </div>
                      </Select.Trigger>

                      <Select.Popover class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto mt-1 min-w-[200px]">
                        {modelProviders.value.map((provider) => (
                          <Select.Item
                            key={provider}
                            value={provider}
                            class="text-foreground hover:bg-accent w-fit min-w-full"
                            onClick$={() => {
                              selectedProvider.value = provider; // Redundant but ensures the value is set sometimes does not work...
                            }}
                          >
                            <div class="flex text-xs items-center p-1 gap-2 font-mono">
                              <Provider name={provider} />

                              <Select.ItemLabel>{provider}</Select.ItemLabel>
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
            <ErrorInfo column={column.value} />
          </div>
        </div>
      </div>
    </div>
  );
});

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

export const ErrorInfo = component$(({ column }: { column: Column }) => {
  const hasErrors = column.cells.some((c) => c.error);
  const errorCount = column.cells.filter((c) => c.error).length;

  const errorMessages = column.cells
    .filter((c) => c.error)
    .map((c) => c.error)
    .filter((msg, index, self) => msg && self.indexOf(msg) === index);

  const errorMessage = useComputed$(() => {
    if (errorMessages.length === 0) return '';
    if (errorMessages.length === 1) return errorMessages[0];

    return `${errorMessages[0]} (and ${errorMessages.length - 1} more)`;
  });

  if (!hasErrors) return null;

  return (
    <div class="text-sm text-red-500">
      {errorCount} cell{errorCount > 1 ? 's' : ''} failed to generate:{' '}
      {errorMessage.value}
    </div>
  );
});
