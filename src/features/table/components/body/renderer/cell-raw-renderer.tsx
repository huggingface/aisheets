import {
  $,
  type Signal,
  component$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Textarea } from '~/components';
import { CellActions } from '~/features/table/components/body/cell-actions';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { unSelectText } from '~/features/table/components/body/renderer/components/utils';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

interface CellRawEditorProps extends CellProps {
  isEditing: Signal<boolean>;
}

export const CellRawEditor = component$<CellRawEditorProps>(
  ({ cell, isEditing }) => {
    const validateCell = useValidateCellUseCase();
    const originalValue = useSignal(cell.value);
    const newCellValue = useSignal(cell.value);
    const editCellValueInput = useSignal<HTMLElement>();

    const onUpdateCell = $(async () => {
      const valueToUpdate = newCellValue.value;

      if (!!newCellValue.value && newCellValue.value !== originalValue.value) {
        await validateCell(cell, newCellValue.value, true);
        originalValue.value = valueToUpdate;
      }

      isEditing.value = false;
    });

    useVisibleTask$(({ track }) => {
      track(isEditing);

      unSelectText();
    });

    useVisibleTask$(({ track }) => {
      track(editCellValueInput);
      if (!editCellValueInput.value) return;
      track(() => isEditing);

      if (isEditing) {
        editCellValueInput.value.focus();
        if (editCellValueInput.value instanceof HTMLTextAreaElement) {
          editCellValueInput.value.setSelectionRange(0, 0);
          editCellValueInput.value.scrollTop = 0;
        }
      }
    });

    useVisibleTask$(({ track }) => {
      track(isEditing);
      track(() => cell.value);

      originalValue.value = cell.value;

      if (isEditing.value) {
        newCellValue.value = originalValue.value;
      }
    });

    return (
      <div
        class="w-full h-full scrollable overflow-hidden relative"
        onClick$={(e) => {
          e.stopPropagation();
          if (editCellValueInput.value) {
            editCellValueInput.value.focus();
          }
        }}
      >
        <Textarea
          ref={editCellValueInput}
          bind:value={newCellValue}
          preventEnterNewline
          look="ghost"
          class="w-full h-full p-8 text-base resize-none whitespace-pre-wrap break-words overflow-auto"
          onKeyDown$={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) return;
              e.preventDefault();
              onUpdateCell();
            }
          }}
        />
      </div>
    );
  },
);

export const CellRawRenderer = component$<CellProps>((props) => {
  const isEditing = useSignal(false);
  const { cell } = props;

  return (
    <div
      class="w-full h-full"
      onDblClick$={(e) => {
        e.stopPropagation();

        isEditing.value = true;
      }}
      onClick$={() => {
        isEditing.value = false;
      }}
    >
      <div class="h-full flex flex-col justify-between">
        <CellActions cell={cell} />
        <p>{cell.value?.toString()}</p>
      </div>

      {isEditing.value && (
        <>
          <div class="fixed inset-0 bg-neutral-700/40 z-50" />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-full h-full max-w-full max-h-[40vh] md:max-w-[800px] md:max-h-[600px] overflow-hidden"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="flex items-center justify-center w-full h-full p-4 bg-neutral-50">
              <CellRawEditor isEditing={isEditing} {...props} />
            </div>
          </div>
        </>
      )}
    </div>
  );
});
