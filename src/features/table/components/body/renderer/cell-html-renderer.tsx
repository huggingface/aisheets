import { component$, useSignal } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

const Sandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      srcdoc={content}
      style={{
        zoom: 1.5,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
});

export const CellHTMLRenderer = component$<CellProps>(({ cell }) => {
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
      <div class="h-full flex flex-col justify-between">
        <p>{cell.value?.toString()}</p>
      </div>

      {isExpanded.value && (
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
            <div class="flex items-center justify-center w-full h-full overflow-hidden bg-neutral-50">
              <Sandbox content={cell.value} />
            </div>
          </div>
        </>
      )}
    </div>
  );
});
