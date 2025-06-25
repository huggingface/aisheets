import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Textarea } from '~/components';
import { CellActions } from '~/features/table/components/body/cell-actions';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

export const CellRawRenderer = component$<CellProps>(({ cell }) => {
  const validateCell = useValidateCellUseCase();
  const modalHeight = useSignal('200px');

  const isEditing = useSignal(false);
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
    const scrollable = document.querySelector('.scrollable');

    originalValue.value = cell.value;

    if (isEditing.value) {
      newCellValue.value = originalValue.value;
    }

    if (scrollable) {
      if (isEditing.value) {
        scrollable.classList.add('overflow-hidden');
      } else {
        scrollable.classList.remove('overflow-hidden');
      }
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => newCellValue.value);

    const content = newCellValue.value;
    if (!content) {
      return;
    }

    const lines = content.split('\n');
    const lineHeight = 20;
    const padding = 64;
    const charsPerLine = 80;

    let totalLines = 0;
    for (const line of lines) {
      if (line.length === 0) {
        totalLines += 1;
      } else {
        totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
    }

    if (lines.length === 1 && content.length < 50) {
      modalHeight.value = '100px';
      return;
    }

    const calculatedHeight = Math.min(
      totalLines * lineHeight + padding,
      window.innerHeight * 0.85,
    );
    modalHeight.value = `${Math.max(100, calculatedHeight)}px`;
  });

  return (
    <div
      class="w-full h-full"
      onDblClick$={(e) => {
        e.stopPropagation();

        isEditing.value = true;
      }}
      onClick$={() => {
        if (isEditing.value) {
          onUpdateCell();
        }
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
            class="fixed z-[100] bg-white border border-neutral-500 shadow-sm"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '660px',
              height: modalHeight.value,
              borderWidth: '1px',
            }}
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
        </>
      )}
    </div>
  );
});
