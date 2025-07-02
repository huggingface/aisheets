import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { ToggleGroup } from '~/components';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { CellRawEditor } from '~/features/table/components/body/renderer/cell-raw-renderer';
import { PreviewSandbox } from '~/features/table/components/body/renderer/components/preview-sandbox';
import { Sandbox } from '~/features/table/components/body/renderer/components/sandbox';
import {
  stopScrolling,
  unSelectText,
} from '~/features/table/components/body/renderer/components/utils';

export const CellHTMLRenderer = component$<CellProps>((props) => {
  const { cell } = props;
  const isExpanded = useSignal(false);
  const mode = useSignal('preview');

  const content = (cell.value || '').replace('```html', '').replace(/```/g, '');

  useVisibleTask$(({ track, cleanup }) => {
    track(isExpanded);

    stopScrolling(cleanup);
    unSelectText();
  });

  return (
    <div
      stoppropagation:click
      stoppropagation:dblclick
      preventdefault:mousedown
      stoppropagation:mousedown
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
              <div class="absolute top-1 right-6 flex items-center justify-end w-full h-5 z-50">
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
