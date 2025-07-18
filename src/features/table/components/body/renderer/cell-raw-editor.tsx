import {
  type Signal,
  component$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Textarea } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

interface CellRawEditorProps extends CellProps {
  value: Signal<string>;
}

export const CellRawEditor = component$<CellRawEditorProps>(({ value }) => {
  const editCellValueInput = useSignal<HTMLElement>();

  useVisibleTask$(({ track }) => {
    track(editCellValueInput);
    if (!editCellValueInput.value) return;

    nextTick(() => {
      editCellValueInput.value!.focus();
    }, 100);
    if (editCellValueInput.value instanceof HTMLTextAreaElement) {
      editCellValueInput.value.setSelectionRange(0, 0);
      editCellValueInput.value.scrollTop = 0;
    }
  });

  return (
    <div
      class="w-full h-full scrollable overflow-hidden"
      onClick$={() => {
        if (editCellValueInput.value) {
          editCellValueInput.value.focus();
        }
      }}
    >
      <Textarea
        ref={editCellValueInput}
        bind:value={value}
        preventEnterNewline
        look="ghost"
        class="w-full h-full text-base resize-none whitespace-pre-wrap break-words overflow-auto px-1"
      />
    </div>
  );
});
