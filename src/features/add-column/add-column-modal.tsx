import { $, component$, type QRL, useSignal } from '@builder.io/qwik';
import {
  TbAlignJustified,
  TbBraces,
  TbBrackets,
  TbCloud,
  TbHash,
  TbKeyboard,
  TbToggleLeft,
  TbX,
} from '@qwikest/icons/tablericons';

import { Button, Modal } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { AddStaticColumnSidebar } from '~/features/add-column/add-static-column-sidebar';
import type { Column, ColumnKind, ColumnType, CreateColumn } from '~/state';

interface Props {
  onCreateColumn: QRL<(createColumn: CreateColumn) => void>;
}

export const AddColumn = component$<Props>(({ onCreateColumn }) => {
  const { isOpenAddColumnModal, closeAddColumnModal } =
    useModals('addColumnModal');
  const { openAddDynamicColumnSidebar } = useModals('addDynamicColumnSidebar');
  const { openAddStaticColumnSidebar } = useModals('addStaticColumnSidebar');

  const columnType = useSignal<Column['type']>('text');

  const openSidebar = $((type: ColumnType, kind: ColumnKind) => {
    closeAddColumnModal();

    columnType.value = type;

    if (kind === 'dynamic') return openAddDynamicColumnSidebar();

    openAddStaticColumnSidebar();
  });

  const openDynamicSidebar = $((type: ColumnType) =>
    openSidebar(type, 'dynamic'),
  );

  const openStaticSidebar = $((type: ColumnType) =>
    openSidebar(type, 'static'),
  );

  return (
    <Modal.Root bind:show={isOpenAddColumnModal} class="h-max w-full">
      <Modal.Panel>
        <div class="mb-5 flex justify-between">
          <Modal.Title>New column</Modal.Title>
          <Button size="sm" look="ghost" onClick$={closeAddColumnModal}>
            <TbX />
          </Button>
        </div>
        <div class="flex justify-between gap-2">
          <div class="flex w-1/2 flex-col gap-2">
            <h4 class="text-sm text-gray-600">Static columns</h4>

            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-blue-200"
              onClick$={() => openStaticSidebar('text')}
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                <TbAlignJustified />
              </span>
              Text
            </Button>
            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-rose-100"
              onClick$={() => openStaticSidebar('number')}
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                <TbHash />
              </span>
              Number
            </Button>
            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-lime-100"
              onClick$={() => openStaticSidebar('boolean')}
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                <TbToggleLeft />
              </span>
              Boolean
            </Button>
            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-yellow-100"
              onClick$={() => openStaticSidebar('object')}
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                <TbBraces />
              </span>
              Object
            </Button>
            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-indigo-300"
              onClick$={() => openStaticSidebar('array')}
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                <TbBrackets />
              </span>
              Array
            </Button>
          </div>

          <div class="flex w-1/2 flex-col gap-2">
            <h4 class="text-xs text-gray-600">Dynamic columns</h4>

            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:border-green-200"
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-300">
                🤗
              </span>
              From HuggingFace
            </Button>

            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-blue-300"
              onClick$={() => openDynamicSidebar('text')}
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-300">
                <TbKeyboard />
              </span>
              Run Prompt
            </Button>
            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-cyan-200"
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-300">
                <TbCloud />
              </span>
              Api Call
            </Button>
            <Button
              size="md"
              look="ghost"
              class="flex justify-start text-left text-sm hover:bg-yellow-100"
            >
              <span class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-300">
                <TbBraces />
              </span>
              Extract from JSON
            </Button>
          </div>
        </div>
      </Modal.Panel>

      <AddStaticColumnSidebar
        type={columnType.value}
        onCreateColumn={onCreateColumn}
      />

      <AddDynamicColumnSidebar onCreateColumn={onCreateColumn} />
    </Modal.Root>
  );
});
