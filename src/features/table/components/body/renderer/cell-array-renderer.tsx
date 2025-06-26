import { component$, useSignal } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

export const CellArrayRenderer = component$<CellProps>(({ cell }) => {
  const isExpanded = useSignal(false);

  return (
    <div
      stoppropagation:click
      stoppropagation:dblclick
      class="w-full h-full"
      onDblClick$={() => {
        isExpanded.value = true;
      }}
      onClick$={() => {
        isExpanded.value = false;
      }}
    >
      <pre>{JSON.stringify(cell.value, null, 2)}</pre>

      {isExpanded.value && (
        <>
          <div class="fixed inset-0 bg-neutral-700/40 z-50" />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-3/4 h-3/4 max-w-[800px] max-h-[600px]"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-neutral-50">
              <div class="max-w-full max-h-full overflow-hidden">
                <div class="absolute inset-0 w-full h-full p-4 rounded-none text-sm resize-none focus-visible:outline-none focus-visible:ring-0 border-none shadow-none overflow-auto whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <pre>{JSON.stringify(cell.value, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
