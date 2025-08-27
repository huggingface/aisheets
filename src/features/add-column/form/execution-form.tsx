import {
  $,
  type QRL,
  component$,
  noSerialize,
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
  LuStopCircle,
  LuUndo2,
  LuX,
} from '@qwikest/icons/lucide';

import { Button, Select, triggerLooks } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { nextTick } from '~/components/hooks/tick';
import { Tooltip } from '~/components/ui/tooltip/tooltip';

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
    HEAVY: {
      label: 'heavy',
      class: 'bg-[#FBDAD7]',
    },
    LIGHT: {
      label: 'light',
      class: 'bg-[#F0FFD4]',
    },
    FAST: {
      label: 'fast',
      class: 'bg-[#D7FBE0]',
    },
    SLOW: {
      label: 'slow',
      class: 'bg-[#FBDAD7]',
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
        id: 'black-forest-labs/FLUX.1-dev',
        tags: [this.tags.FAST],
      },
    ];
  }

  groupsByCategory(): {
    label: string;
    class: string;
    models: ModelWithExtraTags[];
  }[] {
    const recommended: ModelWithExtraTags[] = this.models
      .filter((model) =>
        this.recommendedModelIds.map((r) => r.id).includes(model.id),
      )
      .map((m) => ({
        ...m,
        extraTags: this.recommendedModelIds.find((r) => r.id === m.id)?.tags,
      }));

    return [
      {
        label: 'Recommended Models',
        class: 'h-10 p-2 bg-primary-50 text-primary-400',
        models: recommended,
      },
      {
        label: 'All models available on Hugging Face',
        class: 'h-10 p-2 bg-secondary-50 text-secondary-400',
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
      modelEndpointEnabled,
      MODEL_ENDPOINT_NAME,
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

    const enableCustomEndpoint = useSignal(modelEndpointEnabled);
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

    const modelProviders = useComputed$(() => {
      const model = models.value.find(
        (m: Model) =>
          m.id.toLocaleLowerCase() ===
          selectedModelId.value.toLocaleLowerCase(),
      );

      return model ? model.providers : [];
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

    useVisibleTask$(({ track }) => {
      track(() => column);

      if (isImageColumn.value) {
        // Currently, we custom endpoint only for text models
        enableCustomEndpoint.value = false;
      }

      const { process } = column;
      if (!process) return;

      prompt.value = process.prompt;
      searchOnWeb.value = process.searchEnabled || false;
      endpointURLSelected.value =
        (enableCustomEndpoint.value && process.useEndpointURL) || false;

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

      isModelDropdownOpen.value = false;

      nextTick(() => {
        isModelDropdownOpen.value =
          filteredModels.value.length > 0 &&
          filteredModels.value.length !== models.value.length;
      }, 300);
    });

    useVisibleTask$(({ track }) => {
      track(selectedModelId);

      modelSearchQuery.value = selectedModelId.value || modelSearchQuery.value;

      const model = models.value.find(
        (m: Model) => m.id === selectedModelId.value,
      );

      if (!model) return;

      const defaultProvider =
        model.providers.find(
          (provider) => provider === DEFAULT_MODEL_PROVIDER,
        ) || model.providers[0];

      if (
        !selectedProvider.value ||
        (selectedProvider.value &&
          !model.providers.includes(selectedProvider.value))
      ) {
        selectedProvider.value = defaultProvider;
      }
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
            useEndpointURL: endpointURLSelected.value,
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

              {!!selectedModelId.value && !!modelProviders.value.length && (
                <>
                  <div class="flex items-center justify-start gap-1">
                    {endpointURLSelected.value ? (
                      <div class="flex items-center justify-start gap-1 cursor-pointer">
                        Model
                        <p class="text-neutral-500 underline">
                          {MODEL_ENDPOINT_NAME}
                        </p>
                        with custom endpoint
                      </div>
                    ) : (
                      <div class="flex items-center justify-start gap-1">
                        Model
                        <p class="text-neutral-500 underline">
                          <a
                            href={`https://huggingface.co/${selectedModelId.value}`}
                            class="text-neutral-500 hover:text-neutral-600"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selectedModelId.value}
                          </a>
                        </p>
                        {enableCustomEndpoint.value &&
                          !endpointURLSelected.value && (
                            <Tooltip text="Reset default model">
                              <LuUndo2
                                class="w-4 h-4 rounded-full gap-2 text-neutral-500 cursor-pointer hover:bg-neutral-200"
                                onClick$={() =>
                                  (endpointURLSelected.value = true)
                                }
                              />
                            </Tooltip>
                          )}
                        with provider
                        <p class="italic">{selectedProvider.value}</p>
                      </div>
                    )}
                  </div>

                  <div class="px-3 pb-12 pt-2 bg-white border border-secondary-foreground rounded-sm">
                    <div class="flex flex-col gap-4">
                      <div class="flex gap-4">
                        <div class="flex-[2]">
                          <Select.Root
                            ref={modelSearchContainerRef}
                            key={modelSearchQuery.value}
                            bind:open={isModelDropdownOpen}
                            value={selectedModelId.value}
                          >
                            <Select.Label>Model</Select.Label>
                            <div
                              class={cn(
                                'w-full flex flex-row justify-between items-center',
                                triggerLooks('default'),
                              )}
                            >
                              <input
                                class="h-8 w-full outline-none"
                                onFocusIn$={() => {
                                  if (
                                    selectedModelId.value ===
                                    modelSearchQuery.value
                                  ) {
                                    modelSearchQuery.value = '';
                                  }
                                }}
                                placeholder="Search models..."
                                bind:value={modelSearchQuery}
                              />
                              <Select.Trigger look="headless" />
                            </div>
                            <Select.Popover
                              key={modelSearchQuery.value}
                              floating="bottom-end"
                              gutter={8}
                              class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto p-0 ml-3 mt-2"
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

                                              selectedProvider.value =
                                                model.providers.includes(
                                                  DEFAULT_MODEL_PROVIDER,
                                                )
                                                  ? DEFAULT_MODEL_PROVIDER
                                                  : model.providers[0];
                                            }}
                                          >
                                            <div class="flex text-xs items-center p-1 gap-2 font-mono">
                                              <img
                                                src={model.picture}
                                                alt={model.id}
                                                class="w-4 h-4"
                                                onError$={(ev) => {
                                                  (
                                                    ev.target as HTMLImageElement
                                                  ).src =
                                                    'https://huggingface.co/front/assets/huggingface_logo-noborder.svg';
                                                }}
                                              />
                                              <Select.ItemLabel>
                                                {model.id}
                                              </Select.ItemLabel>
                                              <div class="flex items-center gap-2">
                                                {model.extraTags?.map((e) => (
                                                  <div
                                                    key={e.label}
                                                    class={cn(
                                                      'rounded-sm',
                                                      e.class,
                                                    )}
                                                  >
                                                    <span class="capitalize p-2">
                                                      {e.label}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                            {model.size && (
                                              <span class="ml-2 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-sm">
                                                {model.size}
                                              </span>
                                            )}

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
                        <div class="flex-1">
                          <Select.Root bind:value={selectedProvider}>
                            <Select.Label>Inference Providers</Select.Label>
                            <Select.Trigger class="px-4 bg-white rounded-base border-neutral-300-foreground">
                              <Select.DisplayValue />
                            </Select.Trigger>
                            <Select.Popover class="border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto mt-1">
                              {modelProviders.value.map((provider) => (
                                <Select.Item
                                  key={provider}
                                  value={provider}
                                  class="text-foreground hover:bg-accent"
                                  onClick$={() => {
                                    endpointURLSelected.value = false;
                                  }}
                                >
                                  <Select.ItemLabel>
                                    {provider}
                                  </Select.ItemLabel>
                                  {provider === selectedProvider.value && (
                                    // We cannot use the Select.ItemIndicator here
                                    // because it doesn't work when the model list changes
                                    <LuCheck class="h-4 w4 text-primary-500 absolute right-2 top-1/2 -translate-y-1/2" />
                                  )}
                                </Select.Item>
                              ))}
                            </Select.Popover>
                          </Select.Root>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </th>
    );
  },
);
