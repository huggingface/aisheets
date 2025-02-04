import { $, type QRL, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { TbX } from '@qwikest/icons/tablericons';

import {
  Button,
  Input,
  Label,
  Select,
  Sidebar,
  Textarea,
  useModals,
} from '~/components';
import { type Column, useColumnsStore } from '~/state';

interface SidebarProps {
  onUpdateColumn: QRL<(column: Column) => Promise<void>>;
}

export const RunExecutionSidebar = component$<SidebarProps>(
  ({ onUpdateColumn }) => {
    const { args, closeRunExecutionSidebar } = useModals('runExecutionSidebar');
    const column = useSignal<Column | null>(null);
    const { state: columns } = useColumnsStore();

    useTask$(({ track }) => {
      track(args);

      if (!args.value?.columnId) return;

      const columnFound = columns.value.find(
        (column) => column.id === args.value?.columnId,
      )!;

      column.value = { ...columnFound };
    });

    const runExecution = $(async () => {
      await onUpdateColumn(column.value!);
    });

    if (!column.value) return null;

    return (
      <Sidebar name="runExecutionSidebar">
        <div class="flex h-full flex-col justify-between p-4">
          <div class="max-h-full">
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <Label for="column-name">Column name</Label>

                <Button
                  size="sm"
                  look="ghost"
                  onClick$={closeRunExecutionSidebar}
                >
                  <TbX />
                </Button>
              </div>
              <Input
                disabled
                id="column-name"
                class="h-10"
                value={column.value.name}
              />

              <Label for="column-output-type">Output type</Label>
              <Select.Root id="column-output-type" value={column.value.type}>
                <Select.Trigger>{column.value.type}</Select.Trigger>
              </Select.Root>

              <Label for="column-prompt">Prompt template</Label>
              <Textarea value={column.value.process?.prompt} />

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
                value={column.value.process!.modelName}
              />
            </div>
          </div>

          <div class="flex h-16 w-full items-center justify-center">
            <Button
              size="sm"
              class="w-full rounded-sm p-2"
              onClick$={runExecution}
            >
              Run execution
            </Button>
          </div>
        </div>
      </Sidebar>
    );
  },
);
