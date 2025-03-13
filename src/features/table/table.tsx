import {
  $,
  component$,
  useContext,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { useModals } from '~/components/hooks';
import { modalsContext } from '~/components/hooks/modals/context';
import { Modal } from '~/components/ui/modal/modal';
import { Textarea } from '~/components/ui/textarea/textarea';
import { ExecutionProvider } from '~/features/add-column';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';
import { TableView } from '~/features/table/table-view';
import { useColumnsStore, useDatasetsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

interface CellEditorArgs {
  id: string;
  value: string;
}

export const Table = component$(() => {
  const {
    generic: { open: openModal, close: closeModal },
  } = useModals('cell-editor');
  const modalContext = useContext(modalsContext);
  const { replaceCell } = useColumnsStore();
  const { activeDataset } = useDatasetsStore();
  const validateCell = useValidateCellUseCase();
  const editingValue = useSignal('');

  useTask$(({ track }) => {
    const modalArgs = track(
      () => modalContext.value.modals['cell-editor'].args,
    ) as CellEditorArgs;
    if (modalArgs) {
      editingValue.value = modalArgs.value ?? '';
    }
  });

  const onKeyDown$ = $(async (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;

      e.preventDefault();
      const modalData = modalContext.value.modals['cell-editor']
        .args as CellEditorArgs;
      const newValue = editingValue.value;

      if (modalData?.id && newValue) {
        const success = await validateCell({
          id: modalData.id,
          value: newValue,
          validated: true,
        });

        if (success) {
          const column = activeDataset.value.columns.find((col) =>
            col.cells.some((cell) => cell.id === modalData.id),
          );

          replaceCell({
            id: modalData.id,
            value: newValue,
            validated: true,
            updatedAt: new Date(),
            error: undefined,
            column: {
              id: column?.id ?? '',
            },
            idx: 0,
            generating: false,
          });

          activeDataset.value = { ...activeDataset.value };
        }
      }
      closeModal();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });

  return (
    <ExecutionProvider>
      <div class="flex flex-col h-full">
        <div class="flex justify-end w-full">
          <TableView />
        </div>
        <div class="sticky -top-4 z-30 bg-white">
          <table class="border-separate border-spacing-0 text-sm">
            <TableHeader />
          </table>
        </div>

        <div class="flex-grow">
          <table class="overflow-x-auto overflow-y-hidden border-separate border-spacing-0 text-sm">
            <TableBody />
          </table>
        </div>

        <Modal
          name="cell-editor"
          title=""
          class="w-[80vw] max-w-4xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div class="mt-4">
            <Textarea
              value={editingValue.value}
              onInput$={(e) =>
                (editingValue.value = (e.target as HTMLTextAreaElement).value)
              }
              onKeyDown$={$((e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onKeyDown$(e);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onKeyDown$(e);
                }
              })}
              class="w-full h-[60vh] p-4 text-sm resize-none"
              placeholder="Enter content... (Shift+Enter for new line)"
              autoFocus={true}
            />
          </div>
        </Modal>
      </div>
    </ExecutionProvider>
  );
});
