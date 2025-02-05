import {
  $,
  type QRL,
  Resource,
  component$,
  useResource$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { LuCheck } from '@qwikest/icons/lucide';
import { TbX } from '@qwikest/icons/tablericons';

import { Button, Input, Label, Select, Sidebar } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import {
  TemplateTextArea,
  type Variable,
} from '~/features/add-column/components/template-textarea';
import {
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
  useDatasetsStore,
} from '~/state';

interface SidebarProps {
  onGenerateColumn: QRL<(column: CreateColumn | Column) => void>;
}

const MODEL_URL =
  'https://huggingface.co/api/models?other=text-generation-inference&inference=warm';
const DEFAULT_MODEL = 'google/gemma-2-2b-it';

interface HFModel {
  id: string;
  tags?: string[];
}

export const AddDynamicColumnSidebar = component$<SidebarProps>(
  ({ onGenerateColumn }) => {
    const {
      args,
      isOpenAddDynamicColumnSidebar,
      closeAddDynamicColumnSidebar,
    } = useModals('addDynamicColumnSidebar');
    const { state: columns } = useColumnsStore();
    const { activeDataset } = useDatasetsStore();

    const column = useSignal<Column | null>(null);
    const rowsToGenerate = useSignal('5');
    const prompt = useSignal('');
    const variables = useSignal<Variable[]>([]);
    const columnsReferences = useSignal<string[]>([]);
    const modelName = useSignal(DEFAULT_MODEL);

    const onSelectedVariables = $((variables: { id: string }[]) => {
      columnsReferences.value = variables.map((v) => v.id);
    });

    useTask$(({ track }) => {
      track(args);
      if (!args.value?.columnId) return;
      const columnFound = columns.value.find(
        (column) => column.id === args.value?.columnId,
      )!;
      column.value = { ...columnFound };
      columnsReferences.value = [];

      variables.value = columns.value
        .filter((c) => c.id !== TEMPORAL_ID)
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));

      if (args.value.mode === 'edit') {
        prompt.value = columnFound.process!.prompt;
        modelName.value = columnFound.process!.modelName;
        rowsToGenerate.value = String(columnFound.process!.limit);
        variables.value = variables.value.filter(
          (c) => c.id !== columnFound.id, //Remove the column itself
        );
      } else if (args.value.mode === 'create') {
        prompt.value = '';
        modelName.value = DEFAULT_MODEL;
        rowsToGenerate.value = '5';
      }
    });

    const loadModels = useResource$(async ({ track, cleanup }) => {
      track(isOpenAddDynamicColumnSidebar);

      if (!isOpenAddDynamicColumnSidebar) return Promise.resolve([]);

      const controller = new AbortController();
      cleanup(() => controller.abort());

      const response = await fetch(MODEL_URL, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = (await response.json()) as HFModel[];

      return data
        .filter((model: any) =>
          model.tags?.includes('text-generation-inference'),
        )
        .map((model: any) => ({
          id: model.id,
        }));
    });

    const onGenerate = $(() => {
      if (!args.value) return;

      if (args.value.mode === 'create') {
        const getNextColumnName = (counter = 1): string => {
          const manyColumnsWithName = columns.value
            .filter((c) => c.id !== TEMPORAL_ID)
            .filter((c) => c.name.startsWith('Column'));

          const newPosibleColumnName = `Column ${manyColumnsWithName.length + 1}`;

          if (
            !manyColumnsWithName.find((c) => c.name === newPosibleColumnName)
          ) {
            return newPosibleColumnName;
          }

          return getNextColumnName(counter + 1);
        };

        const columnToSave: CreateColumn = {
          name: getNextColumnName(),
          type: 'text',
          kind: 'dynamic',
          dataset: activeDataset.value,
          process: {
            modelName: modelName.value,
            prompt: prompt.value,
            columnsReferences: columnsReferences.value,
            offset: 0,
            limit: Number(rowsToGenerate.value),
          },
        };

        onGenerateColumn(columnToSave);
      } else if (args.value.mode === 'edit') {
        const columnToSave: Column = {
          ...column.value!,
          dataset: column.value!.dataset,
          process: {
            ...column.value!.process,
            modelName: modelName.value,
            prompt: prompt.value,
            columnsReferences: columnsReferences.value,
            offset: 0,
            limit: Number(rowsToGenerate.value),
          },
        };

        onGenerateColumn(columnToSave);
      }
    });

    return (
      <Sidebar name="addDynamicColumnSidebar">
        <div class="flex h-full flex-col justify-between p-4">
          <div class="max-h-full">
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <Label for="column-prompt">Prompt template</Label>

                <Button
                  size="sm"
                  look="ghost"
                  onClick$={closeAddDynamicColumnSidebar}
                >
                  <TbX />
                </Button>
              </div>

              <TemplateTextArea
                bind:value={prompt}
                variables={variables}
                onSelectedVariables={onSelectedVariables}
              />

              <Label for="column-model" class="flex gap-1">
                Model
              </Label>
              <Resource
                value={loadModels}
                onPending={() => {
                  return <Select.Disabled>Loading models...</Select.Disabled>;
                }}
                onResolved={(models) => {
                  return (
                    <Select.Root id="column-model" bind:value={modelName}>
                      <Select.Trigger class="bg-background border-input">
                        <Select.DisplayValue />
                      </Select.Trigger>
                      <Select.Popover class="bg-background border border-border max-h-[300px] overflow-y-auto top-[100%] bottom-auto">
                        {models.map((model) => (
                          <Select.Item
                            key={model.id}
                            class="text-foreground hover:bg-accent"
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
            <Button
              size="sm"
              class="w-full rounded-sm p-2"
              onClick$={onGenerate}
            >
              Generate
            </Button>
          </div>
        </div>
      </Sidebar>
    );
  },
);
