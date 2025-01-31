import { $, type QRL, type Signal, component$ } from '@builder.io/qwik';
import { TbX } from '@qwikest/icons/tablericons';

import { Button, Input, Label, Select, Sidebar, Textarea } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import type { Column } from '~/state';

interface SidebarProps {
  column: Signal<Column | undefined>;
  onUpdateColumn: QRL<(column: Column) => Promise<void>>;
}

export const RunExecutionSidebar = component$<SidebarProps>(
  ({ column, onUpdateColumn }) => {
    const { isOpenRunExecutionSidebar, closeRunExecutionSidebar } = useModals(
      'runExecutionSidebar',
    );

    const runExecution = $(async () => {
      await onUpdateColumn(column.value!);
    });

    if (!column.value) return null;

    return (
      <Sidebar bind:show={isOpenRunExecutionSidebar}>
        <div class="flex h-full flex-col justify-between p-4">
          <div class="h-full">
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
              <Select.Root
                id="column-output-type"
                value={column.value.type}
                disabled
              >
                <Select.Trigger>{column.value.type}</Select.Trigger>
              </Select.Root>

              <Label for="column-prompt">Prompt template</Label>
              <Textarea disabled value={column.value.process?.prompt} />

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
                disabled
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
