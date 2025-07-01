import { component$, useSignal } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

export const Sandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      srcdoc={`<html>
          <head>
            <style>
              body { margin: 0; padding: 0; overflow: hidden; maxHeight: 500px; maxWidth: 800px; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>${content}</body>
        </html>`}
      style={{
        zoom: 1.5,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
});

export const PreviewSandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      srcdoc={`<html>
          <head>
            <style>
              body { margin: 0; padding: 0; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>${content}</body>
        </html>`}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        overflow: 'hidden',
      }}
    />
  );
});

export const CellHTMLRenderer = component$<CellProps>(({ cell }) => {
  const isExpanded = useSignal(false);

  const content = (cell.value || '').replace('```html', '').replace(/```/g, '');

  return (
    <div
      stoppropagation:click
      stoppropagation:dblclick
      class="w-full h-full z-10"
      onDblClick$={() => {
        isExpanded.value = true;
      }}
      onClick$={() => {
        isExpanded.value = false;
      }}
    >
      <div class="h-full flex flex-col justify-between pointer-events-none select-none">
        <PreviewSandbox content={content} />
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
              <Sandbox content={content} />
            </div>
          </div>
        </>
      )}
    </div>
  );
});
