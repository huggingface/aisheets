import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { LuPenSquare } from '@qwikest/icons/lucide';
import { Button, ToggleGroup } from '~/components';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { CellRawEditor } from '~/features/table/components/body/renderer/cell-raw-editor';
import { TableRenderer } from '~/features/table/components/body/renderer/components/cell/table-renderer';
import { PreviewRenderer } from '~/features/table/components/body/renderer/components/preview/preview-renderer';
import { unSelectText } from '~/features/table/components/body/renderer/components/utils';
import { hasBlobContent, isTextType } from '~/features/utils/columns';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

export const CellRenderer = component$<CellProps>((props) => {
  const { cell } = props;
  const validateCell = useValidateCellUseCase();

  const isExpanded = useSignal(false);
  const isEditing = useSignal(false);
  const mode = useSignal<'write' | 'preview'>('write');

  const originalValue = useSignal(cell.value);
  const newValue = useSignal(cell.value);

  useVisibleTask$(({ track }) => {
    track(() => cell.value);

    originalValue.value = cell.value;
    newValue.value = cell.value;
  });

  const onEdit = $(() => {
    isEditing.value = true;
    mode.value = 'write';
  });

  const onClose = $(() => {
    isEditing.value = false;
    isExpanded.value = false;
  });

  const onUpdateCell = $(async () => {
    if (!!newValue.value && newValue.value !== originalValue.value) {
      await validateCell(cell, newValue.value);
      cell.value = newValue.value;
    }

    onClose();
  });

  return (
    <div
      class="w-full h-full"
      onDblClick$={() => {
        if (isExpanded.value || isEditing.value) return;
        if (!(cell.id || cell.value) && !isTextType(cell.column)) return;

        unSelectText();

        isExpanded.value = true;

        if (!cell.id && !cell.value) {
          isEditing.value = true;
        }
      }}
    >
      <div class="h-full flex flex-col justify-between cursor-pointer">
        <div class="h-full flex flex-col justify-between select-none">
          <TableRenderer {...props} />
        </div>
      </div>

      {isExpanded.value && (
        <>
          <div
            class="fixed inset-0 bg-neutral-700/40 z-[100] overlay"
            onClick$={() => {
              if (isEditing.value) return;

              onClose();
            }}
          />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-full h-full max-w-full max-h-[40vh] md:max-w-[800px] md:max-h-[600px] overflow-hidden"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="flex items-center justify-center w-full h-full p-6 bg-neutral-50">
              {!isEditing.value ? (
                <div class="w-full h-full flex flex-col gap-3">
                  {!hasBlobContent(cell.column) ? (
                    <div class="w-full h-9 flex justify-end">
                      <Button
                        look="ghost"
                        onClick$={onEdit}
                        class="flex items-center gap-1 bg-transparent hover:bg-neutral-300 hover:text-secondary-foreground aria-[pressed=true]:bg-neutral-300 text-primary-600 rounded-sm p-2"
                      >
                        <LuPenSquare class="text-lg" />
                        Edit
                      </Button>
                    </div>
                  ) : null}

                  <PreviewRenderer {...props} value={cell.value} />
                </div>
              ) : (
                <div class="w-full h-full flex flex-col gap-3">
                  <div class="w-full h-9 flex">
                    <ToggleGroup.Root
                      bind:value={mode}
                      class="flex items-center p-2"
                    >
                      <ToggleGroup.Item
                        value="write"
                        look="secondary"
                        class="h-8"
                      >
                        Write
                      </ToggleGroup.Item>
                      <ToggleGroup.Item
                        value="preview"
                        look="secondary"
                        class="h-8"
                      >
                        Preview
                      </ToggleGroup.Item>
                    </ToggleGroup.Root>
                  </div>
                  {mode.value === 'write' ? (
                    <CellRawEditor {...props} value={newValue} />
                  ) : (
                    <PreviewRenderer {...props} value={newValue.value} />
                  )}
                  <div class="flex items-center justify-end gap-2">
                    <Button
                      look="secondary"
                      class="hover:bg-neutral-400 text-primary-600"
                      onClick$={onClose}
                    >
                      Cancel
                    </Button>

                    <Button
                      look="secondary"
                      class="bg-neutral-600 text-white hover:bg-neutral-700"
                      onClick$={onUpdateCell}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
