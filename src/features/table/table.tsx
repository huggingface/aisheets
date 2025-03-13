import {
  $,
  component$,
  useContext,
  useSignal,
  useTask$,
  useVisibleTask$,
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

export const Table = component$(() => {
  const {
    generic: { close: closeModal },
  } = useModals('cell-editor');
  const modalContext = useContext(modalsContext);
  const { replaceCell } = useColumnsStore();
  const { activeDataset } = useDatasetsStore();
  const validateCell = useValidateCellUseCase();
  const editingValue = useSignal('');
  const textareaRef = useSignal<HTMLTextAreaElement>();

  useTask$(({ track }) => {
    const modalArgs = track(
      () => modalContext.value.modals['cell-editor'].args,
    );
    if (modalArgs) {
      editingValue.value = (modalArgs as any)?.value ?? '';
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => modalContext.value.active);
    textareaRef.value?.focus();
  });

  const onKeyDown$ = $(async (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const modalData = modalContext.value.modals['cell-editor'].args as {
        id: string;
        value: string;
      };
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

        <Modal name="cell-editor" title="" variant="clean">
          <Textarea
            ref={textareaRef}
            value={editingValue.value}
            onInput$={(e) =>
              (editingValue.value = (e.target as HTMLTextAreaElement).value)
            }
            onKeyDown$={onKeyDown$}
            class="w-[80vw] max-w-4xl h-[60vh] p-4 text-sm resize-none bg-white border border-neutral-300 shadow-lg rounded-sm"
            placeholder="Enter content... (Shift+Enter for new line)"
          />
        </Modal>
      </div>
    </ExecutionProvider>
  );
});
