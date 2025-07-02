import { component$, useSignal } from '@builder.io/qwik';
import { ToggleGroup } from '~/components';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { CellRawEditor } from '~/features/table/components/body/renderer/cell-raw-renderer';

export const Sandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      srcdoc={`<html>
          <head>
            <style>
              body { margin: 0; padding: 0; overflow: hidden; maxHeight: 500px; maxWidth: 800px; }
              iframe { width: 100%; height: 100%; border: none; }
              svg { width: 100%; height: 100%; }
              img { max-width: 100%; height: auto; }
              pre { margin: 0; padding: 0; }
              code { font-family: monospace; }
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

export const CellHTMLRenderer = component$<CellProps>((props) => {
  const { cell } = props;
  const isExpanded = useSignal(false);
  const mode = useSignal('preview');

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
            <div class="flex flex-col items-center justify-center w-full h-full p-6 bg-neutral-50">
              <div class="absolute top-1 right-6 flex items-center justify-end w-full h-5">
                <ToggleGroup.Root bind:value={mode}>
                  <ToggleGroup.Item
                    class="h-5"
                    stoppropagation:click
                    value="preview"
                    look="outline"
                  >
                    Preview
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    stoppropagation:click
                    value="raw"
                    look="outline"
                    class="h-5"
                  >
                    Raw
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>
              {mode.value === 'raw' ? (
                <CellRawEditor isEditing={isExpanded} {...props} />
              ) : (
                <Sandbox content={content} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
