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

import { Button, Input, Label, Select, Sidebar } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';
import { listModels } from '~/usecases/list-models';

interface SidebarProps {
  onGenerateColumn: QRL<(column: Column) => Promise<Column>>;
}

export const AddDynamicColumnSidebar = component$<SidebarProps>(
  ({ onGenerateColumn }) => {
    const { args, closeAddDynamicColumnSidebar } = useModals(
      'addDynamicColumnSidebar',
    );
    const { state: columns, removeTemporalColumn } = useColumnsStore();
    const isSubmitting = useSignal(false);

    const currentColumn = useSignal<Column | undefined>();
    const rowsToGenerate = useSignal('5');
    const prompt = useSignal<string>('');
    const modelName = useSignal<string>('');
    const modelProvider = useSignal<string>('');
    const columnsReferences = useSignal<string[]>([]);
    const variables = useSignal<Variable[]>([]);

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });

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
      track(args);
      if (!args.value?.columnId) return;

      currentColumn.value = columns.value.find(
        (c) => c.id === args.value!.columnId,
      );

      if (!currentColumn.value) return;

      prompt.value = currentColumn.value.process!.prompt;
      modelName.value = currentColumn.value.process!.modelName!;
      modelProvider.value = currentColumn.value.process!.modelProvider!;
      rowsToGenerate.value = String(currentColumn.value.process!.limit);
    });

    const loadModels = useResource$(async () => {
      return await listModels();
    });

    const onGenerate = $(async () => {
      if (!args.value) return;
      isSubmitting.value = true;

      const columnToSave = {
        ...currentColumn.value!,
        process: {
          ...currentColumn.value!.process,
          modelName: modelName.value!,
          modelProvider: modelProvider.value!,
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
      if (args.value?.mode === 'create') {
        await removeTemporalColumn();
      }

      closeAddDynamicColumnSidebar();
    });

    return (
      <Sidebar name="addDynamicColumnSidebar">
        <div class="h-full border-r border-t border-secondary relative flex flex-col p-4 gap-4">
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
            <Label for="column-model" class="flex gap-1">
              Model
            </Label>

            <Resource
              value={loadModels}
              onPending={() => (
                <Select.Disabled>Loading models...</Select.Disabled>
              )}
              onResolved={(models) => {
                if (models.length > 0 && !modelName.value) {
                  const defaultModel = models[0];
                  modelName.value = defaultModel.id;
                  modelProvider.value = defaultModel.provider;
                }

                return (
                  <Select.Root id="column-model" bind:value={modelName}>
                    <Select.Trigger class="bg-primary rounded-base border-secondary-foreground">
                      <Select.DisplayValue />
                    </Select.Trigger>
                    <Select.Popover class="bg-primary border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                      {models.map((model) => (
                        <Select.Item
                          key={model.id}
                          class="text-foreground hover:bg-accent"
                          onClick$={() => {
                            modelProvider.value = model.provider;
                          }}
                        >
                          <Select.ItemLabel>{model.id}</Select.ItemLabel>
                          <Select.ItemIndicator>
                            <LuCheck class="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Popover>
                  </Select.Root>
                );
              }}
            />

            <Input
              id="column-rows"
              type="number"
              class="h-10 border-secondary-foreground bg-primary"
              bind:value={rowsToGenerate}
            />

            <div class="relative">
              <Label>Prompt</Label>

              <TemplateTextArea
                bind:value={prompt}
                variables={variables}
                onSelectedVariables={onSelectedVariables}
              />

              <div class="absolute bottom-14 flex justify-between items-center w-full px-2">
                <Button
                  look="ghost"
                  class="rounded-2xl h-10 bg-ring hover:bg-indigo-300 text-white w-fit select-none"
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
      </Sidebar>
    );
  },
);
